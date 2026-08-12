"use client";

import { deleteTenant } from "../actions";

// Botão de exclusão com confirmação (ação irreversível). O window.confirm roda
// no cliente; se cancelar, o submit é abortado e a server action não é chamada.
export default function DeleteTenantButton({
  tenantId,
  nome,
}: {
  tenantId: string;
  nome: string;
}) {
  return (
    <form
      action={deleteTenant}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Excluir o tenant "${nome}"?\n\nIsso apaga PERMANENTEMENTE todo o conteúdo dele ` +
            `(pautas, peças, aprovações, contexto, voz, canais, chave e template).\n\n` +
            `Esta ação é irreversível.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="tenant_id" value={tenantId} />
      <button
        type="submit"
        className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
      >
        Excluir tenant
      </button>
    </form>
  );
}
