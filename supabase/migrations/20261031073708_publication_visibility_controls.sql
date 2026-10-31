begin;
set local lock_timeout='5s';
alter table public.experience_publications add column visibility text not null default 'private'
 check(visibility in ('public','private','unpublished')),
 add column visibility_version integer not null default 0 check(visibility_version>=0),
 add column visibility_updated_at timestamptz not null default clock_timestamp();
-- Preserve existing effective state; this is a backfill, not a QA publication.
update public.experience_publications set visibility='public' where published_at is not null;
alter table public.experience_publications add constraint public_publication_has_capability
 check(visibility<>'public' or (published_at is not null and token is not null and origin is not null));

create table public.publication_visibility_operations(
 operation_id uuid primary key, publication_id uuid not null references public.experience_publications(id) on delete cascade,
 owner_id uuid not null references auth.users(id), from_visibility text not null check(from_visibility in ('public','private','unpublished')),
 to_visibility text not null check(to_visibility in ('public','private','unpublished')), expected_version integer not null check(expected_version>=0),
 result_version integer not null check(result_version>=expected_version), input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 occurred_at timestamptz not null default clock_timestamp()
);
create index publication_visibility_operations_publication_date_idx on public.publication_visibility_operations(publication_id,occurred_at desc);
create index publication_visibility_operations_owner_idx on public.publication_visibility_operations(owner_id);
alter table public.publication_visibility_operations enable row level security;
revoke all on public.publication_visibility_operations from public,anon,authenticated,service_role;
grant select on public.publication_visibility_operations to authenticated;
create policy "Active owners read visibility operations" on public.publication_visibility_operations for select to authenticated
 using(owner_id=(select auth.uid()) and (select private.can_manage_own_documents()));

create or replace function private.publication_receipt(p public.experience_publications) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'version',p.version,'documentId',p.document_id,'name',p.snapshot->>'name',
 'requireIdentification',coalesce((p.snapshot->>'requireIdentification')::boolean,false),
 'visibility',p.visibility,'visibilityVersion',p.visibility_version,'visibilityUpdatedAt',p.visibility_updated_at,
 'createdAt',p.created_at,'publishedAt',p.published_at,
 'url',case when p.visibility<>'public' or p.token is null then null else p.origin||'/read/'||p.token end,
 'counts',jsonb_build_object('reinforcements',jsonb_array_length(p.snapshot->'items'),
 'media',(select count(*) from jsonb_array_elements(p.snapshot->'items') i cross join lateral jsonb_array_elements(i->'media') m),
 'quizzes',(select count(*) from jsonb_array_elements(p.snapshot->'items') i where i->'quiz'<>'null'::jsonb)),
 'items',coalesce((select jsonb_agg(jsonb_build_object('title',i->>'title','pageNumber',i->'pageNumber',
 'quizTitle',i->'quiz'->'content'->>'title','mediaCount',jsonb_array_length(i->'media'))) from jsonb_array_elements(p.snapshot->'items') i),'[]'::jsonb))
$$;

create or replace function private.change_verified_publication(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); secret text; p jsonb; exp bigint; a text; op uuid; project public.projects%rowtype;
 doc public.documents%rowtype; row public.experience_publications%rowtype; items jsonb; body jsonb; n integer; current_row public.experience_publications%rowtype; latest_receipt jsonb; history jsonb; target text; expected integer; previous public.publication_visibility_operations%rowtype; hsh text; old_visibility text;
