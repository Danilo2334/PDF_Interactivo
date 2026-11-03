-- HU038: explicit reader interactions, linked to an accepted HU037 visit.
create table public.reader_reinforcement_opens (
 operation_id uuid not null,
 reinforcement_id uuid not null,
 visit_id uuid not null references public.reader_open_visits(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 publication_id uuid references public.experience_publications(id) on delete set null,
 page_number integer not null check(page_number>0),
 title text not null,
 occurred_at timestamptz not null default clock_timestamp(),
 primary key(operation_id,reinforcement_id)
);
create index reader_reinforcement_opens_totals_idx on public.reader_reinforcement_opens(project_id,document_id,reinforcement_id,visit_id);
create index reader_reinforcement_opens_visit_idx on public.reader_reinforcement_opens(visit_id);
create index reader_reinforcement_opens_publication_idx on public.reader_reinforcement_opens(publication_id);
create index reader_reinforcement_opens_owner_idx on public.reader_reinforcement_opens(owner_id);
alter table public.reader_reinforcement_opens enable row level security;
revoke all on public.reader_reinforcement_opens from public,anon,authenticated,service_role;
grant select on public.reader_reinforcement_opens to authenticated;
create policy reader_reinforcement_opens_authorized_read on public.reader_reinforcement_opens for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active
  and (p.role='admin' or p.role='owner' and p.id=owner_id))
);

