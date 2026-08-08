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

## Critério de arquitetura

Onboarding do tenant nº 2 leva menos de uma hora de trabalho técnico.
