begin;
set local lock_timeout = '5s';

alter table public.projects drop constraint projects_status_check;
alter table public.projects add constraint projects_status_check
check (status in ('pending', 'processing', 'ready', 'failed', 'deleting'));

-- A minimal tombstone survives the removed project so retries remain idempotent.
-- It contains no PDF content, reinforcement text, title, or personal filename.
create table public.project_deletions (
  project_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null,
  document_ids uuid[] not null,
  storage_paths text[] not null,
  state text not null default 'pending' check (state in ('pending', 'completed')),
  last_failure_stage text check (last_failure_stage in ('storage', 'records')),
  last_failure_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (cardinality(document_ids) > 0 and cardinality(document_ids) = cardinality(storage_paths))
);
create index project_deletions_owner_state_idx on public.project_deletions(owner_id, state);
alter table public.project_deletions enable row level security;
revoke all on public.project_deletions from anon, authenticated;
grant select on public.project_deletions to authenticated;

create function private.can_manage_own_documents() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles
  where id = auth.uid() and is_active and role in ('owner', 'admin')); $$;
revoke all on function private.can_manage_own_documents() from public, anon;
grant execute on function private.can_manage_own_documents() to authenticated;
grant usage on schema private to authenticated;

create policy "Owners can read their cleanup status" on public.project_deletions
for select to authenticated using (
  owner_id = (select auth.uid()) and (select private.can_manage_own_documents())
);

create function private.document_is_available(p_document_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select not exists (select 1 from public.project_deletions
  where p_document_id = any(document_ids)); $$;
create function private.pdf_path_is_available(p_path text) returns boolean
language sql stable security definer set search_path = ''
as $$ select not exists (select 1 from public.project_deletions
  where p_path = any(storage_paths)); $$;
revoke all on function private.document_is_available(uuid), private.pdf_path_is_available(text) from public, anon;
grant execute on function private.document_is_available(uuid), private.pdf_path_is_available(text) to authenticated;

-- Blocking the document also blocks its project and reinforcements through their
-- existing ownership policies. Storage reads are blocked even before cleanup ends.
create policy "Deleting documents are unavailable" on public.documents
as restrictive for select to authenticated using (private.document_is_available(id));
create policy "Deleting PDF objects are unavailable" on storage.objects
as restrictive for select to authenticated
using (bucket_id <> 'pdf-documents' or private.pdf_path_is_available(name)
  or storage.allow_any_operation(array['object.delete', 'object.delete_many']));

create function private.guard_project_document_reference() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Lock before checking the tombstone to serialize with deletion snapshots.
  perform 1 from public.documents where id = new.document_id and owner_id = new.owner_id for key share;
  if not found or not private.document_is_available(new.document_id) then
    raise exception using errcode = '55006', message = 'Document is unavailable';
  end if;
  if exists (select 1 from public.project_document_versions
    where document_id = new.document_id and project_id <> new.id) then
    raise exception using errcode = '23514', message = 'Document belongs to another version history';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_project_document_reference() from public, anon, authenticated;
create trigger projects_guard_document_reference before insert or update of document_id on public.projects
for each row execute function private.guard_project_document_reference();

create function public.begin_project_deletion(p_project_id uuid, p_expected_document_id uuid)
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
        raise exception using errcode = '40001', message = 'Project changed; reconfirm deletion';
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

create function public.finish_project_deletion(p_project_id uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_owner uuid := auth.uid(); v_job public.project_deletions%rowtype;
begin
  if not private.can_manage_own_documents() then
    raise exception using errcode = '42501', message = 'Document management is not allowed';
  end if;
  select * into v_job from public.project_deletions
  where project_id = p_project_id and owner_id = v_owner for update;
  if not found then
    raise exception using errcode = '42501', message = 'Cleanup unavailable';
  end if;
  if v_job.state = 'completed' then return true; end if;
  if exists (select 1 from storage.objects
    where bucket_id = 'pdf-documents' and name = any(v_job.storage_paths)) then
    raise exception using errcode = '55006', message = 'Files have not been removed';
  end if;
  if exists (select 1 from public.documents where id = any(v_job.document_ids) and owner_id <> v_owner)
    or exists (select 1 from public.projects where document_id = any(v_job.document_ids) and id <> p_project_id)
  then
    raise exception using errcode = '42501', message = 'Version history changed';
  end if;
  -- Extension point: every future document-dependent table must use ON DELETE
  -- CASCADE, or add its explicit cleanup here plus a corresponding integration
  -- test. A restrictive FK aborts this whole transaction instead of reporting success.
  delete from public.projects where id = p_project_id and owner_id = v_owner;
  delete from public.documents where id = any(v_job.document_ids) and owner_id = v_owner;
  update public.project_deletions set state = 'completed', completed_at = now(),
    last_failure_stage = null, last_failure_at = null where project_id = p_project_id;
  return true;
end;
$$;

create function public.record_project_deletion_failure(p_project_id uuid, p_stage text) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.can_manage_own_documents() or p_stage not in ('storage', 'records') then
    raise exception using errcode = '42501', message = 'Cleanup unavailable';
  end if;
  update public.project_deletions set last_failure_stage = p_stage, last_failure_at = now()
  where project_id = p_project_id and owner_id = auth.uid() and state = 'pending';
end;
$$;
revoke all on function public.begin_project_deletion(uuid, uuid), public.finish_project_deletion(uuid),
  public.record_project_deletion_failure(uuid, text) from public, anon;
grant execute on function public.begin_project_deletion(uuid, uuid), public.finish_project_deletion(uuid),
  public.record_project_deletion_failure(uuid, text) to authenticated;
notify pgrst, 'reload schema';
commit;
