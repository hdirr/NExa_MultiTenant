"use strict";
// Painel interno multi-tenant — para o operador do engine.
// Uso:  node scripts/painel-interno.js  [arquivo-saida.html]
// Lê todos os tenants e gera um HTML de controle: pipeline, taxa, custo, alertas.

const path = require("path");
const {
  engineRoot, listTenants, readTenant, aggMetrics,
  htmlShell, writeOut, esc, pct, money,
} = require("./lib/painel-comum");

const root = engineRoot();
const out = process.argv[2] || path.join(root, "painel", "index.html");

const slugs = listTenants(root);
const tenants = slugs.map((s) => readTenant(root, s));

// Buckets de status do backlog (normalizados).
function bucket(status) {
  const s = (status || "").toLowerCase();
  if (/aguard|aprova(r|ção)?\b/.test(s) && !/aprovad/.test(s)) return "aguardando";
  if (/produç|produz|roteiro|arte/.test(s)) return "producao";
  if (/entreg|public/.test(s)) return "entregue";
  return "backlog";
}

// Totais gerais.
let totGer = 0, totApr = 0, totCusto = 0, totPend = 0;
const linhas = tenants.map((t) => {
  const m = aggMetrics(t.metrics);
  const pend = t.backlog.filter((b) => bucket(b.Status) === "aguardando").length;
  totGer += m.geradas; totApr += m.aprovadas; totCusto += m.custo; totPend += pend;
  return { t, m, pend, backlogN: t.backlog.length };
});

const ativos = tenants.filter((t) => (t.status || "ativo") === "ativo").length;
const taxaMedia = totGer ? totApr / totGer : null;

// ---- Alertas ----
const alertas = [];
for (const { t, pend } of linhas) {
  if (t.incompleto)
    alertas.push(`<b>${esc(t.nome || t.slug)}</b> — context.md incompleto: produção bloqueada até preencher as seções obrigatórias.`);
  if (pend > 0)
    alertas.push(`<b>${esc(t.nome || t.slug)}</b> — ${pend} peça(s) aguardando sua aprovação.`);
}

const alertasHtml = alertas.length
  ? `<section><h2>Requer atenção</h2>${alertas
      .map((a) => `<div class="alert"><span>⚠️</span><span>${a}</span></div>`)
      .join("")}</section>`
  : `<section><div class="alert" style="background:#e6f4ea;border-color:#bfe3cc;color:#1b6a3c">
      <span>✓</span><span>Nada pendente. Todos os tenants em dia.</span></div></section>`;

// ---- Tabela de tenants ----
const rowsHtml = linhas.length
  ? linhas
      .map(({ t, m, pend, backlogN }) => {
        const st = (t.status || "ativo");
        const stPill =
          st === "ativo" ? `<span class="pill ok">ativo</span>`
          : st === "pausado" ? `<span class="pill warn">pausado</span>`
          : `<span class="pill gray">${esc(st)}</span>`;
        const canais = (t.canais || [])
          .map((c) => `<span class="chip">${esc(c.rede)}${c.handle ? " " + esc(c.handle) : ""}</span>`)
          .join(" ") || `<span class="chip">—</span>`;
        const taxaBar = m.taxa == null ? "" :
          `<div class="bar" title="${pct(m.taxa)}"><i style="width:${Math.round(m.taxa*100)}%"></i></div>`;
        return `<tr>
          <td><div class="tname">${esc(t.nome || t.slug)}<small>${esc(t.slug)}${t.incompleto ? " · <span style='color:#9a6400'>setup incompleto</span>" : ""}</small></div></td>
          <td>${stPill}</td>
          <td><div class="mini">${canais}</div></td>
          <td class="num">${backlogN || "—"}</td>
          <td class="num">${pend ? `<span class="pill warn">${pend}</span>` : "—"}</td>
          <td class="num">${pct(m.taxa)}${taxaBar}</td>
          <td class="num">${money(m.custoPorPeca)}</td>
          <td class="num">${esc(m.ultima || "—")}</td>
        </tr>`;
      })
      .join("")
  : `<tr><td colspan="8"><div class="empty">Nenhum tenant ainda. Crie o primeiro com <b>./scripts/new-tenant.sh &lt;slug&gt;</b>.</div></td></tr>`;

const body = `
  <div class="cards">
    <div class="card"><div class="k">Tenants ativos</div><div class="v">${ativos}<small> / ${tenants.length}</small></div></div>
    <div class="card"><div class="k">Peças produzidas</div><div class="v">${totGer || "—"}</div></div>
    <div class="card"><div class="k">Taxa de aprovação</div><div class="v">${pct(taxaMedia)}</div></div>
    <div class="card"><div class="k">Aguardando aprovação</div><div class="v">${totPend || "—"}</div></div>
    <div class="card"><div class="k">Custo acumulado</div><div class="v">$${totCusto.toFixed(2)}</div></div>
  </div>
  ${alertasHtml}
  <section>
    <h2>Tenants</h2>
    <div class="panel"><div style="overflow-x:auto"><table>
      <thead><tr>
        <th>Tenant</th><th>Status</th><th>Canais</th>
        <th class="num">Backlog</th><th class="num">Aprovar</th>
        <th class="num">Taxa</th><th class="num">Custo/peça</th><th class="num">Última atividade</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table></div></div>
  </section>`;

const html = htmlShell({
  title: "Conteúdo Engine",
  kicker: "Painel de Controle",
  subtitle: `${tenants.length} tenant(s) · uso interno`,
  bodyHtml: body,
  footer: "Conteúdo Engine · painel interno (uso do operador)",
});

console.log("gerado:", writeOut(out, html));
