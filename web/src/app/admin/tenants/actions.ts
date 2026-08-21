"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile, requireTenantAdmin, exigirTenantAtivo } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import {
  getTenantKey,
  getTenantImageKey,
  getTenantCanvaTemplate,
  gerarPauta,
  gerarPeca,
  gerarCarrosselCampos,
  revisarMarca,
} from "@/lib/generate";
import { gerarImagem, CUSTO_POR_IMAGEM_USD } from "@/lib/imagens";
import {
  autofillCarrossel,
  exportarPng,
  isCanvaConnected,
  listarBrandTemplates,
  datasetDoTemplate,
  uploadAsset,
  provisionCanvaForTenant,
  criarPasta,
  moverParaPasta,
  type BrandTemplateItem,
} from "@/lib/canva";
import type { SupabaseClient } from "@supabase/supabase-js";

const s = (fd: FormData, k: string) => (fd.get(k) as string | null)?.trim() ?? "";

async function requireAdmin() {
  const sp = await getSessionProfile();
  if (!sp || sp.role !== "admin") throw new Error("não autorizado");
}

export type CreateTenantState = { error: string } | null;

export async function createTenant(
  _prev: CreateTenantState,
  formData: FormData,
): Promise<CreateTenantState> {
  await requireAdmin();
  const nome = s(formData, "nome_exibicao");
  const slugDigitado = s(formData, "slug").toLowerCase().trim();
  const autoSlug = !slugDigitado;
  const slug = autoSlug ? slugify(nome) : slugDigitado;
  if (!slug) {
    return {
      error: "Informe o nome do tenant (o slug é gerado automaticamente a partir dele).",
    };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      error: "Slug inválido: use apenas letras minúsculas, números e hífen (sem espaços ou acentos).",
    };
  }
  const admin = createAdminClient();
  // Slug digitado tem prioridade; se estiver em uso, erro amigável. Slug
  // automático tenta variantes (teste-2, teste-3…) para não travar o fluxo.
  let novo: { id: string } | null = null;
  let slugUsado = slug;
  for (let attempt = 0; attempt < 10 && !novo; attempt++) {
    const candidato = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data, error } = await admin
      .from("tenants")
      .insert({
        slug: candidato,
        nome_exibicao: nome || candidato,
        status: s(formData, "status") || "ativo",
        objetivo: s(formData, "objetivo") || null,
        aprovador: s(formData, "aprovador") || null,
        negocio_vende: s(formData, "negocio_vende") || null,
        negocio_publico: s(formData, "negocio_publico") || null,
        negocio_dor: s(formData, "negocio_dor") || null,
        negocio_diferencial: s(formData, "negocio_diferencial") || null,
      })
      .select("id")
      .single();
    if (!error) {
      novo = data;
      slugUsado = candidato;
      break;
    }
    // 23505 = unique_violation (slug já existe). Slug digitado → erro amigável.
    if (error.code !== "23505") return { error: error.message };
    if (!autoSlug) {
      return { error: `Já existe um tenant com o slug "${slug}". Escolha outro identificador.` };
    }
  }
  if (!novo) {
    return { error: `Não foi possível gerar um slug único a partir de "${slug}".` };
  }
  const tenantId = novo.id as string;

  // Provisiona a pasta do cliente no Canva + uma cópia do modelo-mestre dentro
  // dela. Best-effort: se o Canva não estiver conectado / sem escopo, ignora.
  try {
    await provisionCanvaForTenant(admin, tenantId, nome || slug);
  } catch (e) {
    console.error("Canva: provisionamento do tenant (ignorado):", (e as Error).message);
  }

  revalidatePath("/admin");
  redirect(`/admin/tenants/${slugUsado}`);
}

// Cria a pasta do tenant no Canva e semeia uma cópia editável do template-mestre
// dentro dela (modelo pronto para rebrand). Guarda o folder_id no tenant.
// (Implementação vive em lib/canva.ts para o cadastro autônomo reutilizar.)