create function public.get_reinforcement_open_totals(p_project_id uuid,p_document_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 with visits as materialized (select id from public.reader_open_visits where project_id=p_project_id and document_id=p_document_id and occurred_at<=statement_timestamp()),
 counts as (select o.reinforcement_id,count(*) frequency,count(distinct o.visit_id) visits,
   (array_agg(o.page_number order by o.occurred_at desc))[1] page_number,
   (array_agg(o.title order by o.occurred_at desc))[1] title
  from public.reader_reinforcement_opens o join visits v on v.id=o.visit_id
  where o.project_id=p_project_id and o.document_id=p_document_id and o.occurred_at<=statement_timestamp() group by o.reinforcement_id)
 select jsonb_build_object('totalVisits',(select count(*) from visits),'through',statement_timestamp(),
  'rows',coalesce((select jsonb_agg(jsonb_build_object('id',reinforcement_id,'pageNumber',page_number,'title',title,'frequency',frequency,'visits',visits,
    'percentage',case when (select count(*) from visits)=0 then 0 else round(100.0*visits/(select count(*) from visits),2) end)) from counts),'[]'::jsonb));
$$;
revoke all on function public.get_reinforcement_open_totals(uuid,uuid) from public,anon,service_role;
grant execute on function public.get_reinforcement_open_totals(uuid,uuid) to authenticated;

create function private.record_reinforcement_open(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
declare p jsonb; k text; pub public.experience_publications%rowtype;
 project public.projects%rowtype; doc public.documents%rowtype; visit public.reader_open_visits%rowtype;
 op uuid; item jsonb; source jsonb; previous_count integer; occurred timestamptz;
begin
 if current_setting('role',true)<>'service_role' or p_payload is null or octet_length(p_payload)>50000 then
  raise exception using errcode='42501',message='Server consultation proof required'; end if;
 select secret into k from private.reinforcement_request_secrets where singleton;
 if k is null or p_signature is null or p_signature !~ '^[a-f0-9]{64}$'
  or p_signature<>encode(extensions.hmac(p_payload,k,'sha256'),'hex') then
  raise exception using errcode='42501',message='Invalid consultation proof'; end if;
 p:=p_payload::jsonb;
 if p->>'operation' is distinct from 'reinforcement-open' or p->>'expiresAt' is null
  or (p->>'expiresAt')::bigint<extract(epoch from clock_timestamp())
  or (p->>'expiresAt')::bigint>extract(epoch from clock_timestamp())+301 then
  raise exception using errcode='42501',message='Expired consultation proof'; end if;
 op:=(p->>'operationId')::uuid;
 if op is null or jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') not between 1 and 500
  or (select count(distinct i->>'id') from jsonb_array_elements(p->'items') i)<>jsonb_array_length(p->'items') then
  raise exception using errcode='23514',message='Invalid consultation reference'; end if;
 select * into pub from public.experience_publications where id=(p->>'publicationId')::uuid;
 if not found then raise exception using errcode='PT404',message='Publication unavailable'; end if;
 select * into project from public.projects where id=pub.project_id for share;
 if not found or project.owner_id<>pub.owner_id or project.document_id<>pub.document_id or project.status='deleting' then
  raise exception using errcode='PT404',message='Project unavailable'; end if;
 select * into pub from public.experience_publications where id=(p->>'publicationId')::uuid;
 if pub.visibility<>'public' or pub.published_at is null or pub.token is distinct from p->>'publicationToken'
  or pub.snapshot_hash is distinct from p->>'publicationHash' or pub.visibility_version is distinct from (p->>'accessVersion')::integer
  or pub.origin is distinct from p->>'origin' or exists(select 1 from public.experience_publications newer
    where newer.project_id=pub.project_id and newer.published_at is not null and newer.version>pub.version)
  or not exists(select 1 from public.profiles where id=pub.owner_id and is_active and role in ('owner','admin')) then
  raise exception using errcode='PT404',message='Current public publication required'; end if;
 select * into doc from public.documents where id=pub.document_id and owner_id=pub.owner_id;
 if not found or doc.status not in ('uploaded','ready') or not private.document_is_available(doc.id)
  or doc.storage_path is distinct from pub.snapshot->'document'->>'storagePath'
  or doc.size_bytes is distinct from (pub.snapshot->'document'->>'sizeBytes')::bigint then
  raise exception using errcode='PT404',message='Document unavailable'; end if;
 if coalesce((pub.snapshot->>'requireIdentification')::boolean,false) and (p->>'identified') is distinct from 'true' then
  raise exception using errcode='42501',message='Reader identification required'; end if;
 select * into visit from public.reader_open_visits where id=(p->>'visitId')::uuid;
 if not found or visit.document_id<>pub.document_id or visit.project_id<>pub.project_id or visit.owner_id<>pub.owner_id
  or visit.visitor_hash is distinct from p->>'visitorHash' or visit.origin<>pub.origin then
  raise exception using errcode='42501',message='Valid reader visit required'; end if;
 for item in select value from jsonb_array_elements(p->'items') loop
  select value into source from jsonb_array_elements(pub.snapshot->'items') i where i->>'id'=item->>'id';
  if not found or source->>'pageNumber' is distinct from item->>'pageNumber' then
   raise exception using errcode='PT409',message='Reinforcement does not belong to this page and publication'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('reinforcement-open:'||op::text,0));
 select count(*) into previous_count from public.reader_reinforcement_opens where operation_id=op;
 if previous_count>0 then
  if previous_count<>jsonb_array_length(p->'items') or exists(select 1 from public.reader_reinforcement_opens o
   where o.operation_id=op and (o.visit_id<>visit.id or o.publication_id is distinct from pub.id or not exists(
    select 1 from jsonb_array_elements(p->'items') i where i->>'id'=o.reinforcement_id::text and (i->>'pageNumber')::integer=o.page_number))) then
   raise exception using errcode='PT409',message='Consultation operation reused'; end if;
  return jsonb_build_object('recorded',false,'count',previous_count);
 end if;
 occurred:=clock_timestamp();
 insert into public.reader_reinforcement_opens(operation_id,reinforcement_id,visit_id,project_id,document_id,owner_id,publication_id,page_number,title,occurred_at)
 select op,(i->>'id')::uuid,visit.id,pub.project_id,pub.document_id,pub.owner_id,pub.id,(i->>'pageNumber')::integer,i->>'title',occurred
 from jsonb_array_elements(pub.snapshot->'items') i where exists(select 1 from jsonb_array_elements(p->'items') target where target->>'id'=i->>'id');
 return jsonb_build_object('recorded',true,'count',jsonb_array_length(p->'items'));
end;$$;
revoke all on function private.record_reinforcement_open(text,text) from public,anon,authenticated;
grant execute on function private.record_reinforcement_open(text,text) to service_role;
create function public.record_reinforcement_open(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.record_reinforcement_open(p_payload,p_signature)$$;
revoke all on function public.record_reinforcement_open(text,text) from public,anon,authenticated;
grant execute on function public.record_reinforcement_open(text,text) to service_role;
