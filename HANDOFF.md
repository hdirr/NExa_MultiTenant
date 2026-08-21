# Handoff — Conteúdo Engine

> **Atualização 2026-08-21 — Interface sem digitação + arte completa no Canva +
> imagens IA.** Forms viraram escolhas prontas (checkbox/seleção/ideias
> clicáveis que preenchem e seguem editáveis); campos cruciais vazios ficam
> vermelhos na página do tenant e nas linhas da produção. Ao gerar um carrossel
> aprovado pela revisão de marca, o app sozinho preenche o Brand Template no
> Canva — textos + imagens geradas por IA (Gemini "Nano Banana",
> ~US$0,04/imagem) — move para a pasta do cliente e exporta os PNGs. Cliente
> aprova em 1 clique; reprovação é só marcar motivos prontos. Detalhes e
> ferramentas/preços em [`web/IMAGENS-IA.md`](web/IMAGENS-IA.md). Migrações
> novas: `0008_image_key.sql` (chave de imagem por tenant).
>
> **Rodar o app:** `cd web && npm install && npm run dev` → http://localhost:3000.
> **Pendências:** rodar migração 0008; configurar chave Gemini (tela do tenant
> ou env `GEMINI_API_KEY`) e marcar campos de imagem no Brand Template;
> deploy na Vercel.
>
> **Atualização 2026-08-09 — App web (SaaS) em `web/`.** O projeto evoluiu de
> engine em git para um **aplicativo multi-tenant** (Next.js 16 + Supabase +
> Vercel). Fases 0–4 construídas: login/RLS, dashboards, gestão de tenants,
> aprovação online e geração por IA no app (Modelo A: chave Anthropic por
> tenant). Detalhes, setup e deploy em [`web/SETUP.md`](web/SETUP.md); migrações
> em `web/supabase/migrations/0001..0005.sql`.
>
> O restante deste documento descreve o **engine de conteúdo** original (skills
> em markdown + scripts), que continua sendo a fonte das regras portadas para o
> app.

---


Documento de transferência. Explica o que é o projeto, como está organizado,
como operar e qual o estado atual. Leia isto antes de mexer no repositório.

## O que é

Motor de produção de conteúdo **multi-tenant**: uma única instância (um repo,
um `CLAUDE.md`) atende várias marcas (tenants), com **isolamento duro** entre
elas. Nenhuma informação de um tenant pode vazar para a produção de outro —
dois tenants podem ser concorrentes diretos.

A operação acontece dentro de uma sessão do Claude Code aberta na raiz do repo.
O `CLAUDE.md` é o cérebro: ele carrega o contexto do tenant certo e impõe as
regras de produção.

## Estrutura

```
CLAUDE.md          Regras de tenant, isolamento e produção (lido em toda sessão)
README.md          Visão geral e comandos
HANDOFF.md         Este documento

core/              Compartilhado entre todos os tenants — NUNCA cita um tenant
  docs/
    operacao.md    Ciclo padrão de produção passo a passo
  skills/
    pauta/                 Geração de temas, com antirrepetição e checkpoint
    carrossel-instagram/   Carrossel — 4 formas de hook
    roteiro-reels/         Reels — gancho de 3s, saída em tabela
    post-linkedin/         LinkedIn — regras de 1ª linha e hashtags
    revisao-marca/         Checklist de 6 bloqueantes (roda antes de cada entrega)
  templates/
    tenant.yaml.template
    context.template.md
    voice.template.md

tenants/           Um diretório isolado por tenant
  leaf/            Único tenant existente hoje
    tenant.yaml           Config do tenant (janela antirrepetição, etc.)
    context.md            Contexto da marca — § Prova disponível é a fonte única de prova
    voice.md              Tom de voz e jargão do tenant
    calibracao.md         Log de reprovações e regras criadas
    metricas.csv          Métricas de produção
    pauta/
      backlog.md          Temas propostos
      publicados.md       Temas já publicados (base da antirrepetição)

scripts/
  new-tenant.sh          Onboarding de um novo tenant a partir dos templates
  metrics.sh             Consolida tenants/*/metricas.csv (taxa de aprovação e custo)
  painel-interno.js      Gera o painel de controle multi-tenant (uso interno)
  relatorio-cliente.js   Gera o relatório de resultados de um tenant (para o cliente)
  lib/painel-comum.js    Biblioteca compartilhada dos geradores (leitura + layout HTML)
```