export async function updateTenant(formData: FormData) {
  const sp = await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const supabase = await createClient();
  // Status só muda pela agência: owner envia o form sem esse campo, e o
  // gatilho do banco (0010) bloqueia qualquer tentativa de todo modo.
  const statusPatch = sp.role === "admin" ? { status: s(formData, "status") } : {};
  const { error } = await supabase
    .from("tenants")
    .update({
      nome_exibicao: s(formData, "nome_exibicao"),
      ...statusPatch,
      objetivo: s(formData, "objetivo") || null,
      aprovador: s(formData, "aprovador") || null,
      negocio_vende: s(formData, "negocio_vende") || null,
      negocio_publico: s(formData, "negocio_publico") || null,
      negocio_dor: s(formData, "negocio_dor") || null,
      negocio_diferencial: s(formData, "negocio_diferencial") || null,
    })
    .eq("slug", slug);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/tenants/${slug}`);
  revalidatePath("/admin");
}

export async function upsertContext(formData: FormData) {
  await requireTenantAdmin(formData);
  const tenantId = s(formData, "tenant_id");
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_context").upsert(
    {
      tenant_id: tenantId,
      o_que_vende: s(formData, "o_que_vende") || null,
      para_quem: s(formData, "para_quem") || null,
      dor: s(formData, "dor") || null,
      prova_disponivel: s(formData, "prova_disponivel") || null,
      objecoes: s(formData, "objecoes") || null,
      concorrentes: s(formData, "concorrentes") || null,
      referencias: s(formData, "referencias") || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
  revalidatePath("/admin");
}

export async function upsertVoice(formData: FormData) {
  await requireTenantAdmin(formData);
  const tenantId = s(formData, "tenant_id");
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("tenant_voice").upsert(
    {
      tenant_id: tenantId,
      somos: s(formData, "somos") || null,
      nao_somos: s(formData, "nao_somos") || null,
      palavras_proibidas: s(formData, "palavras_proibidas") || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

export async function addChannel(formData: FormData) {
  await requireTenantAdmin(formData);
  const tenantId = s(formData, "tenant_id");
  const slug = s(formData, "slug");
  const formatos = formData.getAll("formatos").map((v) => String(v).trim()).filter(Boolean);
  const freq = s(formData, "frequencia_semanal");
  const supabase = await createClient();
  const { error } = await supabase.from("channels").insert({
    tenant_id: tenantId,
    rede: s(formData, "rede"),
    handle: s(formData, "handle") || null,
    formatos,
    frequencia_semanal: freq ? Number(freq) : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

export async function deleteChannel(formData: FormData) {
  await requireTenantAdmin(formData);
  const id = s(formData, "id");
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("channels").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

const n = (fd: FormData, k: string) => {
  const v = parseFloat(s(fd, k).replace(",", "."));
  return isNaN(v) ? 0 : v;
};

function revalidateProducao(slug: string) {
  revalidatePath(`/admin/tenants/${slug}/producao`);
  revalidatePath("/admin");
}

// ── Pauta ───────────────────────────────────────────────────────────────────
export async function addPauta(formData: FormData) {
  await requireTenantAdmin(formData);
  await exigirTenantAtivo(s(formData, "slug"));
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("pauta_items").insert({
    tenant_id: s(formData, "tenant_id"),
    tema: s(formData, "tema"),
    angulo: s(formData, "angulo") || null,
    formato: s(formData, "formato") || null,
    objetivo: s(formData, "objetivo") || null,
    status: s(formData, "status") || "backlog",
  });
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function updatePautaStatus(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pauta_items")
    .update({ status: s(formData, "status") })
    .eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function deletePauta(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("pauta_items").delete().eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

// ── Publicados ───────────────────────────────────────────────────────────────
export async function addPublished(formData: FormData) {
  await requireTenantAdmin(formData);
  await exigirTenantAtivo(s(formData, "slug"));
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("published").insert({
    tenant_id: s(formData, "tenant_id"),
    data: s(formData, "data") || null,
    tema: s(formData, "tema") || null,
    formato: s(formData, "formato") || null,
    canal: s(formData, "canal") || null,
    link: s(formData, "link") || null,
    desempenho: s(formData, "desempenho") || null,
  });
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function deletePublished(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("published").delete().eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

// ── Métricas ─────────────────────────────────────────────────────────────────
export async function addMetric(formData: FormData) {
  await requireTenantAdmin(formData);
  await exigirTenantAtivo(s(formData, "slug"));
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("metrics").insert({
    tenant_id: s(formData, "tenant_id"),
    data: s(formData, "data") || null,
    formato: s(formData, "formato") || null,
    pecas_geradas: n(formData, "pecas_geradas"),
    pecas_aprovadas: n(formData, "pecas_aprovadas"),
    tokens_entrada: n(formData, "tokens_entrada"),
    tokens_saida: n(formData, "tokens_saida"),
    custo_usd: n(formData, "custo_usd"),
    minutos_ciclo: n(formData, "minutos_ciclo"),
  });
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function deleteMetric(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("metrics").delete().eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

// ── Peças ────────────────────────────────────────────────────────────────────
export async function addPiece(formData: FormData) {
  await requireTenantAdmin(formData);
  await exigirTenantAtivo(s(formData, "slug"));
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("pieces").insert({
    tenant_id: s(formData, "tenant_id"),
    titulo: s(formData, "titulo"),
    formato: s(formData, "formato") || null,
    conteudo: s(formData, "conteudo") ? { texto: s(formData, "conteudo") } : null,
    status: "rascunho",
  });
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
}

export async function sendPieceForApproval(formData: FormData) {
  await requireTenantAdmin(formData);
  await exigirTenantAtivo(s(formData, "slug"));
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pieces")
    .update({ status: "aguardando_aprovacao" })
    .eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
  revalidatePath("/admin");
}

export async function deletePiece(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase.from("pieces").delete().eq("id", s(formData, "id"));
  if (error) throw new Error(error.message);
  revalidateProducao(slug);
  revalidatePath("/admin");
}

// ── Usuários-cliente (usa a Secret key via admin client) ─────────────────────
export type CreateClientUserState = { error: string } | null;

export async function createClientUser(
  _prev: CreateClientUserState,
  formData: FormData,
): Promise<CreateClientUserState> {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const email = s(formData, "email").toLowerCase();
  const password = s(formData, "password");
  const nome = s(formData, "nome") || email;
  if (!email) return { error: "Informe o e-mail do cliente." };
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: nome },
  });
  if (error) {
    if (error.code === "email_exists") {
      return {
        error: `Já existe uma conta com o e-mail "${email}". Use outro e-mail para criar um novo acesso.`,
      };
    }
    return { error: `Não foi possível criar o usuário: ${error.message}` };
  }
  const uid = created.user.id;

  // Garante perfil como cliente e associa ao tenant.
  const { error: pErr } = await admin
    .from("profiles")
    .update({ full_name: nome, role: "client" })
    .eq("id", uid);
  if (pErr) {
    return { error: `Não foi possível configurar o perfil: ${pErr.message}` };
  }
  const { error: mErr } = await admin
    .from("tenant_members")
    .insert({ tenant_id: tenantId, profile_id: uid });
  if (mErr) {
    return { error: `Não foi possível vincular ao tenant: ${mErr.message}` };
  }

  revalidatePath(`/admin/tenants/${slug}`);
  return null;
}

export async function removeMember(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const profileId = s(formData, "profile_id");
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_members")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

// ── IA (Fase 4) ──────────────────────────────────────────────────────────────
export async function setTenantKey(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const key = s(formData, "anthropic_key");
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_secrets")
    .upsert(
      { tenant_id: tenantId, anthropic_key: key || null, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

// Salva a chave do gerador de imagens (Gemini/Nano Banana) do tenant.
export async function setTenantImageKey(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const key = s(formData, "image_api_key");
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenant_secrets")
    .upsert(
      { tenant_id: tenantId, image_api_key: key || null, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

// Salva o Brand Template do Canva (BTM…) do tenant.
export async function setTenantCanvaTemplate(formData: FormData) {
  await requireTenantAdmin(formData);
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const templateId = s(formData, "canva_template_id");
  const admin = createAdminClient();
  const { error } = await admin.from("tenant_secrets").upsert(
    {
      tenant_id: tenantId,
      canva_template_id: templateId || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/tenants/${slug}`);
}

