begin;

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role text
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
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión.'
      using errcode = '42501';
  end if;

  select role, is_active
    into v_actor_role, v_actor_active
  from public.profiles
  where id = v_actor_id
  for share;

  if v_actor_role is distinct from 'admin'
     or v_actor_active is distinct from true then
    raise exception 'No tienes permiso para realizar esta acción.'
      using errcode = '42501';
  end if;

  if p_user_id is null
     or p_role is null
     or p_role not in ('owner', 'viewer', 'admin') then
    raise exception 'Usuario o rol inválido.'
      using errcode = '22023';
  end if;

  if p_user_id = v_actor_id then
    raise exception 'No puedes modificar tu propio rol.'
      using errcode = '22023';
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id;

  if not found then
    raise exception 'El usuario no existe.'
      using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', p_user_id,
    'role', p_role
  );
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text)
  from public, anon, authenticated;

grant execute on function public.admin_set_user_role(uuid, text)
  to authenticated;

commit;
