-- Conteúdo Engine — Fase 0: fundação (perfis, tenants, membros, RLS)
-- Rode este SQL no Supabase (SQL Editor) uma vez, no projeto novo.

-- ─────────────────────────────────────────────────────────────
-- Papéis e perfis
-- ─────────────────────────────────────────────────────────────
create type public.user_role as enum ('admin', 'client');

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       public.user_role not null default 'client',
  created_at timestamptz not null default now()
);

-- Cria o perfil automaticamente quando um usuário é criado no Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Tenants e membros
-- ─────────────────────────────────────────────────────────────
create table public.tenants (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  nome_exibicao        text not null,
  status               text not null default 'ativo',   -- ativo | pausado | arquivado
  objetivo             text,                             -- lead | autoridade | educacao | retencao
  aprovador            text,
  janela_antirep_dias  int  not null default 60,
  negocio_vende        text,
  negocio_publico      text,
  negocio_dor          text,
  negocio_diferencial  text,
  created_at           timestamptz not null default now()
);

-- Quem enxerga qual tenant (clientes). Admin vê todos via is_admin().
create table public.tenant_members (
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_id, profile_id)
);

-- ─────────────────────────────────────────────────────────────
-- Funções auxiliares (SECURITY DEFINER evita recursão de RLS)
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_tenant_member(tid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.tenant_members
    where tenant_id = tid and profile_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.tenants         enable row level security;
alter table public.tenant_members  enable row level security;

-- profiles: cada um vê o próprio; admin vê todos.
create policy "profiles_select_self_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- tenants: admin tudo; cliente só os tenants de que é membro.
create policy "tenants_select" on public.tenants
  for select using (public.is_admin() or public.is_tenant_member(id));
create policy "tenants_admin_write" on public.tenants
  for all using (public.is_admin()) with check (public.is_admin());

-- tenant_members: admin tudo; cliente vê só as próprias associações.
create policy "members_select" on public.tenant_members
  for select using (public.is_admin() or profile_id = auth.uid());
create policy "members_admin_write" on public.tenant_members
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- Depois de criar seu usuário admin pelo painel do Supabase (Auth),
-- promova-o rodando (troque o e-mail):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'voce@exemplo.com');
-- ─────────────────────────────────────────────────────────────
