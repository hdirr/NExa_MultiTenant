---
name: pauta
description: Propõe 5 temas de conteúdo para o tenant ativo, com ângulo, formato e objetivo de funil, descartando automaticamente temas dentro da janela antirrepetição.
---

# Skill: pauta

## Quando usar

No início de cada ciclo de produção, antes de gerar qualquer peça.

## Entradas necessárias

- `tenants/<t>/context.md` — o que vende, para quem, provas disponíveis
- `tenants/<t>/tenant.yaml` — canais, objetivo, janela antirrepetição
- `tenants/<t>/pauta/publicados.md` — temas já publicados
- `tenants/<t>/pauta/backlog.md` — ideias em espera (consultar, não obrigar)

## Processo

1. Leia `publicados.md` e identifique quais temas estão dentro da janela
   de `janela_antirepeticao_dias`. Esses temas estão bloqueados.
2. Leia `context.md` e extraia ângulos genuínos: dor do cliente, prova
   disponível, objeções, diferenciais verificáveis.
3. Consulte `backlog.md` — se houver ideias com status "pendente", priorize-as
   antes de propor temas novos.
4. Proponha exatamente 5 temas. Para cada um:
   - Verifique que não colide com nenhum tema bloqueado
   - Verifique que existe prova ou ângulo em `context.md` para sustentá-lo
   - Escolha o formato mais adequado entre os disponíveis no `tenant.yaml`
   - Alinhe o objetivo de funil com `objetivo` do `tenant.yaml`

## Saída

```
## Pauta — <Tenant> — <data>

| # | Tema | Ângulo | Formato | Objetivo de funil | Observação |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |

---
**Checkpoint (a):** Aprove os temas antes de prosseguir para produção.
Informe quais números produzir e em que ordem.
```

## Regras

- Nunca propor tema que dependa de prova não presente em `context.md`
- Nunca repetir tema dentro da janela antirrepetição
- Se `publicados.md` indicar baixo desempenho em determinado formato,
  reduzir sua frequência nas sugestões
- Ângulo deve ser específico o suficiente para reprovar no teste do
  concorrente — "como reduzir custo" é genérico; "como nosso cliente X
  reduziu custo em Y% fazendo Z" é específico (se a prova existir)
