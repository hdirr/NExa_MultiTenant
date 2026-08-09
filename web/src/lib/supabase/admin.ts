import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente com a Secret key (service_role) — PRIVILEGIADO, contorna o RLS.
// USAR SOMENTE NO SERVIDOR (server actions / route handlers), nunca no browser.
// A Secret key vem de SUPABASE_SECRET_KEY (sem NEXT_PUBLIC).
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY não configurada. Adicione-a ao .env.local (server-only).",
    );
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
