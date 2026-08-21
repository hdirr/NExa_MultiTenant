"use server";

import { createClient } from "@/lib/supabase/server";

export type PerfilState = { error?: string; ok?: boolean };

// O usuário (qualquer papel) atualiza o próprio nome e/ou senha.
// A policy profiles_update_self (0001) garante que o papel não muda.
export async function updatePerfil(
  _prev: PerfilState,
  formData: FormData,
): Promise<PerfilState> {
  const supabase = await createClient();
  const nome = ((formData.get("full_name") as string | null) ?? "").trim();
  const senha = ((formData.get("password") as string | null) ?? "").trim();

  if (senha && senha.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (nome) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Sessão expirada. Entre de novo." };
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: nome })
      .eq("id", user.id);
    if (error) return { error: error.message };
  }

  if (senha) {
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return { error: error.message };
  }

  return { ok: true };
}
