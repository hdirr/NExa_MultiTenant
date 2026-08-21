import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Módulo de integração com a Canva Connect API (autofill + export).
// Conexão nível agência: uma conta Canva Pro+ guarda os Brand Templates de
// todos os clientes. Tokens ficam em canva_connection (server-only, RLS sem
// policies). USAR SOMENTE NO SERVIDOR.

const API = "https://api.canva.com/rest/v1";

interface Conn {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
}

async function readConn(): Promise<Conn | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("canva_connection")
    .select("access_token, refresh_token, expires_at")
    .eq("id", 1)
    .maybeSingle();
  return (data as Conn) ?? null;
}

// Grava tokens; expira 60s antes do real, por segurança.
export async function saveCanvaTokens(access: string, refresh: string, expiresInSec: number) {
  const admin = createAdminClient();
  const expires_at = new Date(Date.now() + (expiresInSec - 60) * 1000).toISOString();
  const { error } = await admin.from("canva_connection").upsert(
    { id: 1, access_token: access, refresh_token: refresh, expires_at, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}

export async function isCanvaConnected(): Promise<boolean> {
  const c = await readConn();
  return !!c?.refresh_token;
}

function clientCreds() {
  const id = process.env.CANVA_CLIENT_ID;
  const secret = process.env.CANVA_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("CANVA_CLIENT_ID / CANVA_CLIENT_SECRET não configurados no .env.local.");
  }
  return { id, secret };
}

async function refreshToken(refresh: string): Promise<string> {
  const { id, secret } = clientCreds();
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  if (!r.ok) throw new Error(`Canva OAuth refresh falhou: ${r.status} ${await r.text()}`);
  const j = await r.json();
  await saveCanvaTokens(j.access_token, j.refresh_token ?? refresh, j.expires_in ?? 14400);
  return j.access_token as string;
}

// Token válido (renova se expirado). Lança se a conta não estiver conectada.
export async function getAccessToken(): Promise<string> {
  const c = await readConn();
  if (!c?.refresh_token) {
    throw new Error("Canva não conectado. Conecte a conta da agência no painel antes de gerar arte.");
  }
  const valid = c.access_token && c.expires_at && new Date(c.expires_at) > new Date();
  return valid ? c.access_token! : refreshToken(c.refresh_token);
}

async function canvaFetchRaw(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`Canva ${path} → ${r.status} ${await r.text()}`);
  return r;
}

async function canvaFetch(path: string, init?: RequestInit) {
  return (await canvaFetchRaw(path, init)).json();
}

// Autofill e export são JOBS assíncronos: cria → poll até success.
async function pollJob(basePath: string, jobId: string, tries = 30, delayMs = 2000) {
  for (let i = 0; i < tries; i++) {
    const j = await canvaFetch(`${basePath}/${jobId}`);
    const status = j.job?.status;
    if (status === "success") return j.job;
    if (status === "failed") throw new Error(`Job Canva falhou: ${JSON.stringify(j.job?.error ?? j.job)}`);
    await new Promise((res) => setTimeout(res, delayMs));
  }
  throw new Error("Job Canva não concluiu no tempo esperado.");
}

export type Campos = Record<string, string>;

// Preenche o Brand Template com a copy (texto) e imagens (asset_id) e retorna
// o design criado. Campos de texto → {type:"text"}; imagens → {type:"image"}.
export async function autofillCarrossel(
  templateId: string,
  campos: Campos,
  imagens: Record<string, string> = {},
): Promise<{ designId: string; designUrl?: string }> {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(campos)) data[k] = { type: "text", text: v };
  for (const [k, assetId] of Object.entries(imagens)) data[k] = { type: "image", asset_id: assetId };
  const created = await canvaFetch(`/autofills`, {
    method: "POST",
    body: JSON.stringify({ brand_template_id: templateId, data }),
  });
  const job = await pollJob(`/autofills`, created.job.id);
  const design = job.result?.design;
  if (!design?.id) throw new Error("Autofill não retornou um design.");
  return { designId: design.id, designUrl: design.url };
}

