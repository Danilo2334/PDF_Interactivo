begin;
set local lock_timeout = '5s';

create table public.project_document_versions (
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid not null unique references public.documents(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (project_id, document_id)
);

alter table public.project_document_versions enable row level security;
revoke all on public.project_document_versions from anon, authenticated;
grant select on public.project_document_versions to authenticated;

create policy "Owners can read their project versions"
on public.project_document_versions for select to authenticated
using (exists (
  select 1 from public.projects p
  where p.id = project_id and p.owner_id = (select auth.uid())
));

-- Only the transaction below attaches a new version. An old PDF and its
-- reinforcements keep their identity; nothing is reassigned to the new PDF.
create function public.replace_project_pdf(
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
    raise exception using errcode = '40001', message = 'Project changed; reload before retrying';
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
    raise exception using errcode = '40001', message = 'Document belongs to another version history';
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

revoke all on function public.replace_project_pdf(uuid, uuid, uuid, text, text, bigint) from public, anon;
grant execute on function public.replace_project_pdf(uuid, uuid, uuid, text, text, bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
