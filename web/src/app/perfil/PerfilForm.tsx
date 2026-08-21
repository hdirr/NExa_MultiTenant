"use client";

import { useActionState } from "react";
import { updatePerfil, type PerfilState } from "./actions";

export default function PerfilForm({
  email,
  nomeAtual,
}: {
  email: string | null;
  nomeAtual: string | null;
}) {
  const [state, action, pending] = useActionState<PerfilState, FormData>(updatePerfil, {});

  return (
    <form action={action} className="card p-6 sm:p-7 flex flex-col gap-4 max-w-md">
      <label className="flex flex-col gap-1.5">
        <span className="field-label">E-mail</span>
        <input type="email" className="input" value={email ?? ""} disabled />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="field-label">Seu nome</span>
        <input type="text" name="full_name" defaultValue={nomeAtual ?? ""} className="input" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="field-label">Nova senha</span>
        <input
          type="password"
          name="password"
          minLength={6}
          className="input"
          placeholder="deixe vazio para manter a atual"
        />
      </label>

      {state.ok && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          ✓ Alterações salvas.
        </p>
      )}
      {state.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary justify-center mt-1">
        {pending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}