// Campos de autofill do Brand Template com o tipo de cada um (text/image/…).
// Usado para descobrir quais campos recebem imagem gerada por IA.
export async function datasetDoTemplate(
  templateId: string,
): Promise<Record<string, { type: string }>> {
  const j = await canvaFetch(`/brand-templates/${templateId}/dataset`);
  return (j.dataset ?? {}) as Record<string, { type: string }>;
}

// Sobe bytes de imagem como asset do Canva e devolve o asset_id
// (job assíncrono; URLs externas não são aceitas no autofill).
export async function uploadAsset(bytes: Buffer, nome: string): Promise<string> {
  const nameBase64 = Buffer.from(nome, "utf8").toString("base64");
  const token = await getAccessToken();
  const r = await fetch(`${API}/asset-uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Asset-Upload-Metadata": JSON.stringify({ name_base64: nameBase64 }),
    },
    body: new Uint8Array(bytes),
  });
  if (!r.ok) throw new Error(`Canva /asset-uploads → ${r.status} ${await r.text()}`);
  const created = await r.json();
  const job = await pollJob(`/asset-uploads`, created.job.id);
  const assetId = job.asset?.id;
  if (!assetId) throw new Error("Upload de asset não retornou o id.");
  return assetId as string;
}

// Exporta o design como PNG (uma imagem por página) e retorna as URLs.
export async function exportarPng(designId: string): Promise<string[]> {
  const created = await canvaFetch(`/exports`, {
    method: "POST",
    body: JSON.stringify({ design_id: designId, format: { type: "png" } }),
  });
  const job = await pollJob(`/exports`, created.job.id);
  return (job.urls ?? []) as string[];
}

// ── Brand Templates (para o seletor no painel) ──────────────────────────────
export interface BrandTemplateItem {
  id: string;
  title: string;
}

// Lista os Brand Templates da conta Canva conectada (só os com dataset de
// autofill). Requer o escopo brandtemplate:meta:read.
export async function listarBrandTemplates(): Promise<BrandTemplateItem[]> {
  const j = await canvaFetch(`/brand-templates?dataset=non_empty&limit=100&sort_by=modified_descending`);
  const items = (j.items ?? []) as { id: string; title?: string }[];
  return items.map((it) => ({ id: it.id, title: it.title || "(sem título)" }));
}

// ── Pastas (organizar as artes por cliente) ─────────────────────────────────
// Requer os escopos folder:read / folder:write. Cria uma pasta na raiz e
// devolve o id. O app guarda esse id no tenant (canva_folder_id).
export async function criarPasta(nome: string): Promise<string> {
  const j = await canvaFetch(`/folders`, {
    method: "POST",
    body: JSON.stringify({ name: nome.slice(0, 255), parent_folder_id: "root" }),
  });
  const id = j.folder?.id;
  if (!id) throw new Error("Canva não retornou o id da pasta.");
  return id as string;
}

// Move um item (design) para uma pasta. Resposta 204 sem corpo.
export async function moverParaPasta(itemId: string, folderId: string): Promise<void> {
  await canvaFetchRaw(`/folders/move`, {
    method: "POST",
    body: JSON.stringify({ to_folder_id: folderId, item_id: itemId }),
  });
}

// Cria um design editável a partir de um Brand Template (cópia) e devolve o id.
// Usado para semear a pasta do cliente com um modelo pronto para rebrand.
export async function criarDesignDoTemplate(brandTemplateId: string): Promise<string> {
  const j = await canvaFetch(`/designs`, {
    method: "POST",
    body: JSON.stringify({ type: "brand_template", brand_template_id: brandTemplateId }),
  });
  const id = j.design?.id;
  if (!id) throw new Error("Canva não retornou o design criado a partir do template.");
  return id as string;
}
