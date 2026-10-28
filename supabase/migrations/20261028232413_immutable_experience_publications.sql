begin;
set local lock_timeout='5s';
-- Snapshots contain private quiz keys and storage paths. They are never an anon API.
create table public.experience_publications (
 id uuid primary key, project_id uuid not null references public.projects(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 version integer not null check(version between 1 and 100), snapshot jsonb not null,
 snapshot_hash text not null check(snapshot_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default clock_timestamp(),
 token text unique check(token ~ '^[a-f0-9]{48}$'), origin text, published_at timestamptz,
 unique(project_id,version),
 check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=2097152),
 check((token is null and origin is null and published_at is null) or
   (token is not null and origin ~ '^https://[^/[:space:]@:]+$' and published_at is not null))
);
create index experience_publications_owner_idx on public.experience_publications(owner_id);
create index experience_publications_document_idx on public.experience_publications(document_id);
alter table public.experience_publications enable row level security;
revoke all on public.experience_publications from public,anon,authenticated;
grant select on public.experience_publications to authenticated;
create policy "Owners read their private publication versions" on public.experience_publications for select to authenticated
 using(owner_id=(select auth.uid()) and (select private.can_manage_own_documents()));

create function private.publication_receipt(p public.experience_publications) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'version',p.version,'documentId',p.document_id,'name',p.snapshot->>'name',
 'createdAt',p.created_at,'publishedAt',p.published_at,'url',case when p.token is null then null else p.origin||'/read/'||p.token end,
 'counts',jsonb_build_object('reinforcements',jsonb_array_length(p.snapshot->'items'),
 'media',(select count(*) from jsonb_array_elements(p.snapshot->'items') i cross join lateral jsonb_array_elements(i->'media') m),
 'quizzes',(select count(*) from jsonb_array_elements(p.snapshot->'items') i where i->'quiz'<>'null'::jsonb)),
 'items',coalesce((select jsonb_agg(jsonb_build_object('title',i->>'title','pageNumber',i->'pageNumber',
   'quizTitle',i->'quiz'->'content'->>'title','mediaCount',jsonb_array_length(i->'media')))
   from jsonb_array_elements(p.snapshot->'items') i),'[]'::jsonb))
$$;
revoke all on function private.publication_receipt(public.experience_publications) from public,anon;
grant execute on function private.publication_receipt(public.experience_publications) to authenticated;

create function private.change_verified_publication(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); secret text; p jsonb; exp bigint; a text; op uuid; project public.projects%rowtype;
 doc public.documents%rowtype; row public.experience_publications%rowtype; items jsonb; body jsonb; n integer;
