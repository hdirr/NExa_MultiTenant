---
name: roteiro-reels
description: Produz roteiro de Reels de 20 a 45 segundos para o tema aprovado, com gancho nos primeiros 3 segundos e saída em tabela tempo/fala/ação em tela.
---

# Skill: roteiro-reels

## Quando usar

Após aprovação do tema na pauta, quando o formato definido for `reels`.

## Entradas necessárias

- Tema e ângulo aprovados na pauta
- `tenants/<t>/context.md` — provas, dor, diferencial
- `tenants/<t>/voice.md` — tom e palavras proibidas
- `tenants/<t>/tenant.yaml` — objetivo (define o encerramento)

## Restrições de formato

- Duração total: 20 a 45 segundos
- Máximo 2 a 3 pontos no conteúdo principal
- Gancho falado nos primeiros 3 segundos — deve funcionar **sem imagem**
  (usuário pode estar com o som ligado antes de ver a tela)

## Estrutura

### Gancho (0–3 s)

Uma frase que cria tensão ou curiosidade imediata.
Teste: se o usuário ouvir apenas esta frase pelo alto-falante, sem ver a tela,
ele vai parar para assistir? Se não, reescreva.

Não use introduções ("Oi, tudo bem?", "Hoje eu vou falar sobre...").

### Desenvolvimento (4 s – até 5 s antes do fim)

2 a 3 pontos concisos. Cada ponto deve:
- Ter uma ação em tela correspondente (texto, gráfico, corte)
- Conectar com o ângulo aprovado na pauta
- Ser verificável por `context.md` se envolver dados

### Encerramento (últimos 5 s)

CTA alinhado com `objetivo` de `tenant.yaml` (mesma tabela da skill
`carrossel-instagram`).

## Saída

```
## Roteiro Reels — <Tema> — <Tenant>

Duração estimada: XX s

| Tempo | Fala | Ação em tela |
|---|---|---|
| 0–3 s | [gancho falado] | [legenda / corte / texto sobreposto] |
| 4–X s | [ponto 1] | [...] |
| X–Y s | [ponto 2] | [...] |
| Y–Z s | [ponto 3, se houver] | [...] |
| Z s–fim | [CTA falado] | [texto CTA na tela] |

---
**Checkpoint (b):** Aguarde aprovação do roteiro antes de gravar.
```

## Antes de entregar

Execute a skill `revisao-marca` nesta peça.
