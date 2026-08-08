import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "client";

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
