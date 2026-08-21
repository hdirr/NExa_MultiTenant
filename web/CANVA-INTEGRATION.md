# Fase 5 — Integração Canva (autofill + export) no app

Objetivo: depois de gerar a peça (texto) no app, o app **preenche um Brand
Template do Canva com a copy e exporta a imagem** — sem passar por fora. A arte
entra no fluxo de aprovação junto com o texto.

## Modelo de arquitetura

- **Conexão Canva = nível agência (NExa), uma vez.** Uma única conta Canva Pro+
  segura os Brand Templates de todos os clientes. O app conecta via OAuth
  (Connect API) e guarda `access_token` + `refresh_token` server-only, renovando
  sozinho. (Diferente da chave Anthropic, que é por tenant.)
- **Template = por tenant.** Cada tenant tem um `canva_template_id` (BTM…) do seu
  Brand Template já com os campos `hook`, `s2`…`s7`, `cta`.
- **Runtime automatizado, setup manual.** O app automatiza o USO (preencher +
  exportar por peça). A CRIAÇÃO do template (design + marcação de campos) é uma
  vez por cliente, no editor do Canva + marcação via API.

## Regra de segurança (mantém o padrão do projeto)
Tokens do Canva são SEGREDO: tabela com RLS sem policies (só `service_role`
via `createAdminClient`), lidos **só no servidor**, nunca no browser — igual
`tenant_secrets`.

---

## Fases de build

### Fase 5.0 — Fundação (HOJE, não depende de OAuth)
- [x] **Migração `0006_canva.sql`**: tabela `canva_connection` (singleton OAuth),
      coluna `canva_template_id` em `tenant_secrets`, coluna `arte jsonb` em `pieces`.
      → RODAR no Supabase SQL Editor.
- [x] **Geração estruturada** (`lib/generate.ts`): `gerarCarrosselCampos()` devolve
      `{hook, s2…s7, cta}` com limites de caractere no prompt. Testável hoje.
- [x] **Módulo Canva** (`lib/canva.ts`): `getAccessToken()` (lê/renova token),
      `autofillCarrossel()`, `exportarPng()`, `isCanvaConnected()`. Typecheck OK.
- [x] **UI**: campo `canva_template_id` na página do tenant + action `setTenantCanvaTemplate`.

### Fase 5.1 — Conexão Canva (precisa de você) `[VOCÊ]` + código
- [x] **Código**: rotas `/api/canva/connect` + `/callback` (OAuth PKCE) e botão
      "Conectar Canva" no painel admin. Refresh automático em `getAccessToken()`.
- [ ] `[VOCÊ]` **Registrar app no Canva Developers** (canva.com/developers):
      cria `client_id` + `client_secret`, define escopos
      (`brandtemplate:meta:read`, `brandtemplate:content:read`,
      `design:content:write`, `design:meta:read`, `asset:read`), e a
      **Redirect URL** (`http://127.0.0.1:3000/api/canva/callback` p/ dev;
      a URL da Vercel p/ produção).
- [ ] `[VOCÊ]` Colar `CANVA_CLIENT_ID` + `CANVA_CLIENT_SECRET` no `web/.env.local`.
- [ ] **Código**: rota `/api/canva/connect` (inicia OAuth c/ PKCE) e
      `/api/canva/callback` (troca code por token, grava em `canva_connection`).
      Botão "Conectar Canva" no painel admin. Refresh automático em `getAccessToken()`.

### Fase 5.2 — Autofill + export
- [x] `lib/canva.ts`: `autofillCarrossel()` (job + poll) e `exportarPng()` (job + poll).
- [x] Action `generateArtAI(pieceId)`: lê os campos da peça + `canva_template_id`
      → autofill → export → grava `arte` na peça. Peça de carrossel já sai em campos.
- [x] UI: botão **"✨ gerar arte no Canva"** na peça (aparece se a peça tem campos)
      → mostra as imagens exportadas.
- [ ] `[VOCÊ]` **Rodar migração 0006** no Supabase + **registrar app do Canva** (5.1).

### Fase 5.3 — Amarração e produção
- [x] Arte aparece no `/aprovar` (cliente aprova o visual junto do texto).
- [x] **Arte automática**: `generatePieceAI` já preenche o Brand Template e
      exporta os PNGs na hora em que a peça passa pela revisão de marca
      (carrossel com campos). O design chega completo na pasta do cliente no
      Canva sem clique extra; botão manual continua para regerar.
- [ ] **Deploy na Vercel** (OAuth redirect de produção + acesso 24/7).
- [ ] Setup, uma vez por tenant: montar o Brand Template no Canva → marcar campos
      (via API: `create-brand-template-draft` → tag `hook`/`s2`…/`cta` →
      `publish-brand-template`) → salvar o `BTM…` no tenant.

---

## Contrato de campos do template (fixo)
`hook` (≤45 car.) · `s2`…`s7` (≤220 car. cada) · `cta` (≤110 car.).
A geração estruturada mira exatamente esses nomes. Mudou o template? Atualiza o
contrato nos dois lados (prompt + tags do Canva).

## Dependências externas / gates
1. `[VOCÊ]` App de desenvolvedor no Canva (5.1) — trava o autofill real.
2. `[VOCÊ]` 1 Brand Template com campos por tenant (5.3) — trava por cliente.
3. Deploy p/ OAuth de produção e uso pelos clientes.

## Estado
- 2026-08-11: plano criado. Fases 5.0–5.2 (código) construídas.
- 2026-08-11: **código conferido contra a spec viva da Canva Connect API** —
  OAuth (authorize/token/PKCE/Basic), autofill (`job.result.design.id/url`) e
  export (`job.urls[]`) batem 100%. Nenhum ajuste de shape necessário. Bloqueios
  restantes são só os passos `[VOCÊ]`: registrar o app dev + colar credenciais no
  `.env.local`, rodar a migração 0006, e montar 1 Brand Template por tenant.
