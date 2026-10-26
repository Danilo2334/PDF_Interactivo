begin;
set local lock_timeout = '5s';

-- Only the backend can certify the real PDF page count. The signing key is
-- private and scoped to this operation, never a browser or service-role key.
create table private.reinforcement_request_secrets (
  singleton boolean primary key default true check (singleton),
  secret text not null check (secret ~ '^[a-f0-9]{64}$')
);
alter table private.reinforcement_request_secrets enable row level security;
revoke all on private.reinforcement_request_secrets from public, anon, authenticated;
insert into private.reinforcement_request_secrets(secret)
values (encode(extensions.gen_random_bytes(32), 'hex'));

create table public.reinforcement_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  verified_page_count integer not null check (verified_page_count >= page_number),
  selection jsonb,
  selected_text text not null check (char_length(btrim(selected_text)) between 1 and 20000),
  text_source text not null check (text_source in ('digital', 'manual')),
  category text not null check (category in ('concept', 'vocabulary', 'procedure', 'connection', 'other')),
  need text not null check (char_length(btrim(need)) between 20 and 2000),
  status text not null default 'pending' check (status = 'pending'),
  idempotency_key uuid not null,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  check (selection is null or (jsonb_typeof(selection) = 'object'
    and selection->>'documentId' = document_id::text
    and (selection->>'pageNumber')::integer = page_number))
);
create index reinforcement_requests_project_idx on public.reinforcement_requests(project_id, created_at);
create index reinforcement_requests_document_idx on public.reinforcement_requests(document_id);
alter table public.reinforcement_requests enable row level security;
revoke all on public.reinforcement_requests from public, anon, authenticated;
grant select on public.reinforcement_requests to authenticated;
create policy "Owners read private reinforcement requests" on public.reinforcement_requests
for select to authenticated using (
  owner_id = (select auth.uid()) and (select private.can_manage_own_documents())
  and private.document_is_available(document_id)
);

create function private.create_verified_reinforcement_request(p_payload text, p_signature text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_secret text;
  v_payload jsonb;
  v_content jsonb;
  v_project public.projects%rowtype;
  v_document public.documents%rowtype;
  v_request public.reinforcement_requests%rowtype;
  v_created boolean := false;
  v_project_id uuid;
  v_document_id uuid;
  v_key uuid;
  v_expires bigint;
begin
  if v_user is null or not private.can_manage_own_documents() then
    raise exception using errcode = '42501', message = 'Request creation is not allowed';
  end if;
  if p_payload is null or octet_length(p_payload) > 300000 or p_signature is null
    or p_signature !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '42501', message = 'Invalid request proof';
  end if;
  select secret into v_secret from private.reinforcement_request_secrets where singleton;
  if v_secret is null or encode(extensions.hmac(p_payload, v_secret, 'sha256'), 'hex') <> p_signature then
    raise exception using errcode = '42501', message = 'Invalid request proof';
  end if;
  v_payload := p_payload::jsonb;
  v_expires := (v_payload->>'expiresAt')::bigint;
  if (v_payload->>'userId')::uuid is distinct from v_user or v_expires is null
    or v_expires < extract(epoch from clock_timestamp())
    or v_expires > extract(epoch from clock_timestamp()) + 330 then
    raise exception using errcode = '42501', message = 'Expired or foreign request proof';
  end if;
  v_content := v_payload->'content';
  v_project_id := (v_payload->>'projectId')::uuid;
  v_document_id := (v_content->>'documentId')::uuid;
  v_key := (v_payload->>'idempotencyKey')::uuid;

  -- Retry may arrive after a PDF replacement. An already committed request
  -- stays attached to its original version; return its receipt without rewriting.
  select * into v_request from public.reinforcement_requests
    where owner_id = v_user and idempotency_key = v_key;
  if not found then
    -- Same lock order as replacement/deletion: project, then document.
    select * into v_project from public.projects where id = v_project_id and owner_id = v_user for update;
    if not found then raise exception using errcode = '42501', message = 'Project unavailable'; end if;
    if v_project.document_id is distinct from v_document_id or v_project.status = 'deleting' then
      raise exception using errcode = '40001', message = 'Project version changed';
    end if;
    select * into v_document from public.documents where id = v_document_id and owner_id = v_user for key share;
    if not found or not private.document_is_available(v_document_id) then
      raise exception using errcode = '42501', message = 'Document unavailable';
    end if;
    if v_document.storage_path is distinct from v_payload->>'storagePath'
      or v_document.size_bytes is distinct from (v_payload->>'sizeBytes')::bigint then
      raise exception using errcode = '40001', message = 'PDF metadata changed';
    end if;
    insert into public.reinforcement_requests(owner_id, project_id, document_id, page_number, verified_page_count,
      selection, selected_text, text_source, category, need, idempotency_key, input_hash)
    values (v_user, v_project_id, v_document_id, (v_content->>'pageNumber')::integer, (v_payload->>'pageCount')::integer,
      nullif(v_content->'fragment', 'null'::jsonb), v_content->>'text', v_content->>'source', v_content->>'category',
      v_content->>'need', v_key, v_payload->>'inputHash')
    on conflict (owner_id, idempotency_key) do nothing returning * into v_request;
    v_created := found;
    if not v_created then
      select * into v_request from public.reinforcement_requests where owner_id = v_user and idempotency_key = v_key;
    end if;
  end if;
  if v_request.input_hash is distinct from v_payload->>'inputHash' then
    raise exception using errcode = '23505', message = 'Idempotency key has different content';
  end if;
  if not private.document_is_available(v_request.document_id) then
    raise exception using errcode = '42501', message = 'Document unavailable';
  end if;
  return jsonb_build_object('created', v_created, 'request', jsonb_build_object(
    'id', v_request.id, 'status', v_request.status, 'createdAt', v_request.created_at));
end;
$$;
revoke all on function private.create_verified_reinforcement_request(text, text) from public, anon;
grant execute on function private.create_verified_reinforcement_request(text, text) to authenticated;

-- Public wrapper has no elevated rights. The private function rechecks auth.uid,
-- active role, ownership, current version and the proof on every call.
create function public.create_reinforcement_request(p_payload text, p_signature text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.create_verified_reinforcement_request(p_payload, p_signature); $$;
revoke all on function public.create_reinforcement_request(text, text) from public, anon;
grant execute on function public.create_reinforcement_request(text, text) to authenticated;

notify pgrst, 'reload schema';
commit;
