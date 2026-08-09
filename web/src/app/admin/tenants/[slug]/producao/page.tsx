import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, Select, Section } from "@/components/form";
import SubmitButton from "@/components/SubmitButton";
import {
  addPauta,
  updatePautaStatus,
  deletePauta,
  addPublished,
  deletePublished,
  addMetric,
  deleteMetric,
} from "../../actions";

const STATUS = [
  { value: "backlog", label: "Backlog" },
  { value: "producao", label: "Em produção" },
  { value: "aguardando", label: "Aguardando aprovação" },
  { value: "entregue", label: "Entregue" },
];

export default async function ProducaoPage({
  params,
}: PageProps<"/admin/tenants/[slug]/producao">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, nome_exibicao, slug")
    .eq("slug", slug)
    .single();
  if (!tenant) notFound();

  const [{ data: pauta }, { data: publicados }, { data: metrics }] =
    await Promise.all([
      supabase.from("pauta_items").select("*").eq("tenant_id", tenant.id).order("created_at"),
      supabase.from("published").select("*").eq("tenant_id", tenant.id).order("data", { ascending: false }),
      supabase.from("metrics").select("*").eq("tenant_id", tenant.id).order("data", { ascending: false }),
    ]);

  const hid = (
    <>
      <input type="hidden" name="tenant_id" value={tenant.id} />
      <input type="hidden" name="slug" value={tenant.slug} />
    </>
  );

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <div>
        <Link href={`/admin/tenants/${slug}`} className="text-sm text-muted hover:text-foreground">
          ← Voltar ao tenant
        </Link>
        <h1 className="text-2xl font-bold mt-2">{tenant.nome_exibicao}</h1>
        <p className="text-sm text-muted">Pauta, publicados e métricas</p>
      </div>

      {/* PAUTA */}
      <Section title="Pauta (backlog)">
        {pauta && pauta.length > 0 ? (
          <ul className="flex flex-col gap-2 mb-4">
            {pauta.map((p) => (
              <li key={p.id} className="border border-line rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm">
                    <span className="font-semibold">{p.tema}</span>
                    {p.formato && <span className="text-muted"> · {p.formato}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={updatePautaStatus} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="slug" value={tenant.slug} />
                      <select
                        name="status"
                        defaultValue={p.status}
                        className="border border-line rounded-md px-2 py-1 text-xs bg-card"
                      >
                        {STATUS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <button className="text-xs font-semibold text-brand hover:underline">salvar</button>
                    </form>
                    <form action={deletePauta}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="slug" value={tenant.slug} />
                      <button className="text-xs text-red-600 hover:underline">remover</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">Nenhum tema na pauta ainda.</p>
        )}

        <form action={addPauta} className="grid sm:grid-cols-2 gap-3">
          {hid}
          <Field label="Tema" name="tema" required />
          <Field label="Ângulo" name="angulo" />
          <Field label="Formato" name="formato" placeholder="carrossel / reels / post" />
          <Select label="Status" name="status" options={STATUS} />
          <div className="sm:col-span-2">
            <SubmitButton>Adicionar tema</SubmitButton>
          </div>
        </form>
      </Section>

      {/* PUBLICADOS */}
      <Section title="Publicados">
        {publicados && publicados.length > 0 ? (
          <ul className="flex flex-col gap-2 mb-4">
            {publicados.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border border-line rounded-lg px-3 py-2">
                <div className="text-sm">
                  <span className="text-muted tabular-nums">{p.data ?? ""}</span>{" "}
                  <span className="font-semibold">{p.tema}</span>
                  {p.formato && <span className="text-muted"> · {p.formato}</span>}
                  {p.desempenho && <div className="text-xs text-muted">{p.desempenho}</div>}
                </div>
                <form action={deletePublished}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="slug" value={tenant.slug} />
                  <button className="text-xs text-red-600 hover:underline">remover</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">Nada publicado ainda.</p>
        )}

        <form action={addPublished} className="grid sm:grid-cols-2 gap-3">
          {hid}
          <Field label="Data" name="data" type="date" />
          <Field label="Tema" name="tema" required />
          <Field label="Formato" name="formato" />
          <Field label="Canal" name="canal" placeholder="instagram / linkedin" />
          <Field label="Link" name="link" placeholder="https://…" />
          <Field label="Desempenho" name="desempenho" placeholder="12.4k alcance · 340 salvamentos" />
          <div className="sm:col-span-2">
            <SubmitButton>Adicionar publicado</SubmitButton>
          </div>
        </form>
      </Section>

      {/* MÉTRICAS */}
      <Section title="Métricas">
        {metrics && metrics.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Data</th>
                  <th className="py-2 pr-3">Formato</th>
                  <th className="py-2 pr-3 text-right">Geradas</th>
                  <th className="py-2 pr-3 text-right">Aprovadas</th>
                  <th className="py-2 pr-3 text-right">Custo</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="py-2 pr-3 tabular-nums">{m.data ?? ""}</td>
                    <td className="py-2 pr-3">{m.formato ?? ""}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.pecas_geradas}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{m.pecas_aprovadas}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">${Number(m.custo_usd).toFixed(4)}</td>
                    <td className="py-2 text-right">
                      <form action={deleteMetric}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="slug" value={tenant.slug} />
                        <button className="text-xs text-red-600 hover:underline">remover</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted mb-4">Sem métricas ainda.</p>
        )}

        <form action={addMetric} className="grid sm:grid-cols-3 gap-3">
          {hid}
          <Field label="Data" name="data" type="date" />
          <Field label="Formato" name="formato" placeholder="carrossel" />
          <Field label="Minutos do ciclo" name="minutos_ciclo" type="number" />
          <Field label="Peças geradas" name="pecas_geradas" type="number" />
          <Field label="Peças aprovadas" name="pecas_aprovadas" type="number" />
          <Field label="Custo (US$)" name="custo_usd" placeholder="0.0280" />
          <Field label="Tokens entrada" name="tokens_entrada" type="number" />
          <Field label="Tokens saída" name="tokens_saida" type="number" />
          <div className="sm:col-span-3">
            <SubmitButton>Adicionar métrica</SubmitButton>
          </div>
        </form>
      </Section>
    </div>
  );
}
