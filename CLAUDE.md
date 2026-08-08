# Conteúdo Engine

## Resolução de tenant

Toda tarefa de produção começa com um tenant explícito.
Se o tenant não foi informado, PERGUNTE. Nunca assuma.

Ao trabalhar para um tenant:
1. Carregue `tenants/<t>/tenant.yaml`, `context.md`, `voice.md`,
   `pauta/publicados.md`, `calibracao.md`
2. Carregue as skills de `core/skills/`
3. NÃO leia nenhum arquivo de `tenants/` que não seja o tenant ativo

## Isolamento — regra dura

É proibido usar informação de um tenant ao produzir para outro.
Isso inclui: exemplos, números, ângulos de pauta, formulações de copy.
Dois tenants podem ser concorrentes diretos.
Se precisar de referência, use apenas o `context.md` do tenant ativo.

## Fronteira core / tenant

- `core/` nunca menciona nome de tenant. Se for citar, é sinal de que a
  regra pertence ao tenant.
- Regra aprendida num tenant que valha para qualquer marca DEVE ser
  promovida para `core/`. Registre a promoção em `calibracao.md`.

## Regras fixas de produção

- Prova (número, case, depoimento) só sai de `context.md` § Prova disponível.
  Fora disso: não afirme. Se faltar prova, mude o ângulo da peça.
- Nunca publicar. Entrega termina em `tenants/<t>/output/AAAA-MM-DD/<slug>/`.
- Tema presente em `publicados.md` dentro da janela antirrepetição: reprovado.
- Toda peça passa pela skill `revisao-marca` antes da entrega.
- Se `context.md` estiver vazio nas seções obrigatórias, pare e avise.

## Checkpoints

Pare e peça aprovação depois de: (a) pauta, (b) roteiro, (c) arte.
Nota: checkpoints são convenção de prompt, não gate de permissão do sistema.
Nunca execute ação irreversível apoiado apenas neles.
