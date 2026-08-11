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

async function canvaFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!r.ok) throw new Error(`Canva ${path} → ${r.status} ${await r.text()}`);
  return r.json();
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

// Preenche o Brand Template com a copy e retorna o design criado.
export async function autofillCarrossel(
  templateId: string,
  campos: Campos,
): Promise<{ designId: string; designUrl?: string }> {
  const data: Record<string, { type: "text"; text: string }> = {};
  for (const [k, v] of Object.entries(campos)) data[k] = { type: "text", text: v };
  const created = await canvaFetch(`/autofills`, {
    method: "POST",
    body: JSON.stringify({ brand_template_id: templateId, data }),
  });
  const job = await pollJob(`/autofills`, created.job.id);
  const design = job.result?.design;
  if (!design?.id) throw new Error("Autofill não retornou um design.");
  return { designId: design.id, designUrl: design.url };
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
