# Conteúdo Engine

Motor de produção de conteúdo multi-tenant. Uma instância, vários tenants.

## Estrutura

```
core/          Skills e templates compartilhados — nunca cita tenant
tenants/       Um diretório por tenant, isolado
scripts/       Onboarding e métricas
```

## Onboarding de novo tenant

```bash
./scripts/new-tenant.sh <slug>
# Preencha tenants/<slug>/tenant.yaml e tenants/<slug>/context.md
```

## Produção

Abra uma sessão do Claude Code na raiz. Informe o tenant. O `CLAUDE.md` carrega
o contexto correto e guia a execução.

## Métricas

```bash
./scripts/metrics.sh
```

Consolida `tenants/*/metricas.csv` e exibe taxa de aprovação e custo por tenant.

## Painéis

Dois geradores de HTML autocontido (Node, sem dependências externas):

```bash
node scripts/painel-interno.js          # painel de controle multi-tenant (uso interno)
node scripts/relatorio-cliente.js leaf  # relatório de resultados de um tenant (para o cliente)
```

O painel interno sai em `painel/index.html` e mostra pipeline, taxa, custo e
alertas de todos os tenants. O relatório do cliente sai em
`tenants/<t>/relatorio.html` e mostra só as entregas e o desempenho daquele
tenant — sem expor custo interno. Ambos são gerados (não versionados) e
respeitam o isolamento: o relatório lê apenas o tenant informado.

## Critério de arquitetura

Onboarding do tenant nº 2 leva menos de uma hora de trabalho técnico.
