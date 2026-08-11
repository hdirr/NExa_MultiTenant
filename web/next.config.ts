import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 bloqueia recursos de dev (_next/static) quando o app é acessado por
  // um host "cross-origin". Como o fluxo OAuth do Canva usa 127.0.0.1 (redirect
  // URI + cookie PKCE), liberamos esse host no dev para o app hidratar.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
