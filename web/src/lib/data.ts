import { createClient } from "@/lib/supabase/server";

// ── Helpers ────────────────────────────────────────────────────────────────
export const pct = (x: number | null) =>
  x == null ? "—" : Math.round(x * 100) + "%";
export const money = (x: number | null) =>
  x == null ? "—" : "$" + x.toFixed(4);

interface MetricRow {
  tenant_id: string;
  data: string | null;
  pecas_geradas: number;
  pecas_aprovadas: number;
  custo_usd: number;
}

function aggregate(rows: MetricRow[]) {
  let geradas = 0,
    aprovadas = 0,
    custo = 0,
    ultima = "";
  for (const r of rows) {
    geradas += r.pecas_geradas ?? 0;
    aprovadas += r.pecas_aprovadas ?? 0;
    custo += Number(r.custo_usd ?? 0);
    if ((r.data ?? "") > ultima) ultima = r.data ?? "";
  }
  return {
    geradas,
    aprovadas,
    custo,
    ultima: ultima || null,
    taxa: geradas ? aprovadas / geradas : null,
    custoPorPeca: aprovadas ? custo / aprovadas : null,
  };
}

// ── Painel admin (todos os tenants) ─────────────────────────────────────────
export interface TenantRow {
  id: string;
  slug: string;
  nome: string;
  status: string;
  canais: { rede: string; handle: string | null }[];
  backlog: number;
  pendentes: number;
  taxa: number | null;
  custoPorPeca: number | null;
  ultima: string | null;
  incompleto: boolean;
}

export interface AdminOverview {
  tenants: TenantRow[];
  totais: {
    ativos: number;
    total: number;
    geradas: number;
    taxa: number | null;
    pendentes: number;
    custo: number;
  };
  alertas: string[];
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await createClient();

  const [{ data: tenants }, { data: metrics }, { data: pauta }, { data: channels }, { data: context }, { data: pieces }] =
    await Promise.all([
      supabase.from("tenants").select("id, slug, nome_exibicao, status").order("nome_exibicao"),
      supabase.from("metrics").select("tenant_id, data, pecas_geradas, pecas_aprovadas, custo_usd"),
      supabase.from("pauta_items").select("tenant_id, status"),
      supabase.from("channels").select("tenant_id, rede, handle"),
      supabase.from("tenant_context").select("tenant_id, prova_disponivel, o_que_vende"),
      supabase.from("pieces").select("tenant_id, status"),
    ]);

  const byTenantMetrics = new Map<string, MetricRow[]>();
  (metrics ?? []).forEach((m) => {
    const arr = byTenantMetrics.get(m.tenant_id) ?? [];
    arr.push(m as MetricRow);
    byTenantMetrics.set(m.tenant_id, arr);
  });

  const ctxByTenant = new Map((context ?? []).map((c) => [c.tenant_id, c]));

  const rows: TenantRow[] = (tenants ?? []).map((t) => {
    const agg = aggregate(byTenantMetrics.get(t.id) ?? []);
    const pautaT = (pauta ?? []).filter((p) => p.tenant_id === t.id);
    const pendentes = (pieces ?? []).filter(
      (p) => p.tenant_id === t.id && p.status === "aguardando_aprovacao",
    ).length;
    const ctx = ctxByTenant.get(t.id);
    const incompleto = !ctx || !(ctx.prova_disponivel ?? "").trim();
    return {
      id: t.id,
      slug: t.slug,
      nome: t.nome_exibicao,
      status: t.status ?? "ativo",
      canais: (channels ?? [])
        .filter((c) => c.tenant_id === t.id)
        .map((c) => ({ rede: c.rede, handle: c.handle })),
      backlog: pautaT.length,
      pendentes,
      taxa: agg.taxa,
      custoPorPeca: agg.custoPorPeca,
      ultima: agg.ultima,
      incompleto,
    };
  });

