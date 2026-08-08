---
name: revisao-marca
description: Audita uma peça de conteúdo contra os critérios de qualidade e isolamento do tenant antes da entrega. Não reescreve — apenas bloqueia ou aprova com justificativa.
---

# Skill: revisao-marca

## Quando usar

Antes de qualquer entrega. Toda peça passa por aqui. É o último gate.

## Entradas necessárias

- A peça a ser auditada (texto completo)
- `tenants/<t>/context.md` — fonte única de prova
- `tenants/<t>/voice.md` — lista de palavras proibidas
- `tenants/<t>/tenant.yaml` — objetivo e janela antirrepetição
- `tenants/<t>/pauta/publicados.md` — histórico de temas

## Checklist de auditoria

Execute cada item na ordem. Ao encontrar o primeiro bloqueante, registre e
continue verificando os demais para reportar todos de uma vez.

| # | Verificação | Bloqueante se… |
|---|---|---|
| 1 | **Prova** | Número, case ou depoimento não consta em `context.md` § Prova disponível |
| 2 | **Palavras proibidas** | Qualquer termo de `voice.md` § Palavras proibidas aparece na peça |
| 3 | **Antirrepetição** | Tema tratado em `publicados.md` dentro de `janela_antirepeticao_dias` |
| 4 | **Assuntos proibidos** | Tema em `restricoes.assuntos_proibidos` de `tenant.yaml` |
| 5 | **Teste do concorrente** | Trocando o nome do tenant por qualquer concorrente, o texto continua fazendo sentido completo — se sim, está genérico demais |
| 6 | **Coerência de CTA** | CTA não corresponde ao `objetivo` definido em `tenant.yaml` |

O item 5 é o critério mais importante. Conteúdo que qualquer marca poderia
assinar é conteúdo que não serve.

## Saída

### Se aprovada

```
✓ APROVADO

Revisão concluída. Nenhum bloqueante identificado.
```

### Se reprovada

```
✗ REPROVADO

Bloqueantes encontrados:

[#] <item> — <explicação específica do problema>
[#] ...

Não entregue esta peça. Corrija os pontos acima e reenvie para revisão.
```

## Notas

- Esta skill audita, não sugere reformulação. A correção é responsabilidade
  de quem executa a skill de produção.
- Se `context.md` § Prova disponível estiver vazio e a peça contiver
  afirmações factuais, o item 1 bloqueia automaticamente.
- O teste do concorrente (item 5) deve ser feito mentalmente: leia a peça
  substituindo o nome do tenant. Se o sentido se mantiver, a peça falhou.
