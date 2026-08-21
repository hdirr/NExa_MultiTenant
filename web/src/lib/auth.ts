import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "owner" | "client";

export interface SessionProfile {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: Role;
}

// Retorna o usuário logado + perfil, ou null se não há sessão.
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: (profile?.role as Role) ?? "client",
  };
}

// ─────────────────────────────────────────────────────────────
// Autorização por tenant (Fase 7): admin global passa sempre;
// dono (owner) só no próprio tenant; cliente não escreve.
// Aceita o FormData da action: usa "tenant_id" ou resolve pelo "slug".
// ─────────────────────────────────────────────────────────────
export async function requireTenantAdmin(fd: FormData): Promise<SessionProfile> {
  const sp = await getSessionProfile();
  if (!sp) throw new Error("não autorizado");
  if (sp.role === "admin") return sp;
  if (sp.role !== "owner") throw new Error("não autorizado");

  const supabase = await createClient();
  let tenantId =
    (fd.get("tenant_id") as string | null)?.trim() ?? "";
  if (!tenantId) {
    const slug = (fd.get("slug") as string | null)?.trim() ?? "";
    const { data: t } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!t) throw new Error("não autorizado");
    tenantId = t.id;
  }

  // RLS garante que só vemos a nossa própria linha de membership.
  const { data: m } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("tenant_id", tenantId)
    .eq("profile_id", sp.userId)
    .maybeSingle();
  if (!m) throw new Error("não autorizado");
  return sp;
}

// Bloqueia produção enquanto o tenant estiver pendente de ativação.
// (Edição de contexto/voz/canais/chaves continua liberada — é o onboarding.)
export async function exigirTenantAtivo(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("status")
    .eq("slug", slug)
    .maybeSingle();
  if (!data || data.status === "pendente") {
    throw new Error(
      "Este negócio ainda está aguardando ativação pela agência.",
    );
  }
}

// Slug do primeiro tenant em que o usuário é dono (para redirecionamento).
export async function getOwnedTenantSlug(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenant_members")
    .select("tenants(slug)")
    .eq("profile_id", userId)
    .limit(1);
  const rows = (data ?? []) as { tenants: { slug: string }[] | { slug: string } }[];
  const emb = rows[0]?.tenants;
  if (!emb) return null;
  return Array.isArray(emb) ? (emb[0]?.slug ?? null) : emb.slug;
}
