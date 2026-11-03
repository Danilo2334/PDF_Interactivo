begin;

create or replace function public.admin_list_users(
  p_search text default '',
  p_page integer default 1
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  is_active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_search text := lower(btrim(coalesce(p_search, '')));
begin
  if not exists (
    select 1
    from public.profiles as actor
    where actor.id = auth.uid()
      and actor.role = 'admin'
      and actor.is_active = true
  ) then
    raise exception 'No tienes permiso para consultar usuarios.'
      using errcode = '42501';
  end if;

  if p_page is null or p_page < 1 then
    raise exception 'Página inválida.'
      using errcode = '22023';
  end if;

  if length(v_search) > 100 then
    raise exception 'La búsqueda no puede superar 100 caracteres.'
      using errcode = '22023';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.is_active
  from public.profiles as p
  where
    v_search = ''
    or position(v_search in lower(coalesce(p.full_name, ''))) > 0
    or position(v_search in lower(p.email)) > 0
  order by lower(p.email), p.id
  -- Se muestran 20; el registro adicional permite detectar otra página.
  limit 21
  offset ((p_page::bigint - 1) * 20);
end;
$$;

revoke all on function public.admin_list_users(text, integer)
  from public, anon, authenticated;

grant execute on function public.admin_list_users(text, integer)
  to authenticated;

notify pgrst, 'reload schema';

commit;
