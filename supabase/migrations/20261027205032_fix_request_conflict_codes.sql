begin;
set local lock_timeout = '5s';
-- SCRUM-180: reject stale PDF proofs without serialization-failure retries.
-- Only the two deterministic conflict codes change; existing grants and RLS remain.
create or replace function private.create_verified_reinforcement_request(p_payload text, p_signature text)
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
      raise exception using errcode = 'PT409', message = 'Project version changed';
    end if;
    select * into v_document from public.documents where id = v_document_id and owner_id = v_user for key share;
    if not found or not private.document_is_available(v_document_id) then
      raise exception using errcode = '42501', message = 'Document unavailable';
    end if;
    if v_document.storage_path is distinct from v_payload->>'storagePath'
      or v_document.size_bytes is distinct from (v_payload->>'sizeBytes')::bigint then
      raise exception using errcode = 'PT409', message = 'PDF metadata changed';
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
notify pgrst, 'reload schema';
commit;
