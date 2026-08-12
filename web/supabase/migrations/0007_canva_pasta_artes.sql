-- Conteúdo Engine — Fase 5.1: pasta do Canva por tenant + artes rehospedadas
-- Rode DEPOIS das migrações anteriores (0001–0006), no SQL Editor do Supabase.

-- ─────────────────────────────────────────────────────────────
-- Pasta do Canva por tenant: onde as artes daquele cliente ficam
-- organizadas na conta-agência. Guardado junto dos secrets do tenant.
-- ─────────────────────────────────────────────────────────────
alter table public.tenant_secrets
  add column if not exists canva_folder_id text;

-- ─────────────────────────────────────────────────────────────
-- Bucket público para as imagens de arte REHOSPEDADAS.
-- As URLs de export do Canva expiram em ~24h; o app baixa o PNG e
-- rehospeda aqui para não quebrar. Público = servível por URL direta
-- (o caminho é aleatório por tenant/peça). Upload só via service_role.
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('artes', 'artes', true)
on conflict (id) do nothing;

-- Para conferir depois de rodar:
--   select tenant_id, (canva_folder_id is not null) as tem_pasta from public.tenant_secrets;
--   select id, public from storage.buckets where id = 'artes';