// Carrega o contexto isolado do tenant para os prompts de IA.
async function carregarContexto(tenantId: string) {
  const supabase = await createClient();
  const [{ data: tenant }, { data: ctx }, { data: voice }, { data: pubs }] =
    await Promise.all([
      supabase.from("tenants").select("id, nome_exibicao, objetivo").eq("id", tenantId).single(),
      supabase.from("tenant_context").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenant_voice").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("published").select("tema").eq("tenant_id", tenantId),
    ]);
  return {
    t: { id: tenantId, nome: tenant?.nome_exibicao ?? "", objetivo: tenant?.objetivo },
    ctx: ctx ?? {},
    voice: voice ?? {},
    publicadosTemas: (pubs ?? []).map((p) => p.tema).filter(Boolean) as string[],
  };
}

async function logMetric(
  tenantId: string,
  formato: string,
  geradas: number,
  aprovadas: number,
  usage: { input: number; output: number; custo: number },
) {
  const admin = createAdminClient();
  await admin.from("metrics").insert({
    tenant_id: tenantId,
    data: new Date().toISOString().slice(0, 10),
    formato,
    pecas_geradas: geradas,
    pecas_aprovadas: aprovadas,
    tokens_entrada: usage.input,
    tokens_saida: usage.output,
    custo_usd: usage.custo,
    minutos_ciclo: 0,
  });
}

