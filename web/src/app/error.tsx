"use client";

import { useEffect } from "react";

// Error boundary raiz. Cobre as demais rotas (/login, /aprovar, /admin).
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 border-red-200 max-w-lg w-full">
        <h2 className="text-lg font-bold text-red-700">Ops, algo deu errado</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          {error.message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted mt-1">ID do erro: {error.digest}</p>
        )}
        <button onClick={() => retry()} className="btn-primary mt-5">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
