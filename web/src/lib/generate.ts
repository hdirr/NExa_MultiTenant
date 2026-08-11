import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const MODEL = "claude-opus-5";
// Preço Opus 5: US$5/M entrada, US$25/M saída.
const custoUsd = (inTok: number, outTok: number) =>
  (inTok / 1e6) * 5 + (outTok / 1e6) * 25;

// Lê a chave Anthropic do tenant (server-only, contorna RLS).
export async function getTenantKey(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("anthropic_key")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data?.anthropic_key ?? null;
}

export async function tenantHasKey(tenantId: string): Promise<boolean> {
  return (await getTenantKey(tenantId)) !== null;
}

// Lê o Brand Template do Canva configurado para o tenant (server-only).
export async function getTenantCanvaTemplate(tenantId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_secrets")
    .select("canva_template_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return data?.canva_template_id ?? null;
}

// Regras duras compartilhadas (do CLAUDE.md + skills).
function regrasDuras(ctx: Ctx, voice: Voice, publicadosTemas: string[]) {
  return `REGRAS INEGOCIÁVEIS (do CLAUDE.md e das skills):
- PROVA: número, case ou depoimento só pode sair da seção "Prova disponível" abaixo. Se não houver prova para sustentar uma afirmação factual, NÃO afirme — mude o ângulo. Nunca invente dados.
- ISOLAMENTO: use apenas as informações deste tenant fornecidas abaixo. Nunca use exemplos, números ou ângulos de outra marca.
- TESTE DO CONCORRENTE: se, trocando o nome da marca por um concorrente, o texto continuar fazendo sentido completo, está genérico demais — refaça. Conteúdo que qualquer marca poderia assinar não serve.
- ANTIRREPETIÇÃO: não repita temas já publicados: ${publicadosTemas.length ? publicadosTemas.join("; ") : "(nenhum ainda)"}.
- PALAVRAS PROIBIDAS (não use nenhuma): ${voice.palavras_proibidas || "(nenhuma listada)"}.

PROVA DISPONÍVEL (fonte ÚNICA de fatos):
${ctx.prova_disponivel || "(vazia — não é permitido afirmar números/cases)"}`;
}

interface Ctx {
  o_que_vende?: string | null;
  para_quem?: string | null;
  dor?: string | null;
  prova_disponivel?: string | null;
  objecoes?: string | null;
  concorrentes?: string | null;
}
interface Voice {
  somos?: string | null;
  nao_somos?: string | null;
  palavras_proibidas?: string | null;
}
interface TenantInfo {
  id: string;
  nome: string;
  objetivo?: string | null;
}

function contextoBloco(ctx: Ctx, voice: Voice, t: TenantInfo) {
  return `TENANT: ${t.nome}
Objetivo de funil: ${t.objetivo || "não definido"}
O que vende: ${ctx.o_que_vende || "—"}
Para quem: ${ctx.para_quem || "—"}
A dor do cliente: ${ctx.dor || "—"}
Objeções: ${ctx.objecoes || "—"}
Concorrentes e diferença: ${ctx.concorrentes || "—"}
Voz — somos: ${voice.somos || "—"} | não somos: ${voice.nao_somos || "—"}`;
}

async function callJSON(
  key: string,
  system: string,
  user: string,
  schema: Record<string, unknown>,
) {
  const client = new Anthropic({ apiKey: key });
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = resp.content.find((b) => b.type === "text");
  const parsed = text && "text" in text ? JSON.parse(text.text) : null;
  const u = resp.usage;
  return {
    parsed,
    usage: {
      input: u.input_tokens ?? 0,
      output: u.output_tokens ?? 0,
      custo: custoUsd(u.input_tokens ?? 0, u.output_tokens ?? 0),
    },
  };
}

// ── Pauta ────────────────────────────────────────────────────────────────────
export async function gerarPauta(
  key: string,
  t: TenantInfo,
  ctx: Ctx,
  voice: Voice,
  publicadosTemas: string[],
) {
  const system = `Você é estrategista de conteúdo da marca "${t.nome}". Proponha temas de pauta específicos e ancorados em prova real.
${regrasDuras(ctx, voice, publicadosTemas)}`;
  const user = `${contextoBloco(ctx, voice, t)}

Proponha exatamente 5 temas de pauta. Para cada um: tema, ângulo específico (que reprove no teste do concorrente), formato sugerido (carrossel, reels ou post) e objetivo de funil. Ângulo genérico como "como reduzir custo" é proibido; seja específico e verificável.`;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      temas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            tema: { type: "string" },
            angulo: { type: "string" },
            formato: { type: "string" },
            objetivo: { type: "string" },
          },
          required: ["tema", "angulo", "formato", "objetivo"],
        },
      },
    },
    required: ["temas"],
  };
  return callJSON(key, system, user, schema);
}

