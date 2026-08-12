# Modelos do Canva por cliente — guia self-service

Como criar/ajustar o **modelo (Brand Template)** de cada cliente **sem depender
do dev**. O app preenche esse modelo automaticamente com a copy de cada peça —
você só precisa ter o modelo pronto e o **ID** dele colado na tela do tenant.

---

## Regras de ouro (não quebre)

1. **Os nomes dos campos são FIXOS:** `hook`, `s2`, `s3`, `s4`, `s5`, `s6`, `s7`,
   `cta`. O app envia exatamente esses. Se o modelo não tiver esses campos (ou
   tiver com outro nome), o preenchimento falha.
2. **Nunca apague a caixa de texto de um campo.** Para mudar o visual, **estilize**
   a caixa existente (cor, fonte, tamanho, posição). Apagar e criar outra **perde
   a marcação** do campo.
3. Formato sugerido: **1080×1350** (Instagram retrato). Pode variar, desde que os
   8 campos existam.

---

## Caminho recomendado: duplicar o mestre e trocar a marca

É o jeito mais seguro — os campos já vêm marcados na cópia.

1. Abra o **modelo-mestre**: https://www.canva.com/d/-VcRuKwZM45mCgq
2. **Arquivo → Fazer uma cópia.**
3. Renomeie para algo como `Carrossel — <Cliente>`.
4. **Rebrand — sem apagar as caixas de texto:**
   - **Fundo:** clique no fundo → troque pela cor da marca do cliente.
   - **Texto:** selecione cada caixa → mude fonte / cor / tamanho / posição.
     Só **não apague** a caixa (isso derruba o campo).
   - **Logo / gráficos:** adicione livremente (são decorativos, não precisam de
     marcação).
5. **Publicar como Brand Template:** botão **Compartilhar** (canto superior
   direito) → **"Publicar modelo de marca"** (*Publish as brand template*) →
   confirmar. (Precisa de plano pago — a conta da NExa tem.)
6. **Colar o ID no app:** tela do tenant → seção **"Template do Canva (arte)"** →
   cole o ID → salvar.

---

## O passo do ID (única fricção hoje — leia)

Pegar o **ID que o app usa** (ex.: `EAHSCPMYcB8`) ainda **não é 1 clique** no
Canva. Enquanto não existe um botão no app:

- Peça ao dev/IA: "**lista os templates do Canva**" → devolve o ID do novo em
  segundos.
- **Melhoria planejada:** um botão no app **"Buscar meus templates do Canva"** que
  lista e você escolhe o ID — aí vira 100% self-service, sem chamar ninguém.
  (Vale priorizar.)

---

## Conferir se deu certo

1. No app, gere uma **peça de carrossel** (pra ela ter os campos).
2. Clique **"✨ gerar arte no Canva"**.
3. As imagens devem aparecer preenchidas com a copy.
4. Se aparecer erro de "campo desconhecido", algum nome de campo no modelo está
   diferente de `hook` / `s2`…`s7` / `cta`.

---

## Criar um modelo do zero (avançado)

Dá pra desenhar um layout totalmente novo — mas aí você precisa **marcar cada
caixa de texto como campo de dados** com o nome exato, e essa marcação no editor
do Canva varia conforme o plano/recurso. Por isso, **no dia a dia, duplicar o
mestre é mais seguro e rápido.** Se quiser ir por esse caminho, peça
acompanhamento na primeira vez.

---

## Resumo em 1 linha

Duplica o mestre → troca a marca (sem apagar as caixas) → publica como Brand
Template → cola o ID no tenant → "gerar arte" já sai com a cara do cliente.
