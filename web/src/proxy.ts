import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next 16: "middleware" agora se chama proxy. Renova a sessão e faz a
// checagem otimista de login (a autorização por papel é reforçada nas
// camadas de dados / layouts do servidor).
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  // /cadastro é pública (auto-atendimento de novos negócios).
  const isAuthPage = path === "/login" || path === "/cadastro";

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // tudo, exceto assets estáticos e imagens
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
