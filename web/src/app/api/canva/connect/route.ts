import { NextResponse } from "next/server";
import crypto from "crypto";

// Inicia o OAuth do Canva (Connect API) com PKCE. Guarda verifier+state em
// cookies httpOnly e redireciona para a tela de autorização do Canva.

const AUTH_URL = "https://www.canva.com/api/oauth/authorize";
const SCOPES = [
  "design:content:read",
  "design:content:write",
  "design:meta:read",
  "brandtemplate:meta:read",
  "brandtemplate:content:read",
  "asset:read",
].join(" ");

const b64url = (b: Buffer) =>
  b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function GET(request: Request) {
  const clientId = process.env.CANVA_CLIENT_ID;
  if (!clientId) {
    return new Response("CANVA_CLIENT_ID não configurado no .env.local.", { status: 500 });
  }
  const origin = new URL(request.url).origin;
  const redirectUri = process.env.CANVA_REDIRECT_URI ?? `${origin}/api/canva/callback`;

  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));

  const url = new URL(AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  const opts = {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("canva_verifier", verifier, opts);
  res.cookies.set("canva_state", state, opts);
  return res;
}