begin
 if u is null or not private.can_manage_own_documents() or p_payload is null or octet_length(p_payload)>2500
   or coalesce(p_signature,'') !~ '^[a-f0-9]{64}$' then raise exception using errcode='42501',message='Invalid publication proof';end if;
 select s.secret into secret from private.reinforcement_request_secrets s where singleton;
 if secret is null or encode(extensions.hmac(p_payload,secret,'sha256'),'hex')<>p_signature then
   raise exception using errcode='42501',message='Invalid publication proof';end if;
 p:=p_payload::jsonb; exp:=(p->>'expiresAt')::bigint;a:=p->>'action';op:=(p->>'operationId')::uuid;
 if p->>'operation' is distinct from 'experience-publication' or (p->>'userId')::uuid is distinct from u
   or exp is null or exp<extract(epoch from clock_timestamp()) or exp>extract(epoch from clock_timestamp())+310
   or a is null or a not in ('status','management','prepare','publish','visibility') or op is null then raise exception using errcode='42501',message='Expired or foreign publication proof';end if;
 select * into project from public.projects where id=(p->>'projectId')::uuid and owner_id=u for update;
 if not found then raise exception using errcode='PT404',message='Project not available';end if;
 if project.document_id is distinct from (p->>'documentId')::uuid or project.status='deleting' then
   raise exception using errcode='PT409',message='Document changed';end if;
 select * into doc from public.documents where id=project.document_id and owner_id=u;
 if not found or doc.status not in ('uploaded','ready') or not private.document_is_available(doc.id) then
   raise exception using errcode='PT409',message='Document not available';end if;

 if a in ('status','management') then
   select * into row from public.experience_publications where project_id=project.id and document_id=doc.id order by version desc limit 1;
   latest_receipt:=case when row.id is null then null else private.publication_receipt(row) end;
   if a='status' then return latest_receipt;end if;
   -- Keep the last shared version visible even while a newer private draft exists.
   -- Retaining published_at after withdrawal prevents reactivating an older link.
   select * into current_row from public.experience_publications where project_id=project.id and document_id=doc.id and published_at is not null order by version desc limit 1;
   select coalesce(jsonb_agg(x.event order by x.occurred_at desc),'[]'::jsonb) into history from (
     select o.occurred_at,jsonb_build_object('operationId',o.operation_id,'publicationId',o.publication_id,'publicationVersion',e.version,
       'from',o.from_visibility,'to',o.to_visibility,'version',o.result_version,'occurredAt',o.occurred_at) event
     from public.publication_visibility_operations o join public.experience_publications e on e.id=o.publication_id
     where e.project_id=project.id and e.document_id=doc.id and o.owner_id=u and o.from_visibility<>o.to_visibility
     order by o.occurred_at desc limit 20
   ) x;
   return jsonb_build_object('latest',latest_receipt,'current',case when current_row.id is null then null else private.publication_receipt(current_row) end,'events',history);
 end if;
 select * into row from public.experience_publications where id=case when a='visibility' then (p->>'publicationId')::uuid else op end;
 if row.id is not null then
   if row.project_id<>project.id or row.owner_id<>u or row.document_id<>doc.id then
     raise exception using errcode='PT404',message='Publication not available';end if;
   if a='prepare' then
     if coalesce((row.snapshot->>'requireIdentification')::boolean,false) is distinct from coalesce((p->>'requireIdentification')::boolean,false) then raise exception using errcode='PT409',message='Preparation settings changed';end if;
     return private.publication_receipt(row);end if;
 elsif a in ('publish','visibility') then raise exception using errcode='PT404',message='Prepare this version first';
 end if;
 if a in ('publish','visibility') then
   target:=case when a='publish' then 'public' else p->>'visibility' end;
   expected:=(p->>'expectedVersion')::integer;
   if p->>'confirmed' is distinct from 'true' or target is null or target not in ('public','private','unpublished') or expected is null or expected<0 then
     raise exception using errcode='23514',message='Confirmed visibility and saved version required';end if;
   if target='public' then
     if coalesce(p->>'origin','') !~ '^https://[^/[:space:]@:]+$' or length(p->>'origin')>250 then
       raise exception using errcode='23514',message='Verified HTTPS origin required';end if;
     if exists(select 1 from public.experience_publications where project_id=project.id and version>row.version) then
       raise exception using errcode='PT409',message='A newer version was prepared';end if;
   end if;
   hsh:=encode(extensions.digest(jsonb_build_object('publication',row.id,'owner',u,'target',target,'expected',expected)::text,'sha256'),'hex');
   select * into previous from public.publication_visibility_operations where operation_id=op;
   if found then
     if previous.owner_id<>u or previous.publication_id<>row.id or previous.input_hash<>hsh then
       raise exception using errcode='PT409',message='Visibility operation reused';end if;
     if row.visibility_version<>previous.result_version or row.visibility<>previous.to_visibility then
       raise exception using errcode='PT409',message='Visibility changed after this operation';end if;
     return private.publication_receipt(row);
   end if;
   if row.visibility_version<>expected then raise exception using errcode='PT409',message='Obsolete visibility version';end if;
   old_visibility:=row.visibility;
   if target<>old_visibility then
     if target='public' then
       -- A restored publication receives a new capability; retired URLs stay retired.
       update public.experience_publications set visibility=target,visibility_version=visibility_version+1,visibility_updated_at=clock_timestamp(),
         token=encode(extensions.gen_random_bytes(24),'hex'),origin=p->>'origin',published_at=clock_timestamp() where id=row.id returning * into row;
     else
       update public.experience_publications set visibility=target,visibility_version=visibility_version+1,visibility_updated_at=clock_timestamp()
         where id=row.id returning * into row;
     end if;
   end if;
   insert into public.publication_visibility_operations(operation_id,publication_id,owner_id,from_visibility,to_visibility,expected_version,result_version,input_hash)
     values(op,row.id,u,old_visibility,target,expected,row.visibility_version,hsh);
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
 body:=jsonb_build_object('schemaVersion',1,'requireIdentification',coalesce((p->>'requireIdentification')::boolean,false),'name',project.name,'document',jsonb_build_object('id',doc.id,'storagePath',doc.storage_path,
   'name',doc.original_name,'sizeBytes',doc.size_bytes),'items',items);
 insert into public.experience_publications(id,project_id,document_id,owner_id,version,snapshot,snapshot_hash)
 values(op,project.id,doc.id,u,n,body,encode(extensions.digest(body::text,'sha256'),'hex')) returning * into row;
 return private.publication_receipt(row);
