// Vocabulários fixos da interface — evitam digitação livre onde o valor é padronizado.
// Os valores devem bater com o que a IA usa (ver lib/generate.ts) e com os dados existentes.

export const FORMATOS = [
  { value: "carrossel", label: "Carrossel" },
  { value: "reels", label: "Reels" },
  { value: "post", label: "Post" },
  { value: "stories", label: "Stories" },
];

export const REDES = [
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "newsletter", label: "Newsletter" },
];

export const OBJETIVOS = [
  { value: "autoridade", label: "Autoridade" },
  { value: "lead", label: "Lead" },
  { value: "educacao", label: "Educação" },
  { value: "retencao", label: "Retenção" },
];

// Motivos prontos para reprovação — viram texto no comentário da aprovação.
export const MOTIVOS_REPROVACAO = [
  { value: "hook fraco", label: "Hook fraco" },
  { value: "fora do tom de voz", label: "Fora do tom de voz" },
  { value: "prova insuficiente", label: "Prova insuficiente" },
  { value: "erro de fato ou número", label: "Erro de fato/número" },
  { value: "CTA fraco", label: "CTA fraco" },
  { value: "muito longo", label: "Muito longo" },
];
