import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { getClientReport, pct } from "@/lib/data";
import AppHeader from "@/components/AppHeader";
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
      <AppHeader
        width="max-w-4xl"
        initial={(r.tenant?.nome ?? "C").charAt(0)}
        kicker="Relatório de Conteúdo"
        title={r.tenant?.nome ?? "Seu painel"}
        right={
          <>
            <Link
              href="/aprovar"
              className="text-sm font-semibold text-muted hover:text-foreground transition inline-flex items-center"
            >
              Aprovações
              {r.pendentesAprovacao > 0 && (
                <span className="ml-1.5 pill pill-warn">{r.pendentesAprovacao}</span>
              )}
            </Link>
            <SignOutButton />
          </>
        }
      />

      <main className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
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
          <div className="card p-10 text-center text-muted">
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
            <div className="card overflow-hidden mb-8">
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
                        <tr key={i} className="border-t border-line table-row">
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
                <div className="card p-5 sm:p-6">
                  {r.formatos.map((f) => (
                    <div key={f.formato} className="flex items-center gap-3 my-2.5">
                      <div className="w-28 capitalize font-semibold text-sm">
                        {f.formato}
                      </div>
                      <div className="flex-1 h-2.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(f.n / maxF) * 100}%`,
                            background: "linear-gradient(90deg, var(--brand-2), var(--brand))",
                          }}
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
    <div className="card card-hover p-5">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">{k}</div>
      <div className="text-[28px] leading-none font-extrabold mt-2 tracking-tight">{v}</div>
    </div>
  );
}
