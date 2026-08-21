import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminOverview, getPendentesTenants, pct, money } from "@/lib/data";
import { isCanvaConnected } from "@/lib/canva";
import { getSessionProfile, getOwnedTenantSlug } from "@/lib/auth";
import { setTenantStatus } from "./tenants/actions";

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const canva = typeof sp.canva === "string" ? sp.canva : undefined;

  // Owner (dono) não vê o painel geral: cai direto no próprio tenant.
  const perfil = await getSessionProfile();
  if (perfil?.role === "owner") {
    const slug = await getOwnedTenantSlug(perfil.userId);
    redirect(slug ? `/admin/tenants/${slug}` : "/");
  }

  const { tenants, totais, alertas } = await getAdminOverview();
  const pendentes = await getPendentesTenants();
  const canvaOn = await isCanvaConnected();

  // Alerta de cadastros aguardando ativação entra na fila abaixo.
  const alertasVisiveis = alertas.filter((a) => !a.startsWith("[pendente]"));

  return (
    <div>
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Card k="Tenants ativos" v={`${totais.ativos}`} sub={`/ ${totais.total}`} />
        <Card k="Peças produzidas" v={totais.geradas ? `${totais.geradas}` : "—"} />
        <Card k="Taxa de aprovação" v={pct(totais.taxa)} />
        <Card k="Aguardando aprovação" v={totais.pendentes ? `${totais.pendentes}` : "—"} />
        <Card k="Custo acumulado" v={`$${totais.custo.toFixed(2)}`} />
      </div>

      {/* Fila de ativação — auto-cadastro (Fase 7) */}
      {pendentes.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted mb-1">
            Aguardando ativação ({pendentes.length})
          </h2>
          <div className="flex flex-col gap-2">
            {pendentes.map((p) => (
              <form
                key={p.id}
                action={setTenantStatus}
                className="flex flex-wrap items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm"
              >
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="status" value="ativo" />
                <span>🟡</span>
                <Link href={`/admin/tenants/${p.slug}`} className="font-semibold hover:underline">
                  {p.nome}
                </Link>
                <span className="text-muted text-xs">/admin/tenants/{p.slug}</span>
                <span className="ml-auto flex items-center gap-2">
                  <Link
                    href={`/admin/tenants/${p.slug}`}
                    className="btn-secondary !py-1.5 !px-3 text-xs"
                  >
                    Revisar cadastro
                  </Link>
                  <button type="submit" className="btn-primary !py-1.5 !px-4 text-xs">
                    ✓ Ativar
                  </button>
                </span>
              </form>
            ))}
          </div>
        </section>
      )}

      {/* Alertas */}
      <section className="mb-8">
        {alertasVisiveis.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted mb-1">
              Requer atenção
            </h2>
            {alertasVisiveis.map((a, i) => (
              <div
                key={i}
                className="flex gap-2 items-start bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm"
              >
                <span>⚠️</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 items-center bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
            <span>✓</span>
            <span>Nada pendente. Todos os tenants em dia.</span>
          </div>
        )}
      </section>

      {/* Integração Canva (arte) */}
      <section className="mb-8">
        <div className="card p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold">Integração Canva (arte)</div>
            <div className="text-xs text-muted mt-0.5">
              {canvaOn
                ? "Conta da agência conectada. As peças de carrossel podem gerar arte."
                : "Conecte a conta Canva da agência (uma vez) para gerar arte pelas peças."}
            </div>
            {canva === "conectado" && (
              <div className="text-xs text-emerald-700 mt-1">✓ Conectado com sucesso.</div>
            )}
            {canva && canva !== "conectado" && (
              <div className="text-xs text-red-700 mt-1">
                Não foi possível conectar ({canva}). Verifique as credenciais e tente de novo.
              </div>
            )}
          </div>
          <a href="/api/canva/connect" className="btn-primary !py-2 !px-4 whitespace-nowrap">
            {canvaOn ? "Reconectar Canva" : "Conectar Canva"}
          </a>
        </div>
      </section>

      {/* Tabela de tenants */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Tenants
        </h2>
        <Link href="/admin/tenants/new" className="btn-primary !py-2 !px-4">
          + Novo tenant
        </Link>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted bg-black/[0.02]">
                <th className="px-4 py-3 font-bold">Tenant</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Canais</th>
                <th className="px-4 py-3 font-bold text-right">Backlog</th>
                <th className="px-4 py-3 font-bold text-right">Aprovar</th>
                <th className="px-4 py-3 font-bold text-right">Taxa</th>
                <th className="px-4 py-3 font-bold text-right">Custo/peça</th>
                <th className="px-4 py-3 font-bold text-right">Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length > 0 ? (
                tenants.map((t) => (
                  <tr key={t.slug} className="border-t border-line table-row">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/tenants/${t.slug}`}
                        className="font-semibold hover:text-brand hover:underline"
                      >
                        {t.nome}
                      </Link>
                      <div className="text-xs text-muted">
                        {t.slug}
                        {t.incompleto && (
                          <span className="text-amber-700"> · setup incompleto</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={t.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.canais.length ? (
                          t.canais.map((c, i) => (
                            <span
                              key={i}
                              className="text-xs bg-black/[0.04] text-muted rounded px-2 py-0.5"
                            >
                              {c.rede}
                              {c.handle ? ` ${c.handle}` : ""}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.backlog || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.pendentes ? (
                        <span className="text-xs font-semibold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                          {t.pendentes}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {pct(t.taxa)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {money(t.custoPorPeca)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {t.ultima ?? "—"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted text-sm">
                    Nenhum tenant ainda. Rode o seed (0003) ou crie na Fase 2.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="card card-hover p-5">
      <div className="text-xs font-semibold text-muted uppercase tracking-wide">{k}</div>
      <div className="text-[28px] leading-none font-extrabold mt-2 tracking-tight">
        {v}
        {sub && <span className="text-base font-semibold text-muted"> {sub}</span>}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "ativo" ? "pill-ok" : status === "pausado" ? "pill-warn" : "pill-muted";
  return <span className={`pill ${cls}`}>{status}</span>;
}
