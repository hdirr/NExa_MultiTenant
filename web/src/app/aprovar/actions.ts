"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

// Cliente (ou admin) registra a decisão de aprovação de uma peça.
// O trigger no banco aplica a decisão no status da peça.
export async function submitApproval(formData: FormData) {
  const sp = await getSessionProfile();
  if (!sp) throw new Error("não autenticado");

  const piece_id = (formData.get("piece_id") as string | null)?.trim();
  const decisao = (formData.get("decisao") as string | null)?.trim();
  const comentario = (formData.get("comentario") as string | null)?.trim() || null;

  if (!piece_id || (decisao !== "aprovado" && decisao !== "reprovado")) {
    throw new Error("dados inválidos");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("approvals").insert({
    piece_id,
    profile_id: sp.userId,
    decisao,
    comentario,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/aprovar");
  revalidatePath("/");
}
