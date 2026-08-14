// Converte texto livre em slug URL-safe: minúsculas, sem acento, sem símbolos,
// espaços viram hífen. Usado para gerar o slug do tenant a partir do nome.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
