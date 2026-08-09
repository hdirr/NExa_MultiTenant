import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { getClientReport, pct } from "@/lib/data";
import SignOutButton from "@/components/SignOutButton";

// Área do cliente: relatório do seu tenant. Admin vai para /admin.
export default async function Home() {
  const sp = await getSessionProfile();
  if (!sp) redirect("/login");
  if (sp.role === "admin") redirect("/admin");

  const r = await getClientReport();
  const maxF = Math.max(1, ...r.formatos.map((f) => f.n));

  return (
    <div className="flex-1">
      <header className="border-b border-line bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand text-white grid place-items-center font-extrabold">
              {(r.tenant?.nome ?? "C").charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-brand uppercase">
                Relatório de Conteúdo
              </div>
              <div className="font-semibold">{r.tenant?.nome ?? "Seu painel"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/aprovar"
              className="text-sm font-semibold text-muted hover:text-foreground"
            >
              Aprovações
              {r.pendentesAprovacao > 0 && (
                <span className="ml-1.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                  {r.pendentesAprovacao}
                </span>
              )}
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {r.pendentesAprovacao > 0 && (
          <Link
            href="/aprovar"
            className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 mb-6 hover:bg-amber-100 transition"
          >
            <span className="text-sm font-medium">
              Você tem {r.pendentesAprovacao} peça(s) aguardando sua aprovação.
            </span>
            <span className="text-sm font-bold">Revisar →</span>
          </Link>
        )}
        {!r.tenant ? (
          <div className="bg-card border border-line rounded-2xl p-8 shadow-sm text-center text-muted">
            Nenhum conteúdo associado à sua conta ainda.
          </div>
        ) : (
          <>
            {r.tenant.vende && (
              <p className="text-muted mb-6">{r.tenant.vende}</p>
            )}

            {/* Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <Card k="Peças entregues" v={r.entregues ? `${r.entregues}` : "—"} />
              <Card k="Formatos ativos" v={r.formatos.length ? `${r.formatos.length}` : "—"} />
              <Card k="Canais" v={r.canais ? `${r.canais}` : "—"} />
              <Card k="Índice de qualidade" v={pct(r.taxa)} />
            </div>

            {/* Peças entregues */}
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted mb-3">
              Peças entregues
            </h2>
            <div className="bg-card border border-line rounded-xl shadow-sm overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted bg-black/[0.02]">
                      <th className="px-4 py-3 font-bold text-right">Data</th>
                      <th className="px-4 py-3 font-bold">Tema</th>
                      <th className="px-4 py-3 font-bold">Formato</th>
                      <th className="px-4 py-3 font-bold">Desempenho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.publicados.length ? (
                      r.publicados.map((p, i) => (
                        <tr key={i} className="border-t border-line">
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-muted">
                            {p.data ?? ""}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {p.link ? (
                              <a
                                href={p.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand hover:underline"
                              >
                                {p.tema}
                              </a>
                            ) : (
                              p.tema
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-black/[0.04] text-muted rounded px-2 py-0.5">
                              {p.formato}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {p.desempenho ?? "—"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-10 text-center text-muted text-sm">
                          Ainda sem peças publicadas neste período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Distribuição por formato */}
            {r.formatos.length > 0 && (
              <>
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted mb-3">
                  Distribuição por formato
                </h2>
                <div className="bg-card border border-line rounded-xl shadow-sm p-5">
                  {r.formatos.map((f) => (
                    <div key={f.formato} className="flex items-center gap-3 my-2">
                      <div className="w-28 capitalize font-semibold">
                        {f.formato}
                      </div>
                      <div className="flex-1 h-2 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${(f.n / maxF) * 100}%` }}
                        />
                      </div>
                      <div className="w-8 text-right tabular-nums">{f.n}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Card({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-card border border-line rounded-xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-muted">{k}</div>
      <div className="text-3xl font-extrabold mt-1">{v}</div>
    </div>
  );
}
