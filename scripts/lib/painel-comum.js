"use strict";
// Biblioteca compartilhada dos geradores de painel.
// Lê dados de um tenant e monta o "casco" HTML autocontido (CSS inline).
// Sem dependências externas — roda com Node puro.

const fs = require("fs");
const path = require("path");

// Raiz do engine. Pode ser sobrescrita por ENGINE_ROOT (útil para demos).
function engineRoot() {
  if (process.env.ENGINE_ROOT) return path.resolve(process.env.ENGINE_ROOT);
  return path.resolve(__dirname, "..", "..");
}

function listTenants(root) {
  const dir = path.join(root, "tenants");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .map((d) => d.name)
    .sort();
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

// Parser CSV simples (formato do engine não tem vírgulas em campos).
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const head = lines[0].split(",").map((s) => s.trim());
  return lines.slice(1).map((ln) => {
    const cells = ln.split(",");
    const row = {};
    head.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

// Parser de tabela markdown (| a | b |). Retorna array de objetos.
function parseMdTable(text) {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|"));
  if (rows.length < 2) return [];
  const cells = (l) =>
    l
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const head = cells(rows[0]);
  return rows
    .slice(1)
    .filter((l) => !/^\|?\s*:?-{2,}/.test(l)) // pula linha separadora |---|
    .map((l) => {
      const c = cells(l);
      const o = {};
      head.forEach((h, i) => (o[h] = c[i] ?? ""));
      return o;
    })
    .filter((o) => Object.values(o).some((v) => v)); // sem linhas vazias
}

// Extração leve de campos do tenant.yaml (sem lib de YAML).
function parseTenantYaml(text) {
  const grab = (re) => {
    const m = text.match(re);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  const canais = [];
  const canalRe = /- rede:\s*(\S+)[\s\S]*?handle:\s*"?([^"\n]*)"?[\s\S]*?formatos:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = canalRe.exec(text))) {
    canais.push({
      rede: m[1].trim(),
      handle: (m[2] || "").trim(),
      formatos: m[3].split(",").map((s) => s.trim()).filter(Boolean),
    });
  }
  return {
    nome: grab(/nome_exibicao:\s*(.+)/) || grab(/tenant:\s*(.+)/),
    status: grab(/status:\s*(\w+)/) || "ativo",
    objetivo: grab(/objetivo:\s*(\w+)/),
    aprovador: grab(/aprovador:\s*"?([^"\n#]*)"?/),
    vende: grab(/vende:\s*"([^"]*)"/),
    canais,
  };
}

// Heurística: o context.md ainda está só com o template (incompleto)?
function contextIncompleto(root, slug) {
  const txt = readFileSafe(path.join(root, "tenants", slug, "context.md"));
  if (!txt) return true;
  // remove títulos, comentários e citações; sobra o conteúdo real preenchido
  const corpo = txt
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^#.*$/gm, "")
    .replace(/^>.*$/gm, "")
    .trim();
  return corpo.length < 40;
}

function readTenant(root, slug) {
  const base = path.join(root, "tenants", slug);
  const yaml = parseTenantYaml(readFileSafe(path.join(base, "tenant.yaml")));
  const metrics = parseCSV(readFileSafe(path.join(base, "metricas.csv")));
  const backlog = parseMdTable(readFileSafe(path.join(base, "pauta", "backlog.md")));
  const publicados = parseMdTable(readFileSafe(path.join(base, "pauta", "publicados.md")));
  return {
    slug,
    ...yaml,
    metrics,
    backlog,
    publicados,
    incompleto: contextIncompleto(root, slug),
  };
}

// Agrega números de métricas de um tenant.
function aggMetrics(rows) {
  let geradas = 0,
    aprovadas = 0,
    custo = 0,
    ultima = "";
  for (const r of rows) {
    geradas += num(r.pecas_geradas);
    aprovadas += num(r.pecas_aprovadas);
    custo += num(r.custo_usd);
    if ((r.data || "") > ultima) ultima = r.data || "";
  }
  return {
    geradas,
    aprovadas,
    custo,
    ultima,
    taxa: geradas ? aprovadas / geradas : null,
    custoPorPeca: aprovadas ? custo / aprovadas : null,
  };
}

const num = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const pct = (x) => (x == null ? "—" : Math.round(x * 100) + "%");
const money = (x) => (x == null ? "—" : "$" + x.toFixed(4));
const hoje = () =>
  new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

// Casco HTML autocontido, com o design system compartilhado.
function htmlShell({ title, kicker, subtitle, accent = "#1B7A43", bodyHtml, footer }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root{
    --accent:${accent}; --accent-soft:${accent}14; --accent-line:${accent}33;
    --ink:#16211c; --muted:#5c6b63; --line:#e4e9e5; --bg:#f6f8f6; --card:#ffffff;
    --shadow:0 1px 2px rgba(20,40,30,.04),0 4px 16px rgba(20,40,30,.05);
    --radius:14px;
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{background:var(--bg);color:var(--ink);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased}
  .wrap{max-width:1040px;margin:0 auto;padding:32px 24px 64px}
  header.top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;
    border-bottom:2px solid var(--accent-line);padding-bottom:20px;margin-bottom:28px;flex-wrap:wrap}
  .brand{display:flex;align-items:center;gap:12px}
  .logo{width:38px;height:38px;border-radius:10px;background:var(--accent);color:#fff;
    display:grid;place-items:center;font-weight:800;font-size:18px}
  .kicker{color:var(--accent);font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
  h1{font-size:24px;margin:2px 0 0;letter-spacing:-.01em}
  .sub{color:var(--muted);font-size:13px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:0 0 28px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
    padding:16px 18px;box-shadow:var(--shadow)}
  .card .k{color:var(--muted);font-size:12px;font-weight:600;letter-spacing:.02em}
  .card .v{font-size:28px;font-weight:800;letter-spacing:-.02em;margin-top:6px}
  .card .v small{font-size:14px;font-weight:600;color:var(--muted)}
  section{margin:0 0 28px}
  h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);
    margin:0 0 12px;font-weight:700}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);
    box-shadow:var(--shadow);overflow:hidden}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:12px 16px;border-bottom:1px solid var(--line);vertical-align:top}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);
    background:#fbfcfb;font-weight:700}
  tr:last-child td{border-bottom:none}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;
    background:var(--accent-soft);color:var(--accent)}
  .pill.gray{background:#eef1ef;color:var(--muted)}
  .pill.warn{background:#fff4e5;color:#9a6400}
  .pill.ok{background:#e6f4ea;color:#1b7a43}
  .tname{font-weight:700}
  .tname small{display:block;font-weight:500;color:var(--muted);font-size:12px;margin-top:2px}
  .bar{height:8px;border-radius:999px;background:#eef1ef;overflow:hidden;min-width:80px}
  .bar>i{display:block;height:100%;background:var(--accent)}
  .alert{display:flex;gap:10px;align-items:flex-start;background:#fff4e5;border:1px solid #f0dcb8;
    color:#7a5200;border-radius:12px;padding:12px 16px;margin-bottom:10px;font-size:14px}
  .empty{text-align:center;color:var(--muted);padding:40px 20px;font-size:14px}
  .empty b{color:var(--ink)}
  footer{margin-top:40px;padding-top:18px;border-top:1px solid var(--line);
    color:var(--muted);font-size:12px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
  .mini{display:flex;gap:6px;flex-wrap:wrap}
  .chip{font-size:11px;padding:2px 8px;border-radius:6px;background:#eef1ef;color:var(--muted)}
  @media (max-width:560px){.card .v{font-size:23px}h1{font-size:20px}.wrap{padding:20px 14px 48px}}
  @media print{body{background:#fff}.card,.panel{box-shadow:none}.wrap{max-width:none}}
</style>
</head>
<body>
<div class="wrap">
  <header class="top">
    <div class="brand">
      <div class="logo">${esc((title || "•").trim().charAt(0).toUpperCase())}</div>
      <div>
        <div class="kicker">${esc(kicker || "")}</div>
        <h1>${esc(title)}</h1>
      </div>
    </div>
    <div class="sub">${esc(subtitle || "")}</div>
  </header>
  ${bodyHtml}
  <footer>
    <span>${esc(footer || "Conteúdo Engine")}</span>
    <span>Gerado em ${hoje()}</span>
  </footer>
</div>
</body>
</html>`;
}

function writeOut(file, html) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return file;
}

module.exports = {
  engineRoot,
  listTenants,
  readTenant,
  aggMetrics,
  htmlShell,
  writeOut,
  esc,
  num,
  pct,
  money,
  hoje,
};
