begin;

create table public.reinforcements (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null
    references public.documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  title text not null check (length(trim(title)) > 0),
  content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

create index reinforcements_document_page_idx
  on public.reinforcements(document_id, page_number, created_at);

alter table public.reinforcements enable row level security;

revoke all on public.reinforcements from anon, authenticated;

grant select, insert, update, delete
  on public.reinforcements to authenticated;

create policy "Document owners manage their reinforcements"
  on public.reinforcements
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.documents d
      where d.id = reinforcements.document_id
        and d.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.documents d
      where d.id = reinforcements.document_id
        and d.owner_id = (select auth.uid())
    )
  );

commit;