end;$$;


create or replace function private.change_verified_quiz_attempt(p_payload text,p_signature text,p_practice boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p jsonb; secret text; exp bigint; u uuid:=auth.uid(); pub public.experience_publications%rowtype;
 project public.projects%rowtype; doc public.documents%rowtype; reader uuid; quiz_id uuid; op uuid; action text; tab text;
 item jsonb; quiz jsonb; q jsonb; answers jsonb; answer integer; correct_index integer; n integer; total integer; score integer:=0;
 question_feedback jsonb:='[]'::jsonb; feedback jsonb; previous jsonb; input_hash text; recent integer;
begin
 if p_payload is null or octet_length(p_payload)>4500 or coalesce(p_signature,'') !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='42501',message='Invalid quiz attempt proof';end if;
 select s.secret into secret from private.reinforcement_request_secrets s where singleton;
 if secret is null or encode(extensions.hmac(p_payload,secret,'sha256'),'hex')<>p_signature then
  raise exception using errcode='42501',message='Invalid quiz attempt proof';end if;
 p:=p_payload::jsonb;exp:=(p->>'expiresAt')::bigint;reader:=(p->>'readerId')::uuid;quiz_id:=(p->>'quizVersionId')::uuid;action:=p->>'action';
 if p->>'operation' is distinct from 'quiz-attempt' or (p->>'privateTest')::boolean is distinct from p_practice
  or exp is null or exp<extract(epoch from clock_timestamp()) or exp>extract(epoch from clock_timestamp())+310
  or reader is null or quiz_id is null or action is null or action not in ('status','submit') then
  raise exception using errcode='42501',message='Expired or foreign quiz attempt proof';end if;
 if p_practice then
  if u is null or not private.can_manage_own_documents() or (p->>'userId')::uuid is distinct from u or reader<>u then
   raise exception using errcode='42501',message='Owner exercise permission required';end if;
 elsif current_setting('role',true)<>'service_role' then
  raise exception using errcode='42501',message='Reader attempts require the server role';
 end if;
 select * into pub from public.experience_publications where id=(p->>'publicationId')::uuid;
 if not found or pub.snapshot_hash is distinct from p->>'publicationHash' then raise exception using errcode='PT404',message='Publication not available';end if;
 select * into project from public.projects where id=pub.project_id for share;
 if not found or project.owner_id<>pub.owner_id or project.document_id<>pub.document_id or project.status='deleting'
   or p_practice and pub.owner_id<>u then raise exception using errcode='PT404',message='Publication not authorized';end if;
 -- A publisher/replacement holding the project lock may have changed visibility
 -- while this transaction waited. Re-read after acquiring that lock.
 select * into pub from public.experience_publications where id=(p->>'publicationId')::uuid;
 if not found or pub.snapshot_hash is distinct from p->>'publicationHash' then raise exception using errcode='PT404',message='Publication changed';end if;
 if not exists(select 1 from public.profiles where id=pub.owner_id and is_active and role in ('owner','admin')) then
  raise exception using errcode='PT404',message='Publication not available';end if;
 select * into doc from public.documents where id=pub.document_id and owner_id=pub.owner_id;
 if not found or doc.status not in ('uploaded','ready') or not private.document_is_available(doc.id)
  or doc.storage_path is distinct from pub.snapshot->'document'->>'storagePath'
  or doc.size_bytes is distinct from (pub.snapshot->'document'->>'sizeBytes')::bigint then
  raise exception using errcode='PT404',message='Document changed';end if;
 if pub.visibility='unpublished' then raise exception using errcode='PT404',message='Publication withdrawn';end if;
 if not p_practice then
  if pub.visibility is distinct from 'public' or pub.published_at is null or pub.token is null or pub.token is distinct from p->>'publicationToken'
   or pub.origin is distinct from p->>'origin' or exists(select 1 from public.experience_publications newer
     where newer.project_id=pub.project_id and newer.published_at is not null and newer.version>pub.version) then
   raise exception using errcode='PT404',message='Current published version required';end if;
 end if;
 if coalesce((pub.snapshot->>'requireIdentification')::boolean,false) and (p->>'identified') is distinct from 'true' then
  raise exception using errcode='42501',message='Reader identification required';end if;
 select i into item from jsonb_array_elements(pub.snapshot->'items') i where i->'quiz'->>'id'=quiz_id::text;
 if item is null or not exists(select 1 from public.reinforcement_quiz_versions v where v.id=quiz_id
    and v.source_version_id=(item->>'sourceVersionId')::uuid and v.request_id=(item->>'requestId')::uuid) then
  raise exception using errcode='PT404',message='Approved quiz not in this publication';end if;
 quiz:=item->'quiz'->'content';
 if jsonb_typeof(quiz->'questions') is distinct from 'array' or jsonb_array_length(quiz->'questions') not between 1 and 3
   or jsonb_typeof(quiz->'allowRetries') is distinct from 'boolean' then raise exception using errcode='23514',message='Invalid published quiz';end if;
 tab:=case when p_practice then 'quiz_practice_attempts' else 'quiz_reader_attempts' end;
 perform pg_advisory_xact_lock(hashtextextended('quiz-attempt:'||tab||':'||pub.id::text||':'||reader::text,0));
 execute format('select count(*)::integer from public.%I where publication_id=$1 and quiz_version_id=$2 and reader_id=$3',tab) into n using pub.id,quiz_id,reader;
 if action='status' then
  execute format('select to_jsonb(a) from public.%I a where publication_id=$1 and quiz_version_id=$2 and reader_id=$3 order by attempt_number desc limit 1',tab)
   into previous using pub.id,quiz_id,reader;
  return jsonb_build_object('latest',private.quiz_attempt_receipt(previous,p_practice),'attempts',n,'allowRetries',quiz->'allowRetries');
 end if;
 op:=(p->>'operationId')::uuid;answers:=p->'answers';total:=jsonb_array_length(quiz->'questions');
 if op is null or jsonb_typeof(answers) is distinct from 'array' or jsonb_array_length(answers)<>total then
  raise exception using errcode='23514',message='Answer every published question';end if;
 for idx in 0..total-1 loop
  q:=quiz->'questions'->idx;
  if jsonb_typeof(answers->idx) is distinct from 'number' or coalesce(answers->>idx,'') !~ '^[0-4]$'
   or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options') not between 2 and 5
   or coalesce(q->>'correctIndex','') !~ '^[0-4]$' then raise exception using errcode='23514',message='Invalid published answer';end if;
  answer:=(answers->>idx)::integer;correct_index:=(q->>'correctIndex')::integer;
  if answer>=jsonb_array_length(q->'options') or correct_index>=jsonb_array_length(q->'options') then
   raise exception using errcode='23514',message='Answer outside the published options';end if;
  if answer=correct_index then score:=score+1;end if;
  question_feedback:=question_feedback||jsonb_build_array(jsonb_build_object('correct',answer=correct_index,
    'explanation',q->>'explanation','correctOption',q->'options'->correct_index));
 end loop;
 feedback:=jsonb_build_object('score',score,'total',total,'questions',question_feedback);
 input_hash:=encode(extensions.digest(jsonb_build_object('publication',pub.id,'hash',pub.snapshot_hash,'quiz',quiz_id,'reader',reader,'answers',answers)::text,'sha256'),'hex');
 execute format('select to_jsonb(a) from public.%I a where id=$1',tab) into previous using op;
 if previous is not null then
  if previous->>'input_hash' is distinct from input_hash then raise exception using errcode='PT409',message='Attempt operation already used';end if;
  return private.quiz_attempt_receipt(previous,p_practice);
 end if;
 if n>0 and quiz->>'allowRetries'='false' then raise exception using errcode='PT409',message='This quiz does not allow retries';end if;
 execute format('select count(*)::integer from public.%I where publication_id=$1 and reader_id=$2 and created_at>clock_timestamp()-interval ''5 minutes''',tab) into recent using pub.id,reader;
 if recent>=30 then raise exception using errcode='PT429',message='Wait before another quiz attempt';end if;
 begin
  execute format('insert into public.%I(id,publication_id,quiz_version_id,owner_id,reader_id,publication_hash,attempt_number,answers,score,total,feedback,input_hash)
   values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning to_jsonb(%I.*)',tab,tab)
   into previous using op,pub.id,quiz_id,pub.owner_id,reader,pub.snapshot_hash,n+1,answers,score,total,feedback,input_hash;
 exception when unique_violation then raise exception using errcode='PT409',message='Attempt operation already used';end;
 return private.quiz_attempt_receipt(previous,p_practice);
end;$$;

commit;
