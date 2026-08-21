-- Fase 7 — Onboarding autônomo (parte 1): papel "owner".
-- O dono do negócio se cadastra sozinho e administra SOMENTE o próprio tenant
-- (não é admin global). Valor novo de enum não pode ser usado na mesma
-- transação em que é criado, por isso esta migração fica sozinha.
alter type public.user_role add value if not exists 'owner' after 'client';
