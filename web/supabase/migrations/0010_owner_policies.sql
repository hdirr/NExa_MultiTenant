-- Fase 7 — Onboarding autônomo (parte 2): permissões do dono + status pendente.
--
-- Modelo de papéis:
--   admin  → você (agência): vê e escreve em todos os tenants;
--   owner  → dono do cliente: escreve apenas nos dados do próprio tenant,
--            mas NUNCA muda o status dele (ativação é decisão da agência);
--   client → usuário de leitura/aprovação (como já era).
--
-- O status "pendente" marca tenants criados por auto-cadastro aguardando
-- ativação. A coluna é text sem constraint, então nenhum ALTER é preciso —
-- apenas registramos o contrato com um CHECK para evitar typos futuros.

alter table public.tenants drop constraint if exists tenants_status_check;
alter table public.tenants add constraint tenants_status_check
  check (status in ('ativo', 'pausado', 'arquivado', 'pendente'));

-- ─────────────────────────────────────────────────────────────
-- Função auxiliar: o usuário logado é DONO deste tenant?
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_tenant_admin(tid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.tenant_members m
    join public.profiles p on p.id = m.profile_id
    where m.tenant_id = tid
      and m.profile_id = auth.uid()
      and p.role = 'owner'
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- Escrita do owner nos dados do próprio tenant
-- ─────────────────────────────────────────────────────────────
-- Tabelas com coluna tenant_id: espelha a política de admin da 0002.
do $$
declare t text;
begin
  foreach t in array array[
    'tenant_context','tenant_voice','channels','pauta_items',
    'pieces','published','metrics','calibracao'
  ]
  loop
    execute format(
      'create policy %I on public.%I for all using (public.is_tenant_admin(tenant_id)) with check (public.is_tenant_admin(tenant_id));',
      t || '_owner_write', t);
  end loop;
end $$;

-- Tenant: o dono pode atualizar os dados do próprio (nome, negócio…),
-- mas nunca o status — gatilho abaixo bloqueia.
create policy tenants_owner_update on public.tenants
  for update using (public.is_tenant_admin(id))
  with check (public.is_tenant_admin(id));

create or replace function public.guarda_status_do_tenant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and not public.is_admin() then
    raise exception 'somente o administrador pode alterar o status do tenant';
  end if;
  return new;
end $$;

create trigger tenants_guarda_status
  before update on public.tenants
  for each row execute function public.guarda_status_do_tenant();

-- Membros: o dono gerencia os usuários do próprio tenant (convidar/remover
-- clientes). Papéis continuam imutáveis por terceiros (policy da 0001).
create policy members_owner_manage on public.tenant_members
  for all using (public.is_tenant_admin(tenant_id))
  with check (public.is_tenant_admin(tenant_id));

-- Aprovações: o dono lê as aprovações do próprio tenant.
create policy approvals_owner_select on public.approvals
  for select using (
    public.is_tenant_admin((select tenant_id from public.pieces p where p.id = piece_id))
  );
