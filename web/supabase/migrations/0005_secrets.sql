-- Conteúdo Engine — Fase 4: chave Anthropic por tenant (Modelo A)
-- A chave é um SEGREDO. RLS habilitado SEM políticas para anon/authenticated:
-- ninguém acessa via publishable key. Só o servidor (service_role, que
-- contorna o RLS) lê/escreve. Nunca vai para o navegador.
-- Rode DEPOIS das migrações anteriores.

create table public.tenant_secrets (
  tenant_id     uuid primary key references public.tenants(id) on delete cascade,
  anthropic_key text,
  updated_at    timestamptz not null default now()
);

alter table public.tenant_secrets enable row level security;
-- Sem policies: nenhum acesso pela publishable key. service_role contorna o RLS.

-- Para conferir depois de rodar:
--   select tenant_id, (anthropic_key is not null) as tem_chave from public.tenant_secrets;
