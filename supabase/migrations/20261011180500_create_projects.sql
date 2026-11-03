create table if not exists public.projects (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null unique
    references public.documents(id) on delete cascade,
  name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

drop policy if exists "Users can view own projects"
on public.projects;

create policy "Users can view own projects"
on public.projects
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Users can create own projects"
on public.projects;

create policy "Users can create own projects"
on public.projects
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Users can update own projects"
on public.projects;

create policy "Users can update own projects"
on public.projects
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own projects"
on public.projects;

create policy "Users can delete own projects"
on public.projects
for delete
to authenticated
using (auth.uid() = owner_id);

create index if not exists projects_owner_id_idx
on public.projects(owner_id);
