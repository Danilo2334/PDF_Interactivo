begin;
set local lock_timeout = '5s';
-- SCRUM-173/SCRUM-174: deterministic conflicts must not trigger transaction retries.
-- Only three SQLSTATE codes change; CREATE OR REPLACE preserves existing privileges.
create or replace function public.replace_project_pdf(
  p_project_id uuid, p_expected_document_id uuid, p_document_id uuid,
  p_original_name text, p_storage_path text, p_size_bytes bigint
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_project public.projects%rowtype;
begin
  if v_owner is null or not exists (
    select 1 from public.profiles
    where id = v_owner and is_active and role in ('owner', 'admin')
  ) then
    raise exception using errcode = '42501', message = 'Document management is not allowed';
  end if;

  select * into v_project from public.projects
  where id = p_project_id and owner_id = v_owner for update;
  if not found then
    raise exception using errcode = '42501', message = 'Project unavailable';
  end if;
  if v_project.document_id is distinct from p_expected_document_id or v_project.status = 'deleting' then
    raise exception using errcode = 'PT409', message = 'Project changed; reload before retrying';
  end if;
  if p_document_id is null or p_document_id = p_expected_document_id
    or p_original_name is null or p_original_name !~* '\.pdf$'
    or p_size_bytes is null or p_size_bytes not between 1 and 20971520
    or p_storage_path is distinct from v_owner::text || '/' || p_document_id::text || '.pdf'
  then
    raise exception using errcode = '22023', message = 'Invalid replacement metadata';
  end if;
  if not exists (
    select 1 from storage.objects where bucket_id = 'pdf-documents' and name = p_storage_path
  ) then
    raise exception using errcode = '22023', message = 'Replacement must be stored first';
  end if;
  if exists (
    select 1 from public.project_document_versions
    where document_id = v_project.document_id and project_id <> p_project_id
  ) then
    raise exception using errcode = 'PT409', message = 'Document belongs to another version history';
  end if;

  insert into public.documents (id, owner_id, original_name, storage_path, size_bytes, mime_type, status)
  values (p_document_id, v_owner, p_original_name, p_storage_path, p_size_bytes, 'application/pdf', 'uploaded');
  insert into public.project_document_versions(project_id, document_id)
  values (p_project_id, v_project.document_id) on conflict (document_id) do nothing;
  insert into public.project_document_versions(project_id, document_id)
  values (p_project_id, p_document_id);
  update public.projects set document_id = p_document_id, status = 'pending'
  where id = p_project_id;
  return p_document_id;
end;
$$;

create or replace function public.begin_project_deletion(p_project_id uuid, p_expected_document_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_project public.projects%rowtype;
  v_job public.project_deletions%rowtype;
  v_ids uuid[];
  v_paths text[];
begin
  if not private.can_manage_own_documents() then
    raise exception using errcode = '42501', message = 'Document management is not allowed';
  end if;
  select * into v_job from public.project_deletions
  where project_id = p_project_id and owner_id = v_owner for update;
  if not found then
    select * into v_project from public.projects
    where id = p_project_id and owner_id = v_owner for update;
    if not found then
      raise exception using errcode = '42501', message = 'Project unavailable';
    end if;
    -- A concurrent request may have created a job while this request waited.
    select * into v_job from public.project_deletions
    where project_id = p_project_id and owner_id = v_owner for update;
    if not found then
      if v_project.document_id is distinct from p_expected_document_id then
        raise exception using errcode = 'PT409', message = 'Project changed; reconfirm deletion';
      end if;
      select array_agg(id order by id) into v_ids from (
        select v_project.document_id as id union
        select document_id from public.project_document_versions where project_id = p_project_id
      ) versions;
      perform 1 from public.documents where id = any(v_ids) order by id for update;
      if exists (select 1 from public.documents where id = any(v_ids)
        and (owner_id <> v_owner or split_part(storage_path, '/', 1) <> v_owner::text))
        or (select count(*) from public.documents where id = any(v_ids)) <> cardinality(v_ids)
        or exists (select 1 from public.projects where document_id = any(v_ids) and id <> p_project_id)
      then
        raise exception using errcode = '42501', message = 'Version history unavailable';
      end if;
      select array_agg(storage_path order by id) into v_paths
      from public.documents where id = any(v_ids);
      insert into public.project_deletions(project_id, owner_id, document_id, document_ids, storage_paths)
      values (p_project_id, v_owner, v_project.document_id, v_ids, v_paths) returning * into v_job;
      update public.projects set status = 'deleting' where id = p_project_id;
    end if;
  end if;
  return jsonb_build_object('state', v_job.state, 'storage_paths', to_jsonb(v_job.storage_paths));
end;
$$;

notify pgrst, 'reload schema';
commit;

