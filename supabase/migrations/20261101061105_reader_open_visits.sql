-- HU037: only accepted opens; no IP, user agent, identity or raw session.
create table public.reader_open_visits (
 id uuid primary key,
 project_id uuid not null references public.projects(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 publication_id uuid references public.experience_publications(id) on delete set null,
 occurred_at timestamptz not null default clock_timestamp(),
 visitor_hash text not null check(visitor_hash ~ '^[a-f0-9]{64}$'),
 source text not null default 'published_reader' check(source='published_reader'),
 origin text not null check(origin ~ '^https://[^/]+$')
);
create index reader_open_visits_dedup_idx on public.reader_open_visits(document_id,visitor_hash,occurred_at desc);
create index reader_open_visits_total_idx on public.reader_open_visits(project_id,document_id,occurred_at desc);
alter table public.reader_open_visits enable row level security;
revoke all on public.reader_open_visits from public,anon,authenticated,service_role;
grant select on public.reader_open_visits to authenticated;
create policy reader_open_visits_authorized_read on public.reader_open_visits for select to authenticated using (
 exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active
  and (p.role='admin' or p.role='owner' and p.id=owner_id))
);
create function public.get_document_visit_totals(p_project_id uuid,p_document_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('total',count(*),'lastVisitedAt',max(occurred_at),'windowMinutes',30)
 from public.reader_open_visits where project_id=p_project_id and document_id=p_document_id;
$$;
revoke all on function public.get_document_visit_totals(uuid,uuid) from public,anon,service_role;
grant execute on function public.get_document_visit_totals(uuid,uuid) to authenticated;

-- Private definer needed for anonymous, signed server writes, without direct INSERT grants.
create function private.record_reader_open(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
declare p jsonb; k text; pub public.experience_publications%rowtype;
 project public.projects%rowtype; doc public.documents%rowtype;
 previous public.reader_open_visits%rowtype; op uuid; visitor text; occurred timestamptz;
begin
 if current_setting('role',true)<>'service_role' or p_payload is null or octet_length(p_payload)>2400 then
  raise exception using errcode='42501',message='Server visit proof required'; end if;
 select secret into k from private.reinforcement_request_secrets where singleton;
 if k is null or p_signature is null or p_signature !~ '^[a-f0-9]{64}$'
  or p_signature<>encode(extensions.hmac(p_payload,k,'sha256'),'hex') then
  raise exception using errcode='42501',message='Invalid visit proof'; end if;
 p:=p_payload::jsonb;
 if p->>'operation' is distinct from 'reader-open' or p->>'expiresAt' is null
  or (p->>'expiresAt')::bigint<extract(epoch from clock_timestamp())
  or (p->>'expiresAt')::bigint>extract(epoch from clock_timestamp())+301 then
  raise exception using errcode='42501',message='Expired visit proof'; end if;
 op:=(p->>'operationId')::uuid; visitor:=p->>'visitorHash';
 if op is null or visitor is null or visitor !~ '^[a-f0-9]{64}$' then
  raise exception using errcode='23514',message='Invalid visit reference'; end if;
 select * into pub from public.experience_publications where id=(p->>'publicationId')::uuid;
 if not found then raise exception using errcode='PT404',message='Publication unavailable'; end if;
 -- Shared lock conflicts with publication/replacement updates, not other readers.
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
 perform pg_advisory_xact_lock(hashtextextended('reader-open:'||pub.document_id::text||':'||visitor,0));
 select * into previous from public.reader_open_visits where id=op;
 if found then
  if previous.document_id<>pub.document_id then raise exception using errcode='PT409',message='Visit operation reused'; end if;
  return jsonb_build_object('recorded',false,'visitId',previous.id,'occurredAt',previous.occurred_at);
 end if;
 occurred:=clock_timestamp();
 select * into previous from public.reader_open_visits where document_id=pub.document_id and visitor_hash=visitor
  and occurred_at>occurred-interval '30 minutes' order by occurred_at desc limit 1;
 if found then return jsonb_build_object('recorded',false,'visitId',previous.id,'occurredAt',previous.occurred_at); end if;
 insert into public.reader_open_visits(id,project_id,document_id,owner_id,publication_id,visitor_hash,origin,occurred_at)
 values(op,pub.project_id,pub.document_id,pub.owner_id,pub.id,visitor,pub.origin,occurred) on conflict(id) do nothing;
 if not found then
  select * into previous from public.reader_open_visits where id=op;
  if previous.document_id<>pub.document_id then raise exception using errcode='PT409',message='Visit operation reused'; end if;
  return jsonb_build_object('recorded',false,'visitId',previous.id,'occurredAt',previous.occurred_at);
 end if;
 return jsonb_build_object('recorded',true,'visitId',op,'occurredAt',occurred);
end;$$;
revoke all on function private.record_reader_open(text,text) from public,anon,authenticated;
grant execute on function private.record_reader_open(text,text) to service_role;
create function public.record_reader_open(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.record_reader_open(p_payload,p_signature)$$;
revoke all on function public.record_reader_open(text,text) from public,anon,authenticated;
grant execute on function public.record_reader_open(text,text) to service_role;
