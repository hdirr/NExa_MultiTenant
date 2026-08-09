"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

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
