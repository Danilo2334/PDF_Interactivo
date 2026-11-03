begin;
set local lock_timeout='5s';
create table public.reinforcement_media (
 id uuid primary key,
 reinforcement_id uuid not null references public.reinforcements(id) on delete cascade,
 request_id uuid not null references public.reinforcement_requests(id) on delete cascade,
 project_id uuid not null references public.projects(id) on delete cascade,
 document_id uuid not null references public.documents(id) on delete cascade,
 owner_id uuid not null references auth.users(id),
 approved_version_id uuid not null references public.reinforcement_review_versions(id) on delete cascade,
 kind text not null check(kind in ('image','video','link')),
 title text not null check(char_length(btrim(title)) between 3 and 160),
 file_name text, mime_type text, size_bytes integer not null,
 storage_path text unique, url text,
 input_hash text not null check(input_hash ~ '^[a-f0-9]{64}$'),
 file_hash text check(file_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'uploading' check(status in ('uploading','approved','removed')),
 created_at timestamptz not null default clock_timestamp(), approved_at timestamptz, removed_at timestamptz,
 check((kind='link' and size_bytes=0 and storage_path is null and file_name is null and mime_type is null and file_hash is null and url is not null)
  or(kind in ('image','video') and size_bytes>0 and storage_path is not null and file_name is not null and mime_type is not null and file_hash is not null and url is null)),
 check((status='uploading' and approved_at is null and removed_at is null) or(status='approved' and approved_at is not null and removed_at is null) or(status='removed' and removed_at is not null))
);
create index reinforcement_media_reinforcement_idx on public.reinforcement_media(reinforcement_id,created_at);
create index reinforcement_media_request_idx on public.reinforcement_media(request_id);
create index reinforcement_media_project_idx on public.reinforcement_media(project_id);
create index reinforcement_media_document_idx on public.reinforcement_media(document_id);
create index reinforcement_media_owner_idx on public.reinforcement_media(owner_id);
create index reinforcement_media_approved_version_idx on public.reinforcement_media(approved_version_id);
alter table public.reinforcement_media enable row level security;
revoke all on public.reinforcement_media from public,anon,authenticated;
grant select on public.reinforcement_media to authenticated;
create policy "Owners read their media metadata" on public.reinforcement_media for select to authenticated
 using(owner_id=(select auth.uid()) and (select private.can_manage_own_documents()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('reinforcement-media','reinforcement-media',false,20971520,array['image/png','image/jpeg','video/mp4']);
create policy "Owners upload staged reinforcement media" on storage.objects for insert to authenticated with check(
 bucket_id='reinforcement-media' and exists(select 1 from public.reinforcement_media m where m.storage_path=name
 and m.owner_id=(select auth.uid()) and m.status='uploading' and private.document_is_available(m.document_id)));
create policy "Owners read available reinforcement media" on storage.objects for select to authenticated using(
 bucket_id='reinforcement-media' and exists(select 1 from public.reinforcement_media m where m.storage_path=name
 and m.owner_id=(select auth.uid()) and m.status in ('uploading','approved') and private.document_is_available(m.document_id)));
create policy "Owners clean reinforcement media" on storage.objects for delete to authenticated using(
 bucket_id='reinforcement-media' and split_part(name,'/',1)=(select auth.uid())::text and (select private.can_manage_own_documents()));

create function private.change_verified_media(p_payload text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); secret text; p jsonb; exp bigint; r public.reinforcement_requests%rowtype;
 f public.reinforcements%rowtype; m public.reinforcement_media%rowtype; asset uuid; action text; kind text; path text; mime text; size integer;
begin
 if u is null or not private.can_manage_own_documents() or p_payload is null or octet_length(p_payload)>10000
   or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then raise exception using errcode='42501',message='Invalid media proof'; end if;
 select s.secret into secret from private.reinforcement_request_secrets s where singleton;
 if secret is null or encode(extensions.hmac(p_payload,secret,'sha256'),'hex')<>p_signature then raise exception using errcode='42501',message='Invalid media proof'; end if;
 p:=p_payload::jsonb;exp:=(p->>'expiresAt')::bigint;asset:=(p->>'assetId')::uuid;action:=p->>'action';
 if p->>'operation' is distinct from 'reinforcement-media' or (p->>'userId')::uuid is distinct from u or exp is null
   or exp<extract(epoch from clock_timestamp()) or exp>extract(epoch from clock_timestamp())+310 or asset is null
   or action is null or action not in ('prepare','approve','remove') then raise exception using errcode='42501',message='Expired or foreign media proof'; end if;
 -- Serialize per account for the private-storage quota as well as per request.
 perform pg_advisory_xact_lock(hashtextextended('reinforcement-media:'||u::text,0));
 r:=private.lock_current_recommendation_request((p->>'requestId')::uuid,(p->>'documentId')::uuid);
 select * into f from public.reinforcements where id=(p->>'reinforcementId')::uuid and source_request_id=r.id
   and document_id=r.document_id and page_number=r.page_number for update;
 if not found then raise exception using errcode='42501',message='Published reinforcement unavailable'; end if;
 select * into m from public.reinforcement_media where id=asset for update;
 if action='remove' then
  if m.id is null or m.reinforcement_id<>f.id or m.owner_id<>u then raise exception using errcode='42501',message='Resource unavailable'; end if;
  if m.status<>'removed' then update public.reinforcement_media set status='removed',removed_at=clock_timestamp() where id=asset returning * into m; end if;
  return to_jsonb(m);
 end if;
 if f.approved_version_id is null or f.approved_version_id is distinct from (p->>'approvedVersionId')::uuid
   or not exists(select 1 from public.reinforcement_review_heads where request_id=r.id and approved_version_id=f.approved_version_id) then
  raise exception using errcode='PT409',message='Approved content changed'; end if;
 if m.id is not null then
  if m.owner_id<>u or m.reinforcement_id<>f.id or m.input_hash is distinct from p->>'inputHash' or m.status='removed' then
   raise exception using errcode='PT409',message='Resource operation changed or removed'; end if;
 elsif action='prepare' then
  kind:=p->>'kind';mime:=p->>'mime';size:=(p->>'size')::integer;path:=p->>'storagePath';
  if kind is null or kind not in ('image','video','link') or char_length(btrim(coalesce(p->>'title',''))) not between 3 and 160
    or coalesce(p->>'inputHash','') !~ '^[a-f0-9]{64}$' then raise exception using errcode='23514',message='Invalid media metadata'; end if;
  if kind='link' then
   if size is distinct from 0 or path is not null or mime is not null or p->>'fileName' is not null or p->>'fileHash' is not null
     or coalesce(p->>'url','') !~ '^https://(es\.wikipedia\.org/wiki/[^?#[:space:]]+|en\.wikipedia\.org/wiki/[^?#[:space:]]+|(www|es)\.khanacademy\.org/[^?#[:space:]]*|www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11})$'
     or char_length(p->>'url')>2000 then raise exception using errcode='23514',message='Link not permitted'; end if;
  else
   if size is null or size<1 or size>(case when kind='image' then 5242880 else 20971520 end)
     or mime is null or (kind='image' and mime not in ('image/png','image/jpeg')) or (kind='video' and mime<>'video/mp4')
     or path is distinct from u::text||'/'||asset::text||(case mime when 'image/png' then '.png' when 'image/jpeg' then '.jpg' else '.mp4' end)
     or char_length(coalesce(p->>'fileName','')) not between 1 and 120 or (p->>'fileName') ~ '[/\\[:cntrl:]]'
     or coalesce(p->>'fileHash','') !~ '^[a-f0-9]{64}$' or p->>'url' is not null then raise exception using errcode='23514',message='File not permitted'; end if;
  end if;
  if (select count(*) from public.reinforcement_media where reinforcement_id=f.id and(status='approved' or status='uploading' and created_at>clock_timestamp()-interval '1 hour'))>=10
    or (select coalesce(sum(size_bytes),0) from public.reinforcement_media where owner_id=u)+size>104857600 then
   raise exception using errcode='P0001',message='Media storage quota reached'; end if;
  insert into public.reinforcement_media(id,reinforcement_id,request_id,project_id,document_id,owner_id,approved_version_id,
   kind,title,file_name,mime_type,size_bytes,storage_path,url,input_hash,file_hash)
  values(asset,f.id,r.id,r.project_id,r.document_id,u,f.approved_version_id,kind,btrim(p->>'title'),p->>'fileName',mime,size,path,p->>'url',p->>'inputHash',p->>'fileHash') returning * into m;
 else raise exception using errcode='PT409',message='Prepare resource first';
 end if;
 if action='approve' and m.status='uploading' then
  if m.kind<>'link' and not exists(select 1 from storage.objects where bucket_id='reinforcement-media' and name=m.storage_path) then
   raise exception using errcode='PT409',message='Upload resource first'; end if;
  update public.reinforcement_media set status='approved',approved_at=clock_timestamp() where id=asset returning * into m;
 end if;
 return to_jsonb(m);
end; $$;
revoke all on function private.change_verified_media(text,text) from public,anon;
grant execute on function private.change_verified_media(text,text) to authenticated;
create function public.change_reinforcement_media(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$select private.change_verified_media(p_payload,p_signature);$$;
revoke all on function public.change_reinforcement_media(text,text) from public,anon;
grant execute on function public.change_reinforcement_media(text,text) to authenticated;
commit;
