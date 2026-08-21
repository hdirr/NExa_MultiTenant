"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  // Auto-preenchimento de teste: ativo apenas se o ambiente definir as
  // variáveis (NEXT_PUBLIC_ENABLE_TEST_FILL=true + credenciais). Nunca setar
  // em produção.
  const testFill = process.env.NEXT_PUBLIC_ENABLE_TEST_FILL === "true";
  const [email, setEmail] = useState(
    testFill ? (process.env.NEXT_PUBLIC_TEST_ADMIN_EMAIL ?? "") : "",
  );
  const [password, setPassword] = useState(
    testFill ? (process.env.NEXT_PUBLIC_TEST_ADMIN_PASSWORD ?? "") : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha inválidos.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex-1 grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="logo-mark" style={{ width: 52, height: 52, fontSize: 22, borderRadius: 15 }}>
            C
          </div>
          <div className="kicker mt-4">Conteúdo Engine</div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Bem-vindo de volta</h1>
          <p className="text-sm text-muted mt-1">Entre para acessar o seu painel.</p>
        </div>

        <form onSubmit={onSubmit} className="card p-6 sm:p-7 flex flex-col gap-4" style={{ boxShadow: "var(--shadow-lg)" }}>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="voce@exemplo.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">Senha</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-1">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-5">
          É um negócio novo?{" "}
          <a href="/cadastro" className="font-semibold underline">
            Cadastre sua empresa
          </a>
        </p>
        {testFill && (
          <p className="text-xs text-center text-muted mt-2">
            Ambiente de teste: credenciais pré-preenchidas.
          </p>
        )}
      </div>
    </main>
  );
}
