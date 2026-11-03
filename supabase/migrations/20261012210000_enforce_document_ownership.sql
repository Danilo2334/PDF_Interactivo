begin;

drop policy if exists "Document path belongs to owner"
on public.documents;

create policy "Document path belongs to owner"
on public.documents
as restrictive
for all
to authenticated
using (
  owner_id = (select auth.uid())
  and split_part(storage_path, '/', 1) = owner_id::text
);

drop policy if exists "Project document belongs to owner"
on public.projects;

create policy "Project document belongs to owner"
on public.projects
as restrictive
for all
to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from public.documents d
    where d.id = projects.document_id
      and d.owner_id = (select auth.uid())
  )
);

notify pgrst, 'reload schema';

commit;
