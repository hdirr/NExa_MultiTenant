import { NextResponse, type NextRequest } from "next/server";
import { saveCanvaTokens } from "@/lib/canva";

// Callback do OAuth do Canva: troca o code por tokens (usando o verifier PKCE)
// e grava em canva_connection. Volta para /admin com um status na query.

const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const back = (q: string) => NextResponse.redirect(`${origin}/admin?canva=${q}`);

  if (url.searchParams.get("error")) return back("erro");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verifier = request.cookies.get("canva_verifier")?.value;
  const savedState = request.cookies.get("canva_state")?.value;
  if (!code || !state || !verifier || state !== savedState) return back("falha");

  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) return back("sem_credenciais");
  // Mesmo redirect derivado do origin usado no /connect (não usa env).
  const redirectUri = `${origin}/api/canva/callback`;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
  });
  if (!r.ok) return back("token_erro");
  const j = await r.json();
  await saveCanvaTokens(j.access_token, j.refresh_token, j.expires_in ?? 14400);
  return back("conectado");
}
