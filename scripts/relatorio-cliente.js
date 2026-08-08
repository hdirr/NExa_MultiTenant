"use strict";
// Relatório de resultados para o cliente — um tenant por vez.
// Uso:  node scripts/relatorio-cliente.js <tenant> [arquivo-saida.html]
// Foco: o que foi entregue e como performou. NÃO expõe custo interno.

const path = require("path");
const {
  engineRoot, readTenant, aggMetrics,
  htmlShell, writeOut, esc, pct,
} = require("./lib/painel-comum");

const slug = process.argv[2];
if (!slug) {
  console.error("uso: node scripts/relatorio-cliente.js <tenant> [saida.html]");
  process.exit(1);
}
const root = engineRoot();
const t = readTenant(root, slug);
const out = process.argv[3] || path.join(root, "tenants", slug, "relatorio.html");

const m = aggMetrics(t.metrics);
const pubs = t.publicados;

// Distribuição por formato (a partir dos publicados).
const porFormato = {};
for (const p of pubs) {
  const f = (p.Formato || p.formato || "—").toLowerCase();
  porFormato[f] = (porFormato[f] || 0) + 1;
}
const maxF = Math.max(1, ...Object.values(porFormato));
const canaisAtivos = (t.canais || []).length;

// ---- Peças entregues ----
const linhasPub = pubs.length
  ? pubs
      .map((p) => {
        const data = p.Data || p.data || "";
        const tema = p.Tema || p.tema || "";
        const fmt = p.Formato || p.formato || "";
        const link = p.Link || p.link || "";
        const desemp = p.Desempenho || p.desempenho || "";
        const temaCell = link && /^https?:/.test(link)
          ? `<a href="${esc(link)}" style="color:var(--accent);text-decoration:none">${esc(tema)}</a>`
          : esc(tema);
        return `<tr>
          <td class="num" style="white-space:nowrap">${esc(data)}</td>
          <td>${temaCell}</td>
          <td><span class="pill gray">${esc(fmt)}</span></td>
          <td>${esc(desemp) || "<span style='color:var(--muted)'>—</span>"}</td>
        </tr>`;
      })
      .join("")
  : `<tr><td colspan="4"><div class="empty"><b>Ainda sem peças publicadas neste período.</b><br>Assim que a produção começar, cada entrega aparece aqui com seu desempenho.</div></td></tr>`;

const distHtml = Object.keys(porFormato).length
  ? Object.entries(porFormato)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([f, n]) => `<div style="display:flex;align-items:center;gap:12px;margin:8px 0">
          <div style="width:120px;text-transform:capitalize;font-weight:600">${esc(f)}</div>
          <div class="bar" style="flex:1"><i style="width:${Math.round((n / maxF) * 100)}%"></i></div>
          <div class="num" style="width:32px">${n}</div>
        </div>`
      )
      .join("")
  : `<div class="empty" style="padding:20px">Sem dados de formato ainda.</div>`;

const nome = t.nome || slug;
const body = `
  <div class="cards">
    <div class="card"><div class="k">Peças entregues</div><div class="v">${pubs.length || "—"}</div></div>
    <div class="card"><div class="k">Formatos ativos</div><div class="v">${Object.keys(porFormato).length || "—"}</div></div>
    <div class="card"><div class="k">Canais</div><div class="v">${canaisAtivos || "—"}</div></div>
    <div class="card"><div class="k">Índice de qualidade</div><div class="v">${pct(m.taxa)}</div></div>
  </div>

  <section>
    <h2>Peças entregues</h2>
    <div class="panel"><div style="overflow-x:auto"><table>
      <thead><tr><th class="num">Data</th><th>Tema</th><th>Formato</th><th>Desempenho</th></tr></thead>
      <tbody>${linhasPub}</tbody>
    </table></div></div>
  </section>

  <section>
    <h2>Distribuição por formato</h2>
    <div class="panel" style="padding:18px 20px">${distHtml}</div>
  </section>`;

const html = htmlShell({
  title: nome,
  kicker: "Relatório de Conteúdo",
  subtitle: t.vende ? esc(t.vende) : "Produção de conteúdo",
  bodyHtml: body,
  footer: "Relatório de conteúdo · confidencial",
});

console.log("gerado:", writeOut(out, html));
