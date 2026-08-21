import "server-only";

// Geração de imagens por IA — Google Gemini 2.5 Flash Image ("Nano Banana").
// Escolhido por custo (~US$0,039/imagem), velocidade e fidelidade de prompt.
// Imagen 4 está descontinuado pelo Google (desliga em 17/08/2026).
// USAR SOMENTE NO SERVIDOR.

const MODEL = "gemini-2.5-flash-image";
const API = "https://generativelanguage.googleapis.com/v1beta";

// Preço público por imagem 1024px (usado para estimar custo nas métricas).
export const CUSTO_POR_IMAGEM_USD = 0.039;

// Gera uma imagem quadrada a partir do prompt e devolve os bytes do PNG.
export async function gerarImagem(apiKey: string, prompt: string): Promise<Buffer> {
  const r = await fetch(`${API}/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt} Square 1:1 aspect ratio.` }] }],
    }),
  });
  if (!r.ok) {
    throw new Error(`Gemini Image ${r.status}: ${(await r.text()).slice(0, 300)}`);
  }
  const j = await r.json();
  const parts = j.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p.inlineData ?? p.inline_data;
    if (inline?.data) return Buffer.from(inline.data as string, "base64");
  }
  throw new Error("Gemini não retornou nenhuma imagem.");
}
