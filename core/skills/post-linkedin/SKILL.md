---
name: post-linkedin
description: Produz post para LinkedIn com primeira linha otimizada para o clique em "ver mais", parágrafos curtos e máximo 3 hashtags no fim.
---

# Skill: post-linkedin

## Quando usar

Após aprovação do tema na pauta, quando o formato definido for `post` no
canal `linkedin`.

## Entradas necessárias

- Tema e ângulo aprovados na pauta
- `tenants/<t>/context.md` — provas, dor, diferencial
- `tenants/<t>/voice.md` — tom e palavras proibidas
- `tenants/<t>/tenant.yaml` — objetivo (define o encerramento)

## Regras de formato

### Primeira linha — crítica

O LinkedIn trunca o post em ~200 caracteres, exibindo apenas a primeira
linha com o botão "ver mais". A primeira linha **precisa** gerar o clique.

Critérios:
- Deve criar tensão, curiosidade ou revelar um custo — sozinha, sem o restante
- Não pode ser uma introdução ("Hoje vou falar sobre...")
- Não pode ser uma pergunta genérica
- Não termina com dois pontos (não adianta o truncamento se a linha
  anuncia o que vem)

Teste: leia apenas a primeira linha. Você clicaria em "ver mais"? Se não, reescreva.

### Corpo

- Parágrafos de 1 a 2 linhas
- Uma ideia por parágrafo
- Progressão: cada parágrafo aprofunda ou contrasta o anterior
- Dados e afirmações apenas de `context.md` § Prova disponível

### Encerramento

- Uma linha de reflexão ou CTA alinhado com `objetivo` de `tenant.yaml`
- Espaço em branco antes das hashtags

### Hashtags

- Máximo 3
- No fim do post, após linha em branco
- Relevantes para o tema — nunca genéricas (#marketing, #negocios)

## Saída

```
## Post LinkedIn — <Tema> — <Tenant>

[primeira linha — sem "ver mais" ainda resolve]

[parágrafo 1]

[parágrafo 2]

[parágrafo 3, se necessário]

[encerramento / CTA]

#hashtag1 #hashtag2 #hashtag3

---
**Checkpoint (b):** Aguarde aprovação do texto antes de publicar.
```

## Antes de entregar

Execute a skill `revisao-marca` nesta peça.