  const alertas: string[] = [];
  for (const r of rows) {
    if (r.incompleto)
      alertas.push(
        `${r.nome} — contexto incompleto (falta a Prova disponível): produção bloqueada.`,
      );
    if (r.pendentes > 0)
      alertas.push(`${r.nome} — ${r.pendentes} peça(s) aguardando aprovação.`);
  }

  const geradas = rows.reduce((s, r) => s + (byTenantMetrics.get(r.id) ?? []).reduce((a, m) => a + m.pecas_geradas, 0), 0);
  const aprovadas = (metrics ?? []).reduce((s, m) => s + (m.pecas_aprovadas ?? 0), 0);
  const custo = (metrics ?? []).reduce((s, m) => s + Number(m.custo_usd ?? 0), 0);

  return {
    tenants: rows,
    totais: {
      ativos: rows.filter((r) => r.status === "ativo").length,
      total: rows.length,
      geradas,
      taxa: geradas ? aprovadas / geradas : null,
      pendentes: rows.reduce((s, r) => s + r.pendentes, 0),
      custo,
    },
    alertas,
  };
}

// ── Fila de ativação (Fase 7): tenants criados por auto-cadastro ───────────
export interface PendenteRow {
  id: string;
  slug: string;
  nome: string;
  criadoEm: string | null;
}

export async function getPendentesTenants(): Promise<PendenteRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, nome_exibicao, created_at")
    .eq("status", "pendente")
    .order("created_at");
  return (data ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    nome: t.nome_exibicao,
    criadoEm: t.created_at ?? null,
  }));
}

// ── Relatório do cliente (um tenant) ────────────────────────────────────────
export interface ClientReport {
  tenant: { nome: string; vende: string | null } | null;
  entregues: number;
  formatos: { formato: string; n: number }[];
  canais: number;
  taxa: number | null;
  pendentesAprovacao: number;
  publicados: {
    data: string | null;
    tema: string | null;
    formato: string | null;
    link: string | null;
    desempenho: string | null;
  }[];
}

export async function getClientReport(): Promise<ClientReport> {
  const supabase = await createClient();

  // RLS já restringe ao(s) tenant(s) do usuário; pegamos o primeiro.
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, nome_exibicao, negocio_vende")
    .order("nome_exibicao")
    .limit(1);
  const tenant = tenants?.[0];
  if (!tenant) {
    return { tenant: null, entregues: 0, formatos: [], canais: 0, taxa: null, pendentesAprovacao: 0, publicados: [] };
  }

  const [{ data: publicados }, { data: metrics }, { data: channels }, { count: pendentes }] = await Promise.all([
    supabase
      .from("published")
      .select("data, tema, formato, link, desempenho")
      .eq("tenant_id", tenant.id)
      .order("data", { ascending: false }),
    supabase
      .from("metrics")
      .select("tenant_id, data, pecas_geradas, pecas_aprovadas, custo_usd")
      .eq("tenant_id", tenant.id),
    supabase.from("channels").select("id").eq("tenant_id", tenant.id),
    supabase
      .from("pieces")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "aguardando_aprovacao"),
  ]);

  const formatosMap = new Map<string, number>();
  (publicados ?? []).forEach((p) => {
    const f = (p.formato ?? "—").toLowerCase();
    formatosMap.set(f, (formatosMap.get(f) ?? 0) + 1);
  });

  const agg = aggregate((metrics ?? []) as MetricRow[]);

  return {
    tenant: { nome: tenant.nome_exibicao, vende: tenant.negocio_vende },
    entregues: publicados?.length ?? 0,
    formatos: [...formatosMap.entries()]
      .map(([formato, n]) => ({ formato, n }))
      .sort((a, b) => b.n - a.n),
    canais: channels?.length ?? 0,
    taxa: agg.taxa,
    pendentesAprovacao: pendentes ?? 0,
    publicados: publicados ?? [],
  };
}