export async function generatePautaAI(formData: FormData) {
  await requireTenantAdmin(formData);
  await exigirTenantAtivo(s(formData, "slug"));
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const key = await getTenantKey(tenantId);
  if (!key) throw new Error("Configure a chave Anthropic deste tenant antes de gerar.");

  const { t, ctx, voice, publicadosTemas } = await carregarContexto(tenantId);
  const { parsed, usage } = await gerarPauta(key, t, ctx, voice, publicadosTemas);
  const temas: { tema: string; angulo: string; formato: string; objetivo: string }[] =
    parsed?.temas ?? [];

  const admin = createAdminClient();
  if (temas.length) {
    await admin.from("pauta_items").insert(
      temas.map((x) => ({
        tenant_id: tenantId,
        tema: x.tema,
        angulo: x.angulo,
        formato: x.formato,
        objetivo: x.objetivo,
        status: "backlog",
      })),
    );
  }
  await logMetric(tenantId, "pauta", temas.length, 0, usage);
  revalidatePath(`/admin/tenants/${slug}/producao`);
  revalidatePath("/admin");
}

export async function generatePieceAI(formData: FormData) {
  await requireTenantAdmin(formData);
  await exigirTenantAtivo(s(formData, "slug"));
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const pautaId = s(formData, "pauta_id");
  const key = await getTenantKey(tenantId);
  if (!key) throw new Error("Configure a chave Anthropic deste tenant antes de gerar.");

  const supabase = await createClient();
  const { data: pauta } = await supabase
    .from("pauta_items")
    .select("tema, angulo, formato")
    .eq("id", pautaId)
    .single();
  if (!pauta) throw new Error("Tema de pauta não encontrado.");

  const { t, ctx, voice, publicadosTemas } = await carregarContexto(tenantId);
  const formato = pauta.formato || "post";
  const isCarrossel = /carrossel|carousel/i.test(formato);

  // Carrossel sai em campos nomeados (hook, s2..s7, cta) p/ o autofill do Canva.
  // Outros formatos seguem no textão único.
  let texto: string;
  let titulo: string;
  let campos: Record<string, string> | null = null;
  let promptsImagem: string[] | null = null;
  let usageGen: { input: number; output: number; custo: number };

  if (isCarrossel) {
    const c = await gerarCarrosselCampos(key, t, ctx, voice, publicadosTemas, pauta.tema, pauta.angulo);
    campos = (c.parsed as Record<string, string> | null) ?? null;
    promptsImagem = (c.parsed as { imagens?: string[] } | null)?.imagens ?? null;
    const ordem = ["hook", "s2", "s3", "s4", "s5", "s6", "s7", "cta"];
    texto = ordem.map((k, i) => `${i + 1}. ${campos?.[k] ?? ""}`).join("\n");
    titulo = pauta.tema;
    usageGen = c.usage;
  } else {
    const peca = await gerarPeca(key, t, ctx, voice, publicadosTemas, pauta.tema, pauta.angulo, formato);
    texto = peca.parsed?.conteudo ?? "";
    titulo = peca.parsed?.titulo ?? pauta.tema;
    usageGen = peca.usage;
  }

  // Gate: revisão de marca antes de virar peça.
  const rev = await revisarMarca(key, t, ctx, voice, publicadosTemas, texto);
  const aprovado: boolean = rev.parsed?.aprovado ?? false;
  const bloqueantes = rev.parsed?.bloqueantes ?? [];

  const admin = createAdminClient();
  const { data: novaPeca, error: pErr } = await admin
    .from("pieces")
    .insert({
      tenant_id: tenantId,
      pauta_id: pautaId,
      formato,
      titulo,
      conteudo: { texto, campos, imagens: promptsImagem, revisao: { aprovado, bloqueantes } },
      status: "rascunho",
    })
    .select("id")
    .single();
  if (pErr) throw new Error(pErr.message);

  // Arte automática: se a peça saiu em campos (carrossel) e passou pela revisão
  // de marca, preenche o Brand Template (texto + imagens geradas por IA) e
  // exporta os PNGs na hora — o design chega completo na pasta do cliente no
  // Canva. Best-effort: falha no Canva não descarta a peça.
  let custoImagens = 0;
  if (campos && aprovado) {
    try {
      custoImagens = await gerarArteDaPeca(admin, tenantId, slug, novaPeca!.id as string);
    } catch (e) {
      console.error("Canva: arte automática da peça (ignorado):", (e as Error).message);
    }
  }

  const usage = {
    input: usageGen.input + rev.usage.input,
    output: usageGen.output + rev.usage.output,
    custo: usageGen.custo + rev.usage.custo + custoImagens,
  };
  await logMetric(tenantId, formato, 1, aprovado ? 1 : 0, usage);

  revalidatePath(`/admin/tenants/${slug}/producao`);
  revalidatePath("/admin");
}

