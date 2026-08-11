-- Conteúdo Engine — Fase 5: integração Canva (autofill + export)
-- Rode DEPOIS das migrações anteriores (0001–0005).
-- Tokens do Canva são SEGREDO: RLS habilitado SEM policies. Só o servidor
-- (service_role, que contorna o RLS) lê/escreve. Nunca vai para o navegador.

-- ─────────────────────────────────────────────────────────────
-- Conexão OAuth do Canva — nível AGÊNCIA (uma conta = singleton).
-- ─────────────────────────────────────────────────────────────
create table public.canva_connection (
  id            int primary key default 1 check (id = 1),
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now()
);

alter table public.canva_connection enable row level security;
-- Sem policies: nenhum acesso pela publishable key. service_role contorna o RLS.

-- ─────────────────────────────────────────────────────────────
-- Template Canva por tenant (BTM…) — guardado junto dos secrets do tenant.
-- ─────────────────────────────────────────────────────────────
alter table public.tenant_secrets
  add column if not exists canva_template_id text;

-- ─────────────────────────────────────────────────────────────
-- Arte gerada por peça (design id do Canva + urls exportadas).
-- ─────────────────────────────────────────────────────────────
alter table public.pieces
  add column if not exists arte jsonb;

-- Para conferir depois de rodar:
--   select id, (access_token is not null) as conectado, expires_at from public.canva_connection;
--   select tenant_id, (canva_template_id is not null) as tem_template from public.tenant_secrets;