// ── Peça (carrossel / reels / post) ──────────────────────────────────────────
export async function gerarPeca(
  key: string,
  t: TenantInfo,
  ctx: Ctx,
  voice: Voice,
  publicadosTemas: string[],
  tema: string,
  angulo: string,
  formato: string,
) {
  const guia =
    /carrossel/i.test(formato)
      ? `Carrossel de Instagram, 6 a 9 slides: Slide 1 hook (máx 8 palavras, sem pergunta genérica); slides do meio um argumento cada (máx 40 palavras), ancorados em número/exemplo/consequência; penúltimo slide a prova (só de Prova disponível); último slide o CTA coerente com o objetivo.`
      : /reels/i.test(formato)
      ? `Roteiro de Reels: gancho nos primeiros 3 segundos, desenvolvimento curto e falado, uma prova, e CTA coerente com o objetivo. Escreva em blocos de fala curtos.`
      : `Post de LinkedIn: primeira linha que segura a atenção (sem "Você sabia"), corpo com um argumento ancorado em prova, e CTA coerente com o objetivo.`;

  const system = `Você produz conteúdo da marca "${t.nome}" no formato ${formato}.
${guia}
${regrasDuras(ctx, voice, publicadosTemas)}`;
  const user = `${contextoBloco(ctx, voice, t)}

Tema aprovado: ${tema}
Ângulo: ${angulo}

Produza a peça completa em ${formato}. Retorne o texto pronto no campo "conteudo" e um "titulo" curto.`;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      titulo: { type: "string" },
      conteudo: { type: "string" },
    },
    required: ["titulo", "conteudo"],
  };
  return callJSON(key, system, user, schema);
}

// ── Revisão de marca (gate) ──────────────────────────────────────────────────
export async function revisarMarca(
  key: string,
  t: TenantInfo,
  ctx: Ctx,
  voice: Voice,
  publicadosTemas: string[],
  pecaTexto: string,
) {
  const system = `Você é o auditor de marca. Audita a peça contra o checklist e NÃO reescreve — apenas aprova ou bloqueia com justificativa específica.
Checklist (bloqueante se falhar): 1) Prova não consta em Prova disponível; 2) usa palavra proibida; 3) tema repetido (antirrepetição); 4) teste do concorrente (genérico demais) — o mais importante; 5) CTA incoerente com o objetivo.
${regrasDuras(ctx, voice, publicadosTemas)}`;
  const user = `${contextoBloco(ctx, voice, t)}

PEÇA A AUDITAR:
"""
${pecaTexto}
"""

Retorne aprovado (true/false) e a lista de bloqueantes (item do checklist + explicação específica). Se aprovado, bloqueantes vazio.`;
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      aprovado: { type: "boolean" },
      bloqueantes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            item: { type: "string" },
            explicacao: { type: "string" },
          },
          required: ["item", "explicacao"],
        },
      },
    },
    required: ["aprovado", "bloqueantes"],
  };
  return callJSON(key, system, user, schema);
}

// ── Carrossel estruturado (campos p/ autofill do Canva) ──────────────────────
// Devolve os campos nomeados do template: hook, s2..s7, cta.
// Limites de caractere vão no prompt (structured outputs não valida maxLength).
export async function gerarCarrosselCampos(
  key: string,
  t: TenantInfo,
  ctx: Ctx,
  voice: Voice,
  publicadosTemas: string[],
  tema: string,
  angulo: string,
) {
  const system = `Você produz um carrossel de Instagram da marca "${t.nome}" no formato de campos para um template fixo de 8 slides.
Estrutura e LIMITES (respeite à risca, senão o texto estoura o layout):
- hook: gancho da capa, máximo 45 caracteres, sem pergunta genérica.
- s2 a s7: um argumento por slide, ancorado em exemplo/consequência, máximo 220 caracteres cada.
- cta: chamada para ação coerente com o objetivo, máximo 110 caracteres.
${regrasDuras(ctx, voice, publicadosTemas)}`;
  const user = `${contextoBloco(ctx, voice, t)}

Tema aprovado: ${tema}
Ângulo: ${angulo}

Produza o carrossel preenchendo EXATAMENTE os campos hook, s2, s3, s4, s5, s6, s7, cta. Texto pronto para publicar, dentro dos limites de caractere. Se não houver prova para um número, mude o ângulo do slide — nunca invente.`;
  const props = ["hook", "s2", "s3", "s4", "s5", "s6", "s7", "cta"];
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(props.map((p) => [p, { type: "string" }])),
    required: props,
  };
  return callJSON(key, system, user, schema);
}

export { custoUsd };
