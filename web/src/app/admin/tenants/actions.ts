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
