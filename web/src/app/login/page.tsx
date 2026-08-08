"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand text-white grid place-items-center font-extrabold text-lg">
            C
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-brand uppercase">
              Conteúdo Engine
            </div>
            <div className="text-lg font-semibold">Entrar</div>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-card border border-line rounded-2xl p-6 shadow-sm flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-line rounded-lg px-3 py-2.5 outline-none focus:border-brand"
              placeholder="voce@exemplo.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted">Senha</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-line rounded-lg px-3 py-2.5 outline-none focus:border-brand"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-brand text-white font-semibold rounded-lg px-4 py-2.5 hover:opacity-90 disabled:opacity-60 transition"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-4">
          Acesso restrito. As contas são criadas pelo administrador.
        </p>
      </div>
    </main>
  );
}
