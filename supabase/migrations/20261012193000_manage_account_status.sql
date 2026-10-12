begin;

-- Solo un administrador activo puede cambiar el estado.
create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_active boolean;
begin
  select p.role, p.is_active
    into v_actor_role, v_actor_active
  from public.profiles p
  where p.id = v_actor_id
  for share;

  if v_actor_id is null
    or v_actor_role is distinct from 'admin'
    or v_actor_active is distinct from true then
    raise exception 'No tienes permiso para cambiar el estado.'
      using errcode = '42501';
  end if;

  if p_user_id is null or p_is_active is null then
    raise exception 'Usuario o estado inválido.'
      using errcode = '22023';
  end if;

  if p_user_id = v_actor_id then
    raise exception 'No puedes cambiar el estado de tu propia cuenta.'
      using errcode = '22023';
  end if;

  update public.profiles
  set is_active = p_is_active
  where id = p_user_id;

  if not found then
    raise exception 'El usuario no existe.'
      using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', p_user_id,
    'is_active', p_is_active
  );
end;
$$;

revoke all on function public.admin_set_user_status(uuid, boolean)
from public, anon, authenticated;

grant execute on function public.admin_set_user_status(uuid, boolean)
to authenticated;

-- Comprobación del estado para las políticas de acceso.
create schema if not exists private;

grant usage on schema private to authenticated;

create or replace function private.has_active_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  );
$$;

revoke all on function private.has_active_account()
from public, anon, authenticated;

grant execute on function private.has_active_account()
to authenticated;

-- Estas restricciones se suman a las reglas de propiedad existentes.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'documents', 'projects', 'reinforcements'
  ]
  loop
    execute format(
      'drop policy if exists "Account must be active" on public.%I',
      v_table
    );

    execute format(
      'create policy "Account must be active"
       on public.%I
       as restrictive
       for all
       to authenticated
       using ((select private.has_active_account()))
       with check ((select private.has_active_account()))',
      v_table
    );
  end loop;
end;
$$;

drop policy if exists "PDF account must be active"
on storage.objects;

create policy "PDF account must be active"
on storage.objects
as restrictive
for all
to authenticated
using (
  bucket_id <> 'pdf-documents'
  or (select private.has_active_account())
)
with check (
  bucket_id <> 'pdf-documents'
  or (select private.has_active_account())
);

-- Supabase Auth comprobará el estado antes de emitir nuevos tokens.
grant usage on schema public to supabase_auth_admin;

grant select (id, is_active)
on public.profiles to supabase_auth_admin;

drop policy if exists "Auth checks account status"
on public.profiles;

create policy "Auth checks account status"
on public.profiles
for select
to supabase_auth_admin
using (true);

create or replace function public.check_active_account_hook(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = (event ->> 'user_id')::uuid
      and p.is_active = true
  ) then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'ACCOUNT_DISABLED'
      )
    );
  end if;

  return jsonb_build_object('claims', event -> 'claims');
end;
$$;

revoke all on function public.check_active_account_hook(jsonb)
from public, anon, authenticated;

grant execute on function public.check_active_account_hook(jsonb)
to supabase_auth_admin;

notify pgrst, 'reload schema';

commit;
