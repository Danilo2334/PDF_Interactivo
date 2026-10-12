begin;

alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  alter column role set default 'owner';

alter table public.profiles enable row level security;

-- El navegador puede consultar su perfil según las políticas RLS.
-- La escritura administrativa requiere una operación privilegiada.
revoke all privileges on table public.profiles
  from public, anon, authenticated;

-- Retirar también posibles permisos concedidos por columna.
revoke update (role, is_active), insert (role, is_active)
  on table public.profiles
  from public, anon, authenticated;

grant select on table public.profiles to authenticated;

commit;
