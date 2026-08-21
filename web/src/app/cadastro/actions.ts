"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { provisionCanvaForTenant } from "@/lib/canva";

export type SignupState = { error?: string; ok?: boolean; slug?: string };

const s = (fd: FormData, k: string) => (fd.get(k) as string | null)?.trim() ?? "";

// Auto-cadastro de um negócio (Fase 7). Cria, numa tacada só:
//   usuário Auth (papel owner) + tenant (status pendente) + vínculo
//   + contexto inicial opcional + pasta no Canva (best-effort).
// A agência ativa depois no painel — enquanto pendente, nada é produzido.
export async function signupTenant(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  // Honeypot: campo escondido que bots preenchem. Humanos nunca veem.
  if (s(formData, "site")) return { ok: true };

  const empresa = s(formData, "nome_exibicao");
  const slug = s(formData, "slug").toLowerCase().replace(/\s+/g, "-");
  const nome = s(formData, "nome") || empresa;
  const email = s(formData, "email").toLowerCase();
  const senha = s(formData, "password");

  if (!empresa || !email || senha.length < 6) {
    return { error: "Preencha empresa, e-mail e uma senha de pelo menos 6 caracteres." };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      error:
        "Identificador inválido: use apenas letras minúsculas, números e hífen (sem espaços ou acentos).",
    };
  }

  const admin = createAdminClient();

  const { data: existe } = await admin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existe) {
    return { error: `O identificador "${slug}" já está em uso. Escolha outro.` };
  }

  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { full_name: nome },
  });
  if (authErr) {
    const msg = authErr.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered")) {
      return {
        error:
          "Este e-mail já tem conta. Peça para entrar com a senha existente ou use outro e-mail.",
      };
    }
    return { error: authErr.message };
  }
  const uid = created.user.id;

  await admin.from("profiles").update({ full_name: nome, role: "owner" }).eq("id", uid);

  const { data: tenant, error: tErr } = await admin
    .from("tenants")
    .insert({
      slug,
      nome_exibicao: empresa,
      status: "pendente",
      negocio_vende: s(formData, "o_que_vende") || null,
      negocio_publico: s(formData, "para_quem") || null,
    })
    .select("id")
    .single();
  if (tErr) {
    // Não deixa órfão: remove o usuário criado se o tenant falhar.
    await admin.auth.admin.deleteUser(uid);
    return { error: tErr.message };
  }

  const { error: mErr } = await admin
    .from("tenant_members")
    .insert({ tenant_id: tenant!.id as string, profile_id: uid });
  if (mErr) console.error("vínculo membro (ignorado):", mErr.message);

  // Contexto inicial opcional — dá uma cabeça de onboarding ao dono.
  if (s(formData, "o_que_vende") || s(formData, "para_quem")) {
    await admin.from("tenant_context").upsert(
      {
        tenant_id: tenant!.id as string,
        o_que_vende: s(formData, "o_que_vende") || null,
        para_quem: s(formData, "para_quem") || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
  }

  try {
    await provisionCanvaForTenant(admin, tenant!.id as string, empresa);
  } catch (e) {
    console.error("Canva: provisionamento do auto-cadastro (ignorado):", (e as Error).message);
  }

  revalidatePath("/admin");
  return { ok: true, slug };
}
