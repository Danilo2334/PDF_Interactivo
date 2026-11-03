create table if not exists public.documents (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0),
  mime_type text not null default 'application/pdf',
  status text not null default 'uploaded'
    check (status in ('uploaded', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.documents enable row level security;

drop policy if exists "Users can view own documents"
on public.documents;

create policy "Users can view own documents"
on public.documents
for select
to authenticated
using (auth.uid() = owner_id);

drop policy if exists "Users can create own documents"
on public.documents;

create policy "Users can create own documents"
on public.documents
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "Users can update own documents"
on public.documents;

create policy "Users can update own documents"
on public.documents
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Users can delete own documents"
on public.documents;

create policy "Users can delete own documents"
on public.documents
for delete
to authenticated
using (auth.uid() = owner_id);

create index if not exists documents_owner_id_idx
on public.documents(owner_id);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'pdf-documents',
  'pdf-documents',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "Users can upload own PDF files"
on storage.objects;

create policy "Users can upload own PDF files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'pdf-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can view own PDF files"
on storage.objects;

create policy "Users can view own PDF files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'pdf-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own PDF files"
on storage.objects;

create policy "Users can delete own PDF files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'pdf-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
