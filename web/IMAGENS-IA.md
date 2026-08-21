# Fase 6 — Imagens de IA nos slides (plano + implementação)

Objetivo: cada peça de carrossel chega no Canva com **imagens únicas geradas por
IA** nos campos de imagem do Brand Template — além dos textos que já são
preenchidos hoje. A arte sai completa: template (visual da marca) + textos +
imagens novas.

---

## Ferramentas avaliadas (pesquisa 08/2026)

### Pagas (API, por imagem)

| Ferramenta | Preço/imagem | Observações |
|---|---|---|
| **Gemini 2.5 Flash Image ("Nano Banana", Google)** ✅ escolhida | **$0,039** (batch $0,0195) | Melhor custo/benefício; ótima fidelidade de prompt e renderização de texto; API simples. Imagen 4 (antecessora) desliga em 17/08/2026 — não usar. |
| FLUX.1 Kontext [pro] (fal.ai) | $0,04 | Empate técnico com Nano Banana; fal é o provedor mais rápido/barato (BFL direto e Replicate cobram $0,055). Kontext Max: $0,08. |
| Seedream V4 (fal.ai) | $0,03 | Alternativa barata boa. |
| OpenAI gpt-image-1 | $0,011–0,25 | Barata só na qualidade baixa; média ~$0,042–0,063; alta $0,167–0,25. gpt-image-2 ainda instável na API. |
| Stability AI | $0,025–0,08 | Stable Image Core $0,03; SD3.5 Large Turbo $0,04; Ultra $0,08. |

### Open source (self-host)

| Modelo | Licença | Custo real |
|---|---|---|
| **Qwen-Image / 2512 / 2.0** ✅ melhor opção OSS | **Apache 2.0** (comercial livre) | Só a GPU: RTX 4090/A40 em RunPod ~US$ 0,35–0,70/h → fração de centavo por imagem em lote. 20B parâmetros (precisa quantização p/ 24 GB). |
| FLUX.1 [schnell] | Apache 2.0 | Rápido e livre; qualidade inferior ao dev/pro. |
| FLUX.1 [dev] | Pesos abertos, **licença NÃO-comercial** | Uso comercial exige licença mensal da BFL (com usage tracking). |
| SDXL / SD 3.5 | Community License da Stability | Grátis até limite de receita anual; enterprise acima disso. |

**Regra de decisão**: até ~10 mil imagens/mês, API paga (Nano Banana) — simples e
barato (≤ US$ 390/mês). Acima disso, self-host do Qwen-Image compensa.

## Decisões

1. **Provedor inicial**: Gemini 2.5 Flash Image via REST (`lib/imagens.ts`).
   Trocar de provedor depois = reescrever um único módulo.
2. **Modelo de conta**: igual à chave Anthropic (Model A) — chave **por tenant**
   em `tenant_secrets.image_api_key`, com fallback da agência
   (`GEMINI_API_KEY` no env). Quem consome imagem paga a própria.
3. **Prompts de imagem**: saem na MESMA chamada Anthropic que gera o carrossel
   (`gerarCarrosselCampos` agora retorna `imagens[3]`: capa, meio, CTA). Zero
   chamadas extras = zero custo extra de texto.
4. **Inserção no Canva**: os prompts viram imagens → upload como asset
   (`POST /asset-uploads`) → autofill `{type:"image", asset_id}` nos campos de
   imagem detectados via `GET /brand-templates/{id}/dataset`.
5. **Custo nas métricas**: `metrics.custo_usd` passa a incluir
   `n_imagens × US$0,039` das artes geradas automaticamente.

## Contrato atualizado do template (por tenant)

- Texto (igual antes): `hook` ≤45 car · `s2`…`s7` ≤220 · `cta` ≤110.
- **Novo — imagem**: 1 a 3 campos marcados como *image* no dataset do Brand
  Template (ex.: `img_capa`, `img_meio`, `img_cta`). Recebem as imagens geradas
  em ordem alfabética do nome do campo.

## Fases

- [x] **6.0 Migração `0008_image_key.sql`** — coluna `image_api_key` em
      `tenant_secrets`. RODAR no Supabase.
- [x] **6.1 `lib/imagens.ts`** — `gerarImagem()` (Nano Banana, PNG quadrado) +
      constante de custo.
- [x] **6.2 Prompts na geração** — `gerarCarrosselCampos` retorna `imagens[3]`;
      peça salva `conteudo.imagens`.
- [x] **6.3 Canva** — `datasetDoTemplate()`, `uploadAsset()` (job + poll),
      `autofillCarrossel()` aceita campo→asset_id.
- [x] **6.4 Fluxo** — `gerarArteDaPeca()` gera 1 imagem IA por campo de imagem
      do template (best-effort: sem chave ou falha → arte sai só com texto);
      custo vai para as métricas.
- [x] **6.5 UI** — seção "Chave de imagem (IA)" na página do tenant.
- [ ] `[VOCÊ]` Rodar migração 0008 + colar a chave Gemini (do tenant ou
      `GEMINI_API_KEY` no `.env.local`) + garantir que o Brand Template tem
      campos de imagem marcados (app Data autofill do Canva).

## Estado

- 2026-08-21: plano pesquisado (preços conferidos nas fontes oficiais) e
  fases 6.0–6.5 implementadas. Pendências só operacionais `[VOCÊ]`.

## Notas de risco

- Autofill do Canva exige Canva **Enterprise** para produção (trial enquanto em
  desenvolvimento — ver docs Connect API).
- Falha pontual de imagem não bloqueia a peça: arte sai com texto e o design
  continua sendo gerado.
