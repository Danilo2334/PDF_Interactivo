begin;
set local lock_timeout = '5s';

-- Private operation ledger: retain only the consumed key after deletion. This
-- prevents a stale browser retry from resurrecting an intentionally deleted PDF.
create table private.pdf_upload_operations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  fingerprint text check (fingerprint ~ '^[a-f0-9]{64}$'),
  completed boolean not null default false,
  document_id uuid references public.documents(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(owner_id, operation_id)
);
create index pdf_upload_operations_document_idx on private.pdf_upload_operations(document_id);
create index pdf_upload_operations_project_idx on private.pdf_upload_operations(project_id);
alter table private.pdf_upload_operations enable row level security;
revoke all on private.pdf_upload_operations from public, anon, authenticated;

create function private.clear_deleted_upload_fingerprint() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.completed and (new.document_id is null or new.project_id is null) then new.fingerprint := null; end if;
  return new;
end;
$$;
revoke all on function private.clear_deleted_upload_fingerprint() from public, anon, authenticated;
create trigger clear_deleted_upload_fingerprint before update on private.pdf_upload_operations
for each row execute function private.clear_deleted_upload_fingerprint();

create function private.recover_verified_document_upload(p_payload text, p_signature text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid(); v_secret text; v jsonb; v_key uuid; v_path text;
  v_op private.pdf_upload_operations%rowtype;
  v_document public.documents%rowtype; v_project public.projects%rowtype;
begin
  if v_user is null or not private.can_manage_own_documents() then
    raise exception using errcode='42501', message='Upload is not allowed';
  end if;
  if p_payload is null or octet_length(p_payload)>12000 or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then
    raise exception using errcode='42501', message='Invalid upload proof';
  end if;
  select secret into v_secret from private.reinforcement_request_secrets where singleton;
  if v_secret is null or encode(extensions.hmac(p_payload,v_secret,'sha256'),'hex')<>p_signature then
    raise exception using errcode='42501', message='Invalid upload proof';
  end if;
  v := p_payload::jsonb;
  if v->>'purpose' is distinct from 'pdf-upload' or (v->>'userId')::uuid is distinct from v_user
    or v->>'action' not in ('prepare','commit') or v->>'action' is null
    or (v->>'expiresAt')::bigint is null
    or (v->>'expiresAt')::bigint < extract(epoch from clock_timestamp())
    or (v->>'expiresAt')::bigint > extract(epoch from clock_timestamp())+330
    or v->>'fingerprint' is null or v->>'fingerprint' !~ '^[a-f0-9]{64}$'
    or coalesce((v->>'sizeBytes')::bigint,0) not between 1 and 20971520
    or coalesce((v->>'pageCount')::integer,0)<1
    or coalesce(char_length(v->>'originalName'),0) not between 1 and 1000 then
    raise exception using errcode='42501', message='Invalid upload proof';
  end if;
  v_key := (v->>'operationId')::uuid;
  if v_key is null then raise exception using errcode='42501',message='Invalid operation'; end if;
  v_path := v_user::text || '/' || v_key::text || '.pdf';
  insert into private.pdf_upload_operations(owner_id,operation_id,fingerprint)
    values(v_user,v_key,v->>'fingerprint') on conflict do nothing;
  select * into v_op from private.pdf_upload_operations
    where owner_id=v_user and operation_id=v_key for update;
  if v_op.completed and (v_op.document_id is null or v_op.project_id is null) then
    return jsonb_build_object('state','gone');
  end if;
  if v_op.fingerprint is distinct from v->>'fingerprint' then
    raise exception using errcode='PT409',message='Different upload content';
  end if;
  if not v_op.completed and v->>'action'='commit' then
    if not exists(select 1 from storage.objects where bucket_id='pdf-documents' and name=v_path
      and (metadata->>'size')::bigint=(v->>'sizeBytes')::bigint) then
      raise exception using errcode='PT409',message='Transfer is not confirmed';
    end if;
    -- Both inserts and receipt are atomic. Concurrent retries serialize on the
    -- operation row and return the same records, including after response loss.
    insert into public.documents(id,owner_id,original_name,storage_path,size_bytes,mime_type,status)
      values(v_key,v_user,v->>'originalName',v_path,(v->>'sizeBytes')::bigint,'application/pdf','uploaded');
    insert into public.projects(id,owner_id,document_id,name,status)
      values(v_key,v_user,v_key,coalesce(nullif(btrim(regexp_replace(v->>'originalName','\.pdf$','','i')),''),'Proyecto sin título'),'pending');
    update private.pdf_upload_operations set completed=true,document_id=v_key,project_id=v_key
      where owner_id=v_user and operation_id=v_key returning * into v_op;
  end if;
  if not v_op.completed then return jsonb_build_object('state','pending'); end if;
  -- Read only: never lock an existing project after the operation row (deletion
  -- locks the project first). A replay never rewrites or resurrects its records.
  select * into v_project from public.projects where id=v_op.project_id and owner_id=v_user;
  if not found or v_project.status='deleting' then return jsonb_build_object('state','gone'); end if;
  select * into v_document from public.documents where id=v_op.document_id and owner_id=v_user;
  if not found or not private.document_is_available(v_document.id) then return jsonb_build_object('state','gone'); end if;
  return jsonb_build_object('state','completed',
    'project',jsonb_build_object('id',v_project.id,'name',v_project.name,'status',v_project.status),
    'document',jsonb_build_object('id',v_document.id,'name',v_document.original_name,
      'size',v_document.size_bytes,'pageCount',(v->>'pageCount')::integer));
end;
$$;
revoke all on function private.recover_verified_document_upload(text,text) from public, anon;
grant execute on function private.recover_verified_document_upload(text,text) to authenticated;
create function public.recover_document_upload(p_payload text,p_signature text) returns jsonb
language sql security invoker set search_path='' as $$ select private.recover_verified_document_upload(p_payload,p_signature); $$;
revoke all on function public.recover_document_upload(text,text) from public, anon;
grant execute on function public.recover_document_upload(text,text) to authenticated;
notify pgrst,'reload schema';
commit;
