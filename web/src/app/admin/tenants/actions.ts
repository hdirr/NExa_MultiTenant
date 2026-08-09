"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/auth";
import {
  getTenantKey,
  gerarPauta,
  gerarPeca,
  revisarMarca,
} from "@/lib/generate";

const s = (fd: FormData, k: string) => (fd.get(k) as string | null)?.trim() ?? "";

async function requireAdmin() {
  const sp = await getSessionProfile();
  if (!sp || sp.role !== "admin") throw new Error("não autorizado");
}

export async function createTenant(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug").toLowerCase();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error("slug inválido: use apenas letras minúsculas, números e hífen");
  }
  const supabase = await createClient();
  const { error } = await supabase.from("tenants").insert({
    slug,
    nome_exibicao: s(formData, "nome_exibicao") || slug,
    status: s(formData, "status") || "ativo",
    objetivo: s(formData, "objetivo") || null,
    aprovador: s(formData, "aprovador") || null,
    negocio_vende: s(formData, "negocio_vende") || null,
    negocio_publico: s(formData, "negocio_publico") || null,
    negocio_dor: s(formData, "negocio_dor") || null,
    negocio_diferencial: s(formData, "negocio_diferencial") || null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  redirect(`/admin/tenants/${slug}`);
}

export async function updateTenant(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      nome_exibicao: s(formData, "nome_exibicao"),
      status: s(formData, "status"),
      objetivo: s(formData, "objetivo") || null,
      aprovador: s(formData, "aprovador") || null,
      negocio_vende: s(formData, "negocio_vende") || null,
      negocio_publico: s(formData, "negocio_publico") || null,
      negocio_dor: s(formData, "negocio_dor") || null,
      negocio_diferencial: s(formData, "negocio_diferencial") || null,
    })
    .eq("slug", slug);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/tenants/${slug}`);
  revalidatePath("/admin");
}

export async function upsertContext(formData: FormData) {
  await requireAdmin();
  const tenantId = s(formData, "tenant_id");
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_context").upsert(
    {
      tenant_id: tenantId,
      o_que_vende: s(formData, "o_que_vende") || null,
      para_quem: s(formData, "para_quem") || null,
      dor: s(formData, "dor") || null,
      prova_disponivel: s(formData, "prova_disponivel") || null,
      objecoes: s(formData, "objecoes") || null,
      concorrentes: s(formData, "concorrentes") || null,
      referencias: s(formData, "referencias") || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
  revalidatePath("/admin");
}

export async function upsertVoice(formData: FormData) {
  await requireAdmin();
  const tenantId = s(formData, "tenant_id");
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_voice").upsert(
    {
      tenant_id: tenantId,
      somos: s(formData, "somos") || null,
      nao_somos: s(formData, "nao_somos") || null,
      palavras_proibidas: s(formData, "palavras_proibidas") || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

export async function addChannel(formData: FormData) {
  await requireAdmin();
  const tenantId = s(formData, "tenant_id");
  const slug = s(formData, "slug");
  const formatos = s(formData, "formatos")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const freq = s(formData, "frequencia_semanal");
  const supabase = await createClient();
  const { error } = await supabase.from("channels").insert({
    tenant_id: tenantId,
    rede: s(formData, "rede"),
    handle: s(formData, "handle") || null,
    formatos,
    frequencia_semanal: freq ? Number(freq) : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

export async function deleteChannel(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("channels").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

const n = (fd: FormData, k: string) => {
  const v = parseFloat(s(fd, k).replace(",", "."));
  return isNaN(v) ? 0 : v;
};

function revalidateProducao(slug: string) {
  revalidatePath(`/admin/tenants/${slug}/producao`);
  revalidatePath("/admin");
}

// ── Pauta ───────────────────────────────────────────────────────────────────
export async function addPauta(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("pauta_items").insert({
    tenant_id: s(formData, "tenant_id"),
    tema: s(formData, "tema"),
    angulo: s(formData, "angulo") || null,
    formato: s(formData, "formato") || null,
    objetivo: s(formData, "objetivo") || null,
    status: s(formData, "status") || "backlog",
  });
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function updatePautaStatus(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pauta_items")
    .update({ status: s(formData, "status") })
    .eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function deletePauta(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("pauta_items").delete().eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

// ── Publicados ───────────────────────────────────────────────────────────────
export async function addPublished(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("published").insert({
    tenant_id: s(formData, "tenant_id"),
    data: s(formData, "data") || null,
    tema: s(formData, "tema") || null,
    formato: s(formData, "formato") || null,
    canal: s(formData, "canal") || null,
    link: s(formData, "link") || null,
    desempenho: s(formData, "desempenho") || null,
  });
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function deletePublished(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("published").delete().eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

// ── Métricas ─────────────────────────────────────────────────────────────────
export async function addMetric(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("metrics").insert({
    tenant_id: s(formData, "tenant_id"),
    data: s(formData, "data") || null,
    formato: s(formData, "formato") || null,
    pecas_geradas: n(formData, "pecas_geradas"),
    pecas_aprovadas: n(formData, "pecas_aprovadas"),
    tokens_entrada: n(formData, "tokens_entrada"),
    tokens_saida: n(formData, "tokens_saida"),
    custo_usd: n(formData, "custo_usd"),
    minutos_ciclo: n(formData, "minutos_ciclo"),
  });
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function deleteMetric(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("metrics").delete().eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

// ── Peças ────────────────────────────────────────────────────────────────────
export async function addPiece(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("pieces").insert({
    tenant_id: s(formData, "tenant_id"),
    titulo: s(formData, "titulo"),
    formato: s(formData, "formato") || null,
    conteudo: s(formData, "conteudo") ? { texto: s(formData, "conteudo") } : null,
    status: "rascunho",
  });
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function sendPieceForApproval(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pieces")
    .update({ status: "aguardando_aprovacao" })
    .eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
  revalidatePath("/admin");
}

export async function deletePiece(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("pieces").delete().eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
  revalidatePath("/admin");
}

// ── Usuários-cliente (usa a Secret key via admin client) ─────────────────────
export async function createClientUser(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const email = s(formData, "email").toLowerCase();
  const password = s(formData, "password");
  const nome = s(formData, "nome") || email;
  if (!email || password.length < 6) {
    throw new Error("Informe e-mail e uma senha de pelo menos 6 caracteres.");
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nome },
  });
  if (error) throw new Error(error.message);
  const uid = created.user.id;

  // Garante perfil como cliente e associa ao tenant.
  await admin.from("profiles").update({ full_name: nome, role: "client" }).eq("id", uid);
  const { error: mErr } = await admin
    .from("tenant_members")
    .insert({ tenant_id: tenantId, profile_id: uid });
  if (mErr) throw new Error(mErr.message);

  revalidatePath(`/admin/tenants/${slug}`);
}

export async function removeMember(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const profileId = s(formData, "profile_id");
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_members")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

// ── IA (Fase 4) ──────────────────────────────────────────────────────────────
export async function setTenantKey(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const key = s(formData, "anthropic_key");
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_secrets")
    .upsert(
      { tenant_id: tenantId, anthropic_key: key || null, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

// Carrega o contexto isolado do tenant para os prompts de IA.
async function carregarContexto(tenantId: string) {
  const supabase = await createClient();
  const [{ data: tenant }, { data: ctx }, { data: voice }, { data: pubs }] =
    await Promise.all([
      supabase.from("tenants").select("id, nome_exibicao, objetivo").eq("id", tenantId).single(),
      supabase.from("tenant_context").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenant_voice").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("published").select("tema").eq("tenant_id", tenantId),
    ]);
  return {
    t: { id: tenantId, nome: tenant?.nome_exibicao ?? "", objetivo: tenant?.objetivo },
    ctx: ctx ?? {},
    voice: voice ?? {},
    publicadosTemas: (pubs ?? []).map((p) => p.tema).filter(Boolean) as string[],
  };
}

async function logMetric(
  tenantId: string,
  formato: string,
  geradas: number,
  aprovadas: number,
  usage: { input: number; output: number; custo: number },
) {
  const admin = createAdminClient();
  await admin.from("metrics").insert({
    tenant_id: tenantId,
    data: new Date().toISOString().slice(0, 10),
    formato,
    pecas_geradas: geradas,
    pecas_aprovadas: aprovadas,
    tokens_entrada: usage.input,
    tokens_saida: usage.output,
    custo_usd: usage.custo,
    minutos_ciclo: 0,
  });
}

export async function generatePautaAI(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const key = await getTenantKey(tenantId);
  if (!key) throw new Error("Configure a chave Anthropic deste tenant antes de gerar.");

  const { t, ctx, voice, publicadosTemas } = await carregarContexto(tenantId);
  const { parsed, usage } = await gerarPauta(key, t, ctx, voice, publicadosTemas);
  const temas: { tema: string; angulo: string; formato: string; objetivo: string }[] =
    parsed?.temas ?? [];

  const admin = createAdminClient();
  if (temas.length) {
    await admin.from("pauta_items").insert(
      temas.map((x) => ({
        tenant_id: tenantId,
        tema: x.tema,
        angulo: x.angulo,
        formato: x.formato,
        objetivo: x.objetivo,
        status: "backlog",
      })),
    );
  }
  await logMetric(tenantId, "pauta", temas.length, 0, usage);
  revalidatePath(`/admin/tenants/${slug}/producao`);
  revalidatePath("/admin");
}

export async function generatePieceAI(formData: FormData) {
  await requireAdmin();
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const pautaId = s(formData, "pauta_id");
  const key = await getTenantKey(tenantId);
  if (!key) throw new Error("Configure a chave Anthropic deste tenant antes de gerar.");

  const supabase = await createClient();
  const { data: pauta } = await supabase
    .from("pauta_items")
    .select("tema, angulo, formato")
    .eq("id", pautaId)
    .single();
  if (!pauta) throw new Error("Tema de pauta não encontrado.");

  const { t, ctx, voice, publicadosTemas } = await carregarContexto(tenantId);
  const formato = pauta.formato || "post";

  const peca = await gerarPeca(key, t, ctx, voice, publicadosTemas, pauta.tema, pauta.angulo, formato);
  const texto: string = peca.parsed?.conteudo ?? "";
  const titulo: string = peca.parsed?.titulo ?? pauta.tema;

  // Gate: revisão de marca antes de virar peça.
  const rev = await revisarMarca(key, t, ctx, voice, publicadosTemas, texto);
  const aprovado: boolean = rev.parsed?.aprovado ?? false;
  const bloqueantes = rev.parsed?.bloqueantes ?? [];

  const admin = createAdminClient();
  await admin.from("pieces").insert({
    tenant_id: tenantId,
    pauta_id: pautaId,
    formato,
    titulo,
    conteudo: { texto, revisao: { aprovado, bloqueantes } },
    status: "rascunho",
  });

  const usage = {
    input: peca.usage.input + rev.usage.input,
    output: peca.usage.output + rev.usage.output,
    custo: peca.usage.custo + rev.usage.custo,
  };
  await logMetric(tenantId, formato, 1, aprovado ? 1 : 0, usage);
  revalidatePath(`/admin/tenants/${slug}/producao`);
  revalidatePath("/admin");
}
