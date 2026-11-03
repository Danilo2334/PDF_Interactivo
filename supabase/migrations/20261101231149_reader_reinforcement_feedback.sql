-- HU040: immutable feedback for one reader session, published version and reinforcement.
create table public.reader_reinforcement_feedback (
 id uuid primary key,
 publication_id uuid not null references public.experience_publications(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 reinforcement_id uuid not null,
 source_version_id uuid,
 page_number integer not null check(page_number>0),
 title text not null,
 reader_id uuid not null,
 rating text not null check(rating in ('useful','unclear')),
 comment text not null default '' check(char_length(comment)<=1000 and octet_length(comment)<=4000),
 created_at timestamptz not null default clock_timestamp(),
 unique(publication_id,reinforcement_id,reader_id)
);
create index reader_feedback_document_idx on public.reader_reinforcement_feedback(document_id,created_at desc,id);
create index reader_feedback_project_idx on public.reader_reinforcement_feedback(project_id);
create index reader_feedback_owner_idx on public.reader_reinforcement_feedback(owner_id);
alter table public.reader_reinforcement_feedback enable row level security;
revoke all on public.reader_reinforcement_feedback from public,anon,authenticated,service_role;
grant select on public.reader_reinforcement_feedback to authenticated;
create policy reader_feedback_owner_read on public.reader_reinforcement_feedback for select to authenticated using (
 owner_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.is_active and p.role in ('owner','admin'))
);

create function private.change_reader_reinforcement_feedback(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='5s' as $$
declare p jsonb; k text; pub public.experience_publications%rowtype; project public.projects%rowtype;
 doc public.documents%rowtype; item jsonb; previous public.reader_reinforcement_feedback%rowtype;
 reader uuid; target uuid; op uuid; rating text; comment text;
begin
 if current_setting('role',true)<>'service_role' or p_payload is null or octet_length(p_payload)>12000 then
  raise exception using errcode='42501',message='Server feedback proof required'; end if;
 select secret into k from private.reinforcement_request_secrets where singleton;
 if k is null or p_signature is null or p_signature !~ '^[a-f0-9]{64}$'
  or p_signature<>encode(extensions.hmac(p_payload,k,'sha256'),'hex') then
  raise exception using errcode='42501',message='Invalid feedback proof'; end if;
 p:=p_payload::jsonb;
 if p->>'operation' is distinct from 'reinforcement-feedback' or p->>'expiresAt' is null
  or (p->>'expiresAt')::bigint<extract(epoch from clock_timestamp())
  or (p->>'expiresAt')::bigint>extract(epoch from clock_timestamp())+301 then
  raise exception using errcode='42501',message='Expired feedback proof'; end if;
 if p->>'action' is null or p->>'action' not in ('status','submit') then
  raise exception using errcode='23514',message='Unknown feedback action'; end if;
 reader:=(p->>'readerId')::uuid; target:=(p->>'reinforcementId')::uuid;
 if reader is null or target is null then raise exception using errcode='23514',message='Reader and reinforcement required'; end if;
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
 select value into item from jsonb_array_elements(pub.snapshot->'items') i where i->>'id'=target::text;
 if not found or item->>'pageNumber' is distinct from p->>'pageNumber' then
  raise exception using errcode='PT409',message='Wrong reinforcement or page'; end if;
 if p->>'action'='submit' then
  op:=(p->>'operationId')::uuid; rating:=p->>'rating'; comment:=coalesce(p->>'comment','');
  if op is null or rating is null or rating not in ('useful','unclear') or char_length(comment)>1000 or octet_length(comment)>4000
   or comment<>btrim(comment) or comment ~ E'[\\x01-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]' then
   raise exception using errcode='23514',message='Valid rating and plain text comment required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('reader-feedback-operation:'||op::text,0));
  select * into previous from public.reader_reinforcement_feedback where id=op;
  if found and (previous.publication_id<>pub.id or previous.reinforcement_id<>target or previous.reader_id<>reader
    or previous.rating<>rating or previous.comment<>comment) then
   raise exception using errcode='PT409',message='Feedback operation reused'; end if;
  perform pg_advisory_xact_lock(hashtextextended('reader-feedback-session:'||pub.id::text||':'||target::text||':'||reader::text,0));
 end if;
 select * into previous from public.reader_reinforcement_feedback
  where publication_id=pub.id and reinforcement_id=target and reader_id=reader;
 if p->>'action'='submit' then
  if found then
   if previous.rating<>rating or previous.comment<>comment then
    raise exception using errcode='PT409',message='Feedback already stored'; end if;
  else
   insert into public.reader_reinforcement_feedback(id,publication_id,project_id,document_id,owner_id,reinforcement_id,source_version_id,page_number,title,reader_id,rating,comment)
   values(op,pub.id,pub.project_id,pub.document_id,pub.owner_id,target,(item->>'sourceVersionId')::uuid,(item->>'pageNumber')::integer,item->>'title',reader,rating,comment)
   returning * into previous;
  end if;
 end if;
 return case when previous.id is null then null else jsonb_build_object('id',previous.id,'pageNumber',previous.page_number,
   'rating',previous.rating,'comment',previous.comment,'createdAt',previous.created_at) end;
end;$$;
revoke all on function private.change_reader_reinforcement_feedback(text,text) from public,anon,authenticated;
grant execute on function private.change_reader_reinforcement_feedback(text,text) to service_role;
create function public.change_reader_reinforcement_feedback(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.change_reader_reinforcement_feedback(p_payload,p_signature)$$;
revoke all on function public.change_reader_reinforcement_feedback(text,text) from public,anon,authenticated;
grant execute on function public.change_reader_reinforcement_feedback(text,text) to service_role;