## Regras inegociáveis (do CLAUDE.md)

1. **Tenant explícito.** Toda produção começa com um tenant nomeado. Se não for
   informado, o assistente pergunta — nunca assume.
2. **Isolamento duro.** Proibido usar exemplos, números, ângulos ou copy de um
   tenant ao produzir para outro. Ao trabalhar num tenant, só se lê o diretório
   daquele tenant.
3. **Fronteira core/tenant.** `core/` nunca menciona nome de tenant. Regra
   aprendida num tenant que valha para qualquer marca deve ser **promovida** ao
   core e registrada em `calibracao.md`.
4. **Prova controlada.** Número, case ou depoimento só sai de
   `context.md § Prova disponível`. Sem prova, muda-se o ângulo — não se inventa.
5. **Nunca publicar.** A entrega termina em
   `tenants/<t>/output/AAAA-MM-DD/<slug>/`. Publicação é ação humana.
6. **Antirrepetição.** Tema em `publicados.md` dentro da janela configurada em
   `tenant.yaml` é reprovado.
7. **Revisão de marca obrigatória.** Toda peça passa pela skill `revisao-marca`
   antes da entrega.
8. **Checkpoints** de aprovação após (a) pauta, (b) roteiro, (c) arte.

## Ciclo padrão de produção

1. Informe o tenant ao abrir a sessão.
2. Peça a skill `pauta` — revise e aprove os temas.
3. Para cada tema aprovado, peça a skill do formato (`carrossel-instagram`,
   `roteiro-reels` ou `post-linkedin`).
4. Aguarde o checkpoint de roteiro — aprove antes de prosseguir.
5. A `revisao-marca` roda antes de cada entrega.
6. Copie o output aprovado para `tenants/<t>/output/AAAA-MM-DD/<slug>/`.
7. Registre em `metricas.csv` e em `pauta/publicados.md` após publicação.

## Adicionar um novo tenant

```bash
./scripts/new-tenant.sh <slug>
```

O slug aceita apenas letras minúsculas, números e hífen. Depois:

- Preencha `tenants/<slug>/tenant.yaml` (todos os campos obrigatórios)
- Preencha `tenants/<slug>/context.md` (especialmente § Prova disponível)
- Preencha `tenants/<slug>/voice.md` (§ Jargão deste tenant)

Critério de arquitetura: onboarding do tenant nº 2 deve levar menos de uma hora
de trabalho técnico.

## Métricas

```bash
./scripts/metrics.sh
```

Consolida os `metricas.csv` de todos os tenants e exibe, por tenant, a taxa da
última rodada, taxa geral, custo por peça aprovada e número de rodadas.

## Painéis (HTML)

Dois geradores em Node (sem dependências externas), que leem os arquivos dos
tenants e produzem HTML autocontido:

```bash
node scripts/painel-interno.js          # -> painel/index.html   (uso interno)
node scripts/relatorio-cliente.js leaf  # -> tenants/leaf/relatorio.html (cliente)
```

- **Painel interno** — visão do operador: todos os tenants, pipeline, peças
  aguardando aprovação, taxa, custo/peça e alertas (inclui "context.md
  incompleto"). Pode agregar vários tenants porque é uso interno — a regra de
  isolamento vale para *produção de conteúdo*, não para a gestão.
- **Relatório do cliente** — um tenant por vez: peças entregues e desempenho.
  **Não expõe custo interno.** Lê apenas o tenant informado (isolamento).

Os HTMLs gerados não são versionados (`.gitignore`); regenere quando precisar.
Para um link compartilhável ou PDF, abra o HTML no navegador e imprima, ou peça
para publicar como artefato.

## Estado atual

- Estrutura completa: `CLAUDE.md`, 5 skills, 3 templates, 2 scripts.
- **Um tenant real**: `leaf` (o tenant de teste foi removido no commit
  `3099fe6`). Verifique se as seções obrigatórias de `context.md` estão
  preenchidas antes de produzir.
- Ambiente de operação: Windows. Os scripts são bash (`.sh`) — rode via Git Bash
  ou WSL.

## Nota de ambiente

Os scripts usam bash. No Windows, execute-os pelo **Git Bash** ou **WSL**, não
pelo PowerShell direto.