// Gera a arte da peça no Canva: preenche o Brand Template com os campos e
// exporta as imagens. Requer conta Canva conectada + template no tenant.
export async function generateArtAI(formData: FormData) {
  await requireTenantAdmin(formData);
  await exigirTenantAtivo(s(formData, "slug"));
  const slug = s(formData, "slug");
  const tenantId = s(formData, "tenant_id");
  const pieceId = s(formData, "piece_id");

  const admin = createAdminClient();
  await gerarArteDaPeca(admin, tenantId, slug, pieceId);
  revalidateProducao(slug);
}

// Núcleo da geração de arte: autofill do Brand Template com os campos de texto
// + imagens geradas por IA nos campos de imagem do template, organização na
// pasta do cliente e export dos PNGs (rehospedados no Storage). Devolve o custo
// estimado das imagens (US$). Lança em caso de erro fatal — o chamador decide.
async function gerarArteDaPeca(
  admin: SupabaseClient,
  tenantId: string,
  slug: string,
  pieceId: string,
): Promise<number> {
  const templateId = await getTenantCanvaTemplate(tenantId);
  if (!templateId) {
    throw new Error("Configure o Brand Template do Canva deste tenant antes de gerar arte.");
  }
  if (!(await isCanvaConnected())) {
    throw new Error("Conecte a conta Canva da agência no painel antes de gerar arte.");
  }

  const supabase = await createClient();
  const [{ data: piece }, { data: tenant }] = await Promise.all([
    supabase.from("pieces").select("conteudo").eq("id", pieceId).single(),
    supabase.from("tenants").select("nome_exibicao").eq("id", tenantId).maybeSingle(),
  ]);
  const conteudo = (piece?.conteudo ?? null) as {
    campos?: Record<string, string>;
    imagens?: string[];
  } | null;
  const campos = conteudo?.campos;
  if (!campos || Object.keys(campos).length === 0) {
    throw new Error("Esta peça não tem campos de carrossel. Gere a peça no formato carrossel primeiro.");
  }

  // Campos de IMAGEM do template → gera uma imagem IA por campo (até o nº de
  // prompts salvos na peça). Falha em uma imagem não derruba a arte: segue
  // só com texto.
  const imagensData: Record<string, string> = {};
  let custoImagens = 0;
  const imageFields = Object.entries(await datasetDoTemplate(templateId))
    .filter(([, def]) => def.type === "image")
    .map(([name]) => name)
    .sort();
  const prompts = conteudo?.imagens ?? [];
  if (imageFields.length > 0 && prompts.length > 0) {
    const imgKey = await getTenantImageKey(tenantId);
    if (!imgKey) {
      console.error("Imagens IA: sem chave configurada para o tenant — arte sai só com texto.");
    } else {
      for (let i = 0; i < Math.min(imageFields.length, prompts.length); i++) {
        try {
          const png = await gerarImagem(imgKey, prompts[i]);
          const assetId = await uploadAsset(png, `nexa-${pieceId}-${i + 1}.png`);
          imagensData[imageFields[i]] = assetId;
          custoImagens += CUSTO_POR_IMAGEM_USD;
        } catch (e) {
          console.error(`Imagens IA: campo ${imageFields[i]} (ignorado):`, (e as Error).message);
          break;
        }
      }
    }
  }

  const { designId } = await autofillCarrossel(templateId, campos, imagensData);

  // Organiza o design na pasta do cliente no Canva. Best-effort: se faltar o
  // escopo folder:write (reconectar) ou falhar, NÃO quebra a geração da arte.
  try {
    const nome = (tenant?.nome_exibicao as string | undefined) || slug;
    const folderId = await getOrCreateTenantFolder(admin, tenantId, nome);
    await moverParaPasta(designId, folderId);
  } catch (e) {
    console.error("Canva: não movi para a pasta do cliente (ignorado):", (e as Error).message);
  }

  const urls = await exportarPng(designId);

  // Rehospeda os PNGs no Storage para não expirarem (URLs do Canva duram ~24h).
  const imagens = await rehospedarImagens(admin, tenantId, pieceId, urls);

  await admin
    .from("pieces")
    .update({ arte: { design_id: designId, imagens } })
    .eq("id", pieceId);

  return custoImagens;
}

