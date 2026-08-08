---
name: carrossel-instagram
description: Produz um carrossel de Instagram de 6 a 9 slides para o tema aprovado na pauta, seguindo estrutura de hook, argumentos ancorados, prova e CTA.
---

# Skill: carrossel-instagram

## Quando usar

Após aprovação do tema na pauta, quando o formato definido for `carrossel`.

## Entradas necessárias

- Tema e ângulo aprovados na pauta
- `tenants/<t>/context.md` — provas, dor, diferencial
- `tenants/<t>/voice.md` — tom e palavras proibidas
- `tenants/<t>/tenant.yaml` — objetivo (define o CTA)

## Estrutura dos slides

### Slide 1 — Hook (máximo 8 palavras)

Escolha **uma** das quatro formas. Nunca pergunta genérica.

| Forma | Exemplo de estrutura |
|---|---|
| Tensão | "[Situação ruim] que [maioria faz / ninguém percebe]" |
| Custo oculto | "O que [ação comum] custa sem você perceber" |
| Número específico | "[N]% das [pessoas/empresas] [fato surpreendente]" |
| Erro comum | "O erro que [consequência concreta]" |

O hook deve funcionar sem contexto adicional — alguém que nunca ouviu falar
do tenant deve entender o problema imediatamente.

### Slides 2 a N-2 — Argumentos (máximo 40 palavras por slide)

- Um argumento por slide
- Cada argumento ancorado em: número concreto, exemplo verificável OU consequência tangível
- Progressão lógica: cada slide deve depender do anterior (evitar slides intercambiáveis)
- Não repetir o mesmo tipo de âncora em slides consecutivos

### Slide N-1 — Prova

- Exclusivamente dados de `context.md` § Prova disponível
- Se não houver prova adequada para o tema: pare e sinalize antes de continuar

### Slide N — CTA

Coerente com `objetivo` de `tenant.yaml`:

| Objetivo | CTA adequado |
|---|---|
| lead | "Fale com a gente", "Solicite uma análise" |
| autoridade | "Salve este post", "Compartilhe com quem precisa" |
| educacao | "Siga para mais", "Veja o próximo post sobre X" |
| retencao | "Responda nos comentários", "Qual é a sua experiência?" |

## Saída

```
## Carrossel — <Tema> — <Tenant>

**Slide 1 (hook)**
[texto — máx 8 palavras]

**Slide 2**
[texto — máx 40 palavras]
[âncora: número | exemplo | consequência]

...

**Slide N-1 (prova)**
[dado de context.md § Prova disponível]
[fonte: context.md]

**Slide N (CTA)**
[texto do CTA]

---
**Checkpoint (b):** Aguarde aprovação do roteiro antes de prosseguir.
```

## Antes de entregar

Execute a skill `revisao-marca` nesta peça.
