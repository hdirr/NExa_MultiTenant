-- Conteúdo Engine — Fase 1: tabelas de conteúdo/dados + RLS
-- Rode DEPOIS da 0001_init.sql.

-- ─────────────────────────────────────────────────────────────
-- Contexto e voz (1:1 com tenant)
-- ─────────────────────────────────────────────────────────────
create table public.tenant_context (
  tenant_id        uuid primary key references public.tenants(id) on delete cascade,
  o_que_vende      text,
  para_quem        text,
  dor              text,
  prova_disponivel text,   -- fonte ÚNICA e controlada de prova
  objecoes         text,
  concorrentes     text,
  referencias      text,
  updated_at       timestamptz not null default now()
);

create table public.tenant_voice (
  tenant_id           uuid primary key references public.tenants(id) on delete cascade,
  somos               text,
  nao_somos           text,
  palavras_proibidas  text,
  exemplos            jsonb,
  updated_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Canais, pauta, peças, aprovações, publicados, métricas, calibração
-- ─────────────────────────────────────────────────────────────
create table public.channels (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants(id) on delete cascade,
  rede               text not null,
  handle             text,
  formatos           text[] not null default '{}',
  frequencia_semanal int
);

create table public.pauta_items (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  tema       text not null,
  angulo     text,
  formato    text,
  objetivo   text,
  status     text not null default 'backlog',  -- backlog | producao | aguardando | entregue
  created_at timestamptz not null default now()
);

create table public.pieces (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  pauta_id   uuid references public.pauta_items(id) on delete set null,
  formato    text,
  titulo     text,
  conteudo   jsonb,
  status     text not null default 'rascunho',
  created_at timestamptz not null default now()
);

create table public.approvals (
  id         uuid primary key default gen_random_uuid(),
  piece_id   uuid not null references public.pieces(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  decisao    text,
  comentario text,
  created_at timestamptz not null default now()
);

create table public.published (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  piece_id   uuid references public.pieces(id) on delete set null,
  data       date,
  tema       text,
  formato    text,
  canal      text,
  link       text,
  desempenho text
);

create table public.metrics (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  data           date,
  formato        text,
  pecas_geradas  int not null default 0,
  pecas_aprovadas int not null default 0,
  tokens_entrada int not null default 0,
  tokens_saida   int not null default 0,
  custo_usd      numeric(12,4) not null default 0,
  minutos_ciclo  int not null default 0
);

create table public.calibracao (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  data           date,
  peca           text,
  motivo         text,
  regra_criada   text,
  promovida_core boolean not null default false
);

-- índices úteis
create index on public.channels (tenant_id);
create index on public.pauta_items (tenant_id);
create index on public.pieces (tenant_id);
create index on public.published (tenant_id);
create index on public.metrics (tenant_id);
create index on public.calibracao (tenant_id);

-- ─────────────────────────────────────────────────────────────
-- RLS: admin vê/escreve tudo; cliente só LÊ dados do seu tenant.
-- ─────────────────────────────────────────────────────────────
alter table public.tenant_context enable row level security;
alter table public.tenant_voice   enable row level security;
alter table public.channels       enable row level security;
alter table public.pauta_items    enable row level security;
alter table public.pieces         enable row level security;
alter table public.approvals      enable row level security;
alter table public.published      enable row level security;
alter table public.metrics        enable row level security;
alter table public.calibracao     enable row level security;

-- Tabelas com coluna tenant_id: mesma política em todas.
do $$
declare t text;
begin
  foreach t in array array[
    'tenant_context','tenant_voice','channels','pauta_items',
    'pieces','published','metrics','calibracao'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select using (public.is_admin() or public.is_tenant_member(tenant_id));',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin());',
      t || '_admin_write', t);
  end loop;
end $$;

-- approvals: tenant_id vem da peça. Admin tudo; cliente lê aprovações do
-- próprio tenant (escrita de cliente será liberada na Fase 3).
create policy approvals_select on public.approvals
  for select using (
    public.is_admin()
    or public.is_tenant_member((select tenant_id from public.pieces p where p.id = piece_id))
  );
create policy approvals_admin_write on public.approvals
  for all using (public.is_admin()) with check (public.is_admin());
