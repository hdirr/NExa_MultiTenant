import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, Select, Section } from "@/components/form";
import SuggestionField from "@/components/SuggestionField";
import { FORMATOS, OBJETIVOS, REDES } from "@/lib/opcoes";
import SubmitButton from "@/components/SubmitButton";
import {
  addPauta,
  updatePautaStatus,
  deletePauta,
  addPublished,
  deletePublished,
  addMetric,
  deleteMetric,
  addPiece,
  sendPieceForApproval,
  deletePiece,
  generatePautaAI,
  generatePieceAI,
  generateArtAI,
} from "../../actions";

const PIECE_STATUS: Record<string, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "bg-black/[0.06] text-muted" },
  aguardando_aprovacao: { label: "Aguardando aprovação", cls: "bg-amber-100 text-amber-800" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-100 text-emerald-800" },
  reprovado: { label: "Reprovado", cls: "bg-red-100 text-red-700" },
  entregue: { label: "Entregue", cls: "bg-sky-100 text-sky-800" },
};

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

  const [{ data: pauta }, { data: publicados }, { data: metrics }, { data: pieces }, { data: channels }] =
    await Promise.all([
      supabase.from("pauta_items").select("*").eq("tenant_id", tenant.id).order("created_at"),
      supabase.from("published").select("*").eq("tenant_id", tenant.id).order("data", { ascending: false }),
      supabase.from("metrics").select("*").eq("tenant_id", tenant.id).order("data", { ascending: false }),
      supabase.from("pieces").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }),
      supabase.from("channels").select("rede").eq("tenant_id", tenant.id).order("rede"),
    ]);

  // Canais do tenant como opções prontas; sem canais, cai para a lista padrão.
  const canalOptions = channels?.length
    ? [...new Set(channels.map((c) => c.rede))].map((r) => ({
        value: r,
        label: r.charAt(0).toUpperCase() + r.slice(1),
      }))
    : REDES;

  // Aprovações das peças (para mostrar o histórico/comentário do cliente)
  const pieceIds = (pieces ?? []).map((p) => p.id);
  const { data: approvals } = pieceIds.length
    ? await supabase
        .from("approvals")
        .select("piece_id, decisao, comentario, created_at")
        .in("piece_id", pieceIds)
        .order("created_at", { ascending: false })
    : { data: [] as { piece_id: string; decisao: string | null; comentario: string | null; created_at: string }[] };

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

      {/* PEÇAS */}
      <Section
        title="Peças"
        desc="Crie a peça, envie para aprovação e o cliente aprova/reprova em /aprovar."
      >
        {pieces && pieces.length > 0 ? (
          <ul className="flex flex-col gap-2 mb-4">
            {pieces.map((pc) => {
              const st = PIECE_STATUS[pc.status] ?? PIECE_STATUS.rascunho;
              const ap = (approvals ?? []).find((a) => a.piece_id === pc.id);
              return (
                <li key={pc.id} className="border border-line rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm">
                  <span className="font-semibold">{pc.titulo}</span>
                  {pc.formato && <span className="text-muted"> · {pc.formato}</span>}
                  {!pc.conteudo && (
                    <span className="text-xs !text-red-600"> · falta conteúdo</span>
                  )}
                </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${st.cls}`}>
                        {st.label}
                      </span>
                      {pc.status === "rascunho" && (
                        <form action={sendPieceForApproval}>
                          <input type="hidden" name="id" value={pc.id} />
                          <input type="hidden" name="slug" value={tenant.slug} />
                          <button className="text-xs font-semibold text-brand hover:underline">
                            enviar p/ aprovação
                          </button>
                        </form>
                      )}
                      <form action={deletePiece}>
                        <input type="hidden" name="id" value={pc.id} />
                        <input type="hidden" name="slug" value={tenant.slug} />
                        <button className="text-xs text-red-600 hover:underline">remover</button>
                      </form>
                    </div>
                  </div>
                  {(() => {
                    const rev = (pc.conteudo as { revisao?: { aprovado: boolean; bloqueantes?: unknown[] } } | null)?.revisao;
                    if (!rev) return null;
                    return rev.aprovado ? (
                      <div className="text-xs text-emerald-700 mt-1">✓ revisão de marca: aprovado</div>
                    ) : (
                      <div className="text-xs text-red-600 mt-1">
                        ✗ revisão de marca: {rev.bloqueantes?.length ?? 0} bloqueante(s)
                      </div>
                    );
                  })()}
                  {(() => {
                    const campos = (pc.conteudo as { campos?: Record<string, string> } | null)?.campos;
                    const arte = pc.arte as { imagens?: string[] } | null;
                    if (arte?.imagens?.length) {
                      return (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            {arte.imagens.map((src, i) => (
                              <a key={i} href={src} target="_blank" rel="noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={src}
                                  alt={`slide ${i + 1}`}
                                  className="h-20 w-20 object-cover rounded border border-line"
                                />
                              </a>
                            ))}
                          </div>
                          {campos && Object.keys(campos).length > 0 && (
                            <form action={generateArtAI} className="mt-1">
                              <input type="hidden" name="piece_id" value={pc.id} />
                              <input type="hidden" name="tenant_id" value={tenant.id} />
                              <input type="hidden" name="slug" value={tenant.slug} />
                              <button className="text-xs font-semibold text-brand hover:underline">
                                ↻ regerar arte no Canva
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    }
                    if (campos && Object.keys(campos).length) {
                      return (
                        <form action={generateArtAI} className="mt-2">
                          <input type="hidden" name="piece_id" value={pc.id} />
                          <input type="hidden" name="tenant_id" value={tenant.id} />
                          <input type="hidden" name="slug" value={tenant.slug} />
                          <button className="text-xs font-semibold text-brand hover:underline">
                            ✨ gerar arte no Canva
                          </button>
                        </form>
                      );
                    }
                    return null;
                  })()}
                  {ap?.comentario && (
                    <div className="text-xs text-muted mt-1">
                      Comentário do cliente: “{ap.comentario}”
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">Nenhuma peça ainda.</p>
        )}

        <form action={addPiece} className="grid sm:grid-cols-2 gap-3">
          {hid}
          <SuggestionField
            label="Título"
            name="titulo"
            required
            suggestions={[
              "5 erros de [tema] que custam caro",
              "O método de 3 passos para [resultado]",
              "Quanto custa [solução] em 2026",
            ]}
          />
          <Select label="Formato" name="formato" options={FORMATOS} />
          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-muted">Conteúdo</span>
              <textarea
                name="conteudo"
                rows={3}
                placeholder="Texto da peça (roteiro, legenda, etc.)"
                className="border border-line rounded-lg px-3 py-2 outline-none focus:border-brand bg-card resize-y"
              />
            </label>
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Criar peça</SubmitButton>
          </div>
        </form>
      </Section>

      {/* PAUTA */}
      <Section title="Pauta (backlog)">
        <form action={generatePautaAI} className="mb-4">
          {hid}
          <SubmitButton>✨ Gerar 5 temas com IA</SubmitButton>
        </form>
        {pauta && pauta.length > 0 ? (
          <ul className="flex flex-col gap-2 mb-4">
            {pauta.map((p) => {
              const faltas = [
                !p.angulo && "ângulo",
                !p.objetivo && "objetivo",
              ].filter(Boolean) as string[];
              return (
              <li key={p.id} className="border border-line rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm">
                    <span className="font-semibold">{p.tema}</span>
                    {p.formato && <span className="text-muted"> · {p.formato}</span>}
                    {faltas.length > 0 && (
                      <span className="text-xs !text-red-600"> · falta {faltas.join(" e ")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={generatePieceAI}>
                      <input type="hidden" name="tenant_id" value={tenant.id} />
                      <input type="hidden" name="slug" value={tenant.slug} />
                      <input type="hidden" name="pauta_id" value={p.id} />
                      <button className="text-xs font-semibold text-brand hover:underline">✨ gerar peça</button>
                    </form>
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
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">Nenhum tema na pauta ainda.</p>
        )}

        <form action={addPauta} className="grid sm:grid-cols-2 gap-3">
          {hid}
          <SuggestionField
            label="Tema"
            name="tema"
            required
            suggestions={[
              "5 erros que [público] comete em [tema]",
              "Quanto custa [solução] em 2026",
              "Como [cliente] resolveu [dor] em 30 dias",
            ]}
          />
          <SuggestionField
            label="Ângulo"
            name="angulo"
            suggestions={[
              "Dado próprio que o concorrente não tem",
              "Contra o consenso: por que o caminho comum falha",
              "Passo a passo verificável, ancorado em prova",
            ]}
          />
          <Select label="Formato" name="formato" options={FORMATOS} />
          <Select label="Objetivo" name="objetivo" options={OBJETIVOS} />
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
                  {!p.desempenho && (
                    <span className="text-xs !text-red-600"> · falta desempenho</span>
                  )}
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
          <Select label="Formato" name="formato" options={FORMATOS} />
          <Select label="Canal" name="canal" options={canalOptions} />
          <Field label="Link" name="link" placeholder="https://…" />
          <SuggestionField
            label="Desempenho"
            name="desempenho"
            suggestions={[
              "12.4k alcance · 340 salvamentos",
              "8.2k impressões · 1.1% CTR",
              "120 cliques · 18 leads",
            ]}
          />
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
          <Select label="Formato" name="formato" options={FORMATOS} />
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