// Acha (ou cria uma vez) a pasta do Canva do tenant e devolve o id.
async function getOrCreateTenantFolder(
  admin: SupabaseClient,
  tenantId: string,
  nome: string,
): Promise<string> {
  const { data } = await admin
    .from("tenant_secrets")
    .select("canva_folder_id")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const existing = (data?.canva_folder_id as string | null) ?? null;
  if (existing) return existing;

  const folderId = await criarPasta(`NExa — ${nome}`);
  await admin.from("tenant_secrets").upsert(
    { tenant_id: tenantId, canva_folder_id: folderId, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id" },
  );
  return folderId;
}

// Baixa cada PNG do Canva e rehospeda no bucket público "artes". Se algo
// falhar, cai de volta na URL do Canva (efêmera) para não perder a imagem.
async function rehospedarImagens(
  admin: SupabaseClient,
  tenantId: string,
  pieceId: string,
  urls: string[],
): Promise<string[]> {
  const out: string[] = [];
  const stamp = Date.now();
  for (let i = 0; i < urls.length; i++) {
    try {
      const resp = await fetch(urls[i]);
      if (!resp.ok) throw new Error(`download ${resp.status}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      const path = `${tenantId}/${pieceId}/${stamp}-${i + 1}.png`;
      const { error } = await admin.storage
        .from("artes")
        .upload(path, buf, { contentType: "image/png", upsert: true });
      if (error) throw new Error(error.message);
      out.push(admin.storage.from("artes").getPublicUrl(path).data.publicUrl);
    } catch (e) {
      console.error("Rehospedar arte (usando URL do Canva):", (e as Error).message);
      out.push(urls[i]);
    }
  }
  return out;
}

// Lista os Brand Templates da conta Canva (para o seletor no painel do tenant).
// Somente autenticação: é leitura; o owner precisa dela para escolher o
// template do próprio tenant.
export async function listCanvaTemplatesAction(): Promise<BrandTemplateItem[]> {
  const sp = await getSessionProfile();
  if (!sp) throw new Error("não autenticado");
  if (!(await isCanvaConnected())) {
    throw new Error("Conecte a conta Canva da agência no painel antes de buscar templates.");
  }
  return listarBrandTemplates();
}

// Exclui o tenant e TODO o conteúdo relacionado (cascata no banco: pautas,
// peças, aprovações, contexto, voz, canais, métricas, secrets/template).
// NÃO remove os usuários de login (podem existir fora deste tenant).
export async function deleteTenant(formData: FormData) {
  await requireAdmin();
  const tenantId = s(formData, "tenant_id");
  if (!tenantId) throw new Error("tenant inválido");
  const admin = createAdminClient();
  const { error } = await admin.from("tenants").delete().eq("id", tenantId);
  if (error) throw new Error(error.message);
  redirect("/admin");
}

// Ativa / pausa / arquiva um tenant — decisão exclusiva da agência (Fase 7).
// Usado pela fila de "pendentes" no painel admin.
export async function setTenantStatus(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  const status = s(formData, "status");
  if (!["ativo", "pausado", "arquivado"].includes(status)) {
    throw new Error(`status inválido: ${status}`);
  }
  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
