begin;
create table if not exists public.site_admin_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  permissions text[] not null default '{}' check (permissions <@ array['users','settings','reports']::text[]),
  granted_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table if not exists public.site_settings (
  id text primary key check (id = 'general'),
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create table if not exists public.site_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_id text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.site_admin_roles enable row level security;
alter table public.site_settings enable row level security;
alter table public.site_admin_audit enable row level security;
-- No browser policies: permission changes go exclusively through the server.
revoke all on public.site_admin_roles, public.site_settings, public.site_admin_audit from anon, authenticated;
grant all on public.site_admin_roles, public.site_settings, public.site_admin_audit to service_role;
commit;
