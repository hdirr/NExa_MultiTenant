-- Chave de API do gerador de imagens por tenant (Model A: cada empresa usa a
-- própria conta e paga direto). Fallback da agência: env GEMINI_API_KEY.
alter table tenant_secrets
  add column if not exists image_api_key text;
