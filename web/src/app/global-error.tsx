"use client";

// Error boundary global: cobre erros do layout raiz. Precisa definir o
// próprio <html>/<body> e não tem acesso ao CSS global — estilos inline.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: "#f5f8f6",
          color: "#0f1e17",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e6ece8",
            borderTop: "1px solid #fecaca",
            borderRadius: 16,
            padding: 32,
            maxWidth: 480,
            width: "100%",
          }}
        >
          <h2 style={{ color: "#b3261e", margin: 0 }}>Ops, algo deu errado</h2>
          <p style={{ fontSize: 14, color: "#5d6d64", margin: "8px 0 20px" }}>
            {error.message || "Ocorreu um erro inesperado. Tente novamente."}
          </p>
          <button
            onClick={() => retry()}
            style={{
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              color: "#fff",
              background: "linear-gradient(140deg, #1fa768, #147a4d)",
            }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