begin
 if u is null or not private.can_manage_own_documents() or p_payload is null or octet_length(p_payload)>2500
   or coalesce(p_signature,'') !~ '^[a-f0-9]{64}$' then raise exception using errcode='42501',message='Invalid publication proof';end if;
 select s.secret into secret from private.reinforcement_request_secrets s where singleton;
 if secret is null or encode(extensions.hmac(p_payload,secret,'sha256'),'hex')<>p_signature then
   raise exception using errcode='42501',message='Invalid publication proof';end if;
 p:=p_payload::jsonb; exp:=(p->>'expiresAt')::bigint;a:=p->>'action';op:=(p->>'operationId')::uuid;
 if p->>'operation' is distinct from 'experience-publication' or (p->>'userId')::uuid is distinct from u
   or exp is null or exp<extract(epoch from clock_timestamp()) or exp>extract(epoch from clock_timestamp())+310
   or a is null or a not in ('status','prepare','publish') or op is null then raise exception using errcode='42501',message='Expired or foreign publication proof';end if;
 select * into project from public.projects where id=(p->>'projectId')::uuid and owner_id=u for update;
 if not found then raise exception using errcode='PT404',message='Project not available';end if;
 if project.document_id is distinct from (p->>'documentId')::uuid or project.status='deleting' then
   raise exception using errcode='PT409',message='Document changed';end if;
 select * into doc from public.documents where id=project.document_id and owner_id=u;
 if not found or doc.status not in ('uploaded','ready') or not private.document_is_available(doc.id) then
   raise exception using errcode='PT409',message='Document not available';end if;
 if a='status' then
   select * into row from public.experience_publications where project_id=project.id and document_id=doc.id order by version desc limit 1;
   return case when row.id is null then null else private.publication_receipt(row) end;
 end if;
 select * into row from public.experience_publications where id=op;
 if row.id is not null then
   if row.project_id<>project.id or row.owner_id<>u or row.document_id<>doc.id then
     raise exception using errcode='PT409',message='Publication operation already used';end if;
   if a='prepare' then return private.publication_receipt(row);end if;
 elsif a='publish' then raise exception using errcode='PT409',message='Prepare this version first';
 end if;
 if a='publish' then
   -- The server checks an explicitly configured deployment origin before signing.
   if p->>'confirmed' is distinct from 'true' or coalesce(p->>'origin','') !~ '^https://[^/[:space:]@:]+$'
      or length(p->>'origin')>250 then raise exception using errcode='23514',message='Confirmed HTTPS publication required';end if;
   if row.published_at is not null then return private.publication_receipt(row);end if;
   if exists(select 1 from public.experience_publications where project_id=project.id and version>row.version) then
     raise exception using errcode='PT409',message='A newer version was prepared';end if;
   update public.experience_publications set token=encode(extensions.gen_random_bytes(24),'hex'),origin=p->>'origin',published_at=clock_timestamp()
     where id=row.id returning * into row;
   return private.publication_receipt(row);
 end if;
 select coalesce(max(version),0)+1 into n from public.experience_publications where project_id=project.id;
 if n>100 then raise exception using errcode='PT409',message='Publication version limit reached';end if;
 -- One statement, one MVCC snapshot: no draft/current mutable head is copied.
 select coalesce(jsonb_agg(x.item order by x.page_number,x.id),'[]'::jsonb) into items from (
   select r.id,r.page_number,jsonb_build_object('id',r.id,'pageNumber',r.page_number,'title',r.title,'content',r.content,
     'sourceVersionId',r.approved_version_id,'requestId',r.source_request_id,'selection',req.selection,
     'initialExpanded',coalesce(card.initial_expanded,false),
     'media',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at,m.id) from public.reinforcement_media m
       where m.reinforcement_id=r.id and m.approved_version_id=r.approved_version_id and m.status='approved'),'[]'::jsonb),
     'quiz',(select jsonb_build_object('id',q.id,'version',q.version,'content',q.content) from public.reinforcement_quiz_heads h
       join public.reinforcement_quiz_versions q on q.id=h.approved_version_id and q.request_id=h.request_id
       where h.request_id=req.id and h.choice='generate' and h.target_source_version_id=r.approved_version_id
         and q.source_version_id=r.approved_version_id and q.source->>'documentId'=doc.id::text)) item
   from public.reinforcements r
   join public.reinforcement_requests req on req.id=r.source_request_id and req.project_id=project.id and req.document_id=doc.id and req.owner_id=u
   join public.reinforcement_review_heads rh on rh.request_id=req.id and rh.approved_version_id=r.approved_version_id
   join public.reinforcement_review_versions rv on rv.id=r.approved_version_id and rv.request_id=req.id
   left join public.reinforcement_cards card on card.reinforcement_id=r.id and card.approved_version_id=r.approved_version_id
   where r.document_id=doc.id
 ) x;
 if jsonb_array_length(items)>500 then raise exception using errcode='PT409',message='Publication content limit reached';end if;
 body:=jsonb_build_object('schemaVersion',1,'name',project.name,'document',jsonb_build_object('id',doc.id,'storagePath',doc.storage_path,
   'name',doc.original_name,'sizeBytes',doc.size_bytes),'items',items);
 insert into public.experience_publications(id,project_id,document_id,owner_id,version,snapshot,snapshot_hash)
 values(op,project.id,doc.id,u,n,body,encode(extensions.digest(body::text,'sha256'),'hex')) returning * into row;
 return private.publication_receipt(row);
end;$$;
revoke all on function private.change_verified_publication(text,text) from public,anon;
grant execute on function private.change_verified_publication(text,text) to authenticated;
create function public.change_experience_publication(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.change_verified_publication(p_payload,p_signature);$$;
revoke all on function public.change_experience_publication(text,text) from public,anon;
grant execute on function public.change_experience_publication(text,text) to authenticated;
commit;
