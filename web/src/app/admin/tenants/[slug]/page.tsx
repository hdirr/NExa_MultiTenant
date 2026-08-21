import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Field, TextArea, Select, CheckboxGroup, Section } from "@/components/form";
import SuggestionField from "@/components/SuggestionField";
import { FORMATOS, REDES } from "@/lib/opcoes";
import SubmitButton from "@/components/SubmitButton";
import CanvaTemplatePicker from "./CanvaTemplatePicker";
import DeleteTenantButton from "./DeleteTenantButton";
import CreateClientUserForm from "./CreateClientUserForm";
import {
  updateTenant,
  upsertContext,
  upsertVoice,
  addChannel,
  deleteChannel,
  removeMember,
  setTenantKey,
  setTenantImageKey,
} from "../actions";
import { tenantHasKey, tenantHasImageKey, getTenantCanvaTemplate } from "@/lib/generate";

export default async function EditTenantPage({
  params,
}: PageProps<"/admin/tenants/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!tenant) notFound();

  const [{ data: context }, { data: voice }, { data: channels }, { data: members }] =
    await Promise.all([
      supabase.from("tenant_context").select("*").eq("tenant_id", tenant.id).maybeSingle(),
      supabase.from("tenant_voice").select("*").eq("tenant_id", tenant.id).maybeSingle(),
      supabase.from("channels").select("*").eq("tenant_id", tenant.id).order("rede"),
      supabase
        .from("tenant_members")
        .select("profile_id, profiles(full_name, role)")
        .eq("tenant_id", tenant.id),
    ]);

  const hasKey = await tenantHasKey(tenant.id);
  const hasImageKey = await tenantHasImageKey(tenant.id);
  const canvaTemplate = await getTenantCanvaTemplate(tenant.id);

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Voltar ao painel
        </Link>
        <h1 className="text-2xl font-bold mt-2">{tenant.nome_exibicao}</h1>
        <p className="text-sm text-muted">{tenant.slug}</p>
        <Link
          href={`/admin/tenants/${tenant.slug}/producao`}
          className="inline-block mt-3 text-sm font-semibold text-brand hover:underline"
        >
          Gerenciar pauta, publicados e métricas →
        </Link>
      </div>

      {/* Dados */}
      <form action={updateTenant}>
        <input type="hidden" name="slug" value={tenant.slug} />
        <Section title="Dados">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome de exibição" name="nome_exibicao" defaultValue={tenant.nome_exibicao} />
            <Select
              label="Status"
              name="status"
              defaultValue={tenant.status}
              options={[
                { value: "ativo", label: "Ativo" },
                { value: "pausado", label: "Pausado" },
                { value: "arquivado", label: "Arquivado" },
              ]}
            />
            <Select
              label="Objetivo"
              name="objetivo"
              defaultValue={tenant.objetivo}
              options={[
                { value: "autoridade", label: "Autoridade" },
                { value: "lead", label: "Lead" },
                { value: "educacao", label: "Educação" },
                { value: "retencao", label: "Retenção" },
              ]}
            />
            <Field label="Aprovador" name="aprovador" defaultValue={tenant.aprovador} />
            <SuggestionField
              label="O que vende"
              name="negocio_vende"
              defaultValue={tenant.negocio_vende}
              danger={!tenant.negocio_vende}
              suggestions={[
                "Software de gestão para pequenas empresas",
                "Consultoria de marketing digital",
                "Curso online com mentoria",
              ]}
            />
            <SuggestionField
              label="Para quem"
              name="negocio_publico"
              defaultValue={tenant.negocio_publico}
              danger={!tenant.negocio_publico}
              suggestions={[
                "Donos de PME (5–50 funcionários)",
                "Gerentes de marketing",
                "Famílias com renda média",
              ]}
            />
            <SuggestionField
              label="Dor"
              name="negocio_dor"
              defaultValue={tenant.negocio_dor}
              danger={!tenant.negocio_dor}
              suggestions={[
                "Perde horas por semana em processo manual",
                "Não sabe se o investimento em marketing volta",
                "Depende de um único especialista",
              ]}
            />
            <SuggestionField
              label="Diferencial"
              name="negocio_diferencial"
              defaultValue={tenant.negocio_diferencial}
              danger={!tenant.negocio_diferencial}
              suggestions={[
                "Garantia de resultado em 90 dias",
                "Atendimento humano, sem robô",
                "Implementação em uma semana",
              ]}
            />
          </div>
          <div className="mt-5">
            <SubmitButton />
          </div>
        </Section>
      </form>

      {/* Contexto */}
      <form action={upsertContext}>
        <input type="hidden" name="tenant_id" value={tenant.id} />
        <input type="hidden" name="slug" value={tenant.slug} />
        <Section
          title="Contexto"
          desc="A Prova disponível é a ÚNICA fonte de números, cases e depoimentos que a produção pode afirmar."
        >
          <div className="flex flex-col gap-4">
            <SuggestionField
              label="O que vende"
              name="o_que_vende"
              defaultValue={context?.o_que_vende}
              multiline
              rows={2}
              danger={!context?.o_que_vende}
              suggestions={[
                "Plano mensal de [serviço] com entrega em [prazo]",
                "Produto [categoria] vendido direto ao consumidor",
              ]}
            />
            <SuggestionField
              label="Para quem"
              name="para_quem"
              defaultValue={context?.para_quem}
              multiline
              rows={2}
              danger={!context?.para_quem}
              suggestions={[
                "Pessoas que já tentaram [alternativa] e falharam",
                "Empresas com [porte] no setor [setor]",
              ]}
            />
            <SuggestionField
              label="A dor (palavras do cliente)"
              name="dor"
              defaultValue={context?.dor}
              multiline
              rows={2}
              danger={!context?.dor}
              suggestions={[
                "“Perco tempo demais com [tarefa]”",
                "“Já paguei por [solução] e não funcionou”",
              ]}
            />
            <SuggestionField
              label="★ Prova disponível"
              name="prova_disponivel"
              defaultValue={context?.prova_disponivel}
              multiline
              rows={4}
              danger={!context?.prova_disponivel}
              hint="Números reais, cases com resultado, depoimentos aprovados. Nada fora daqui pode ser afirmado como fato."
              suggestions={[
                "Case: cliente X cresceu 3x em 6 meses (com aprovação)",
                "+500 clientes atendidos desde 2020",
                "Depoimento aprovado: “…”",
              ]}
            />
            <TextArea label="Objeções" name="objecoes" defaultValue={context?.objecoes} rows={2} />
            <TextArea label="Concorrentes e diferença" name="concorrentes" defaultValue={context?.concorrentes} rows={2} />
            <TextArea label="Referências que funcionaram" name="referencias" defaultValue={context?.referencias} rows={2} />
          </div>
          <div className="mt-5">
            <SubmitButton>Salvar contexto</SubmitButton>
          </div>
        </Section>
      </form>

      {/* Voz */}
      <form action={upsertVoice}>
        <input type="hidden" name="tenant_id" value={tenant.id} />
        <input type="hidden" name="slug" value={tenant.slug} />
        <Section title="Voz">
          <div className="flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <SuggestionField
                label="Somos"
                name="somos"
                defaultValue={voice?.somos}
                multiline
                rows={2}
                danger={!voice?.somos}
                suggestions={[
                  "Direto, técnico e calmo",
                  "Próximo do cliente, sem jargão",
                ]}
              />
              <SuggestionField
                label="Não somos"
                name="nao_somos"
                defaultValue={voice?.nao_somos}
                multiline
                rows={2}
                danger={!voice?.nao_somos}
                suggestions={[
                  "Vendedores agressivos",
                  "Corporativo e formal demais",
                ]}
              />
            </div>
            <TextArea
              label="Palavras proibidas (jargão deste tenant)"
              name="palavras_proibidas"
              defaultValue={voice?.palavras_proibidas}
              rows={2}
            />
          </div>
          <div className="mt-5">
            <SubmitButton>Salvar voz</SubmitButton>
          </div>
        </Section>
      </form>

      {/* Canais */}
      <Section title="Canais">
        {channels && channels.length > 0 ? (
          <ul className="flex flex-col gap-2 mb-4">
            {channels.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between border border-line rounded-lg px-3 py-2"
              >
                <span className="text-sm">
                  <span className="font-semibold capitalize">{c.rede}</span>
                  {c.handle ? ` · ${c.handle}` : ""}
                  {c.formatos?.length ? (
                    <span className="text-muted"> · {c.formatos.join(", ")}</span>
                  ) : null}
                  {c.frequencia_semanal ? (
                    <span className="text-muted"> · {c.frequencia_semanal}x/sem</span>
                  ) : null}
                </span>
                <form action={deleteChannel}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="slug" value={tenant.slug} />
                  <button className="text-xs text-red-600 hover:underline">remover</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">Nenhum canal ainda.</p>
        )}

        <form action={addChannel} className="flex flex-col gap-3">
          <input type="hidden" name="tenant_id" value={tenant.id} />
          <input type="hidden" name="slug" value={tenant.slug} />
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <Select label="Rede" name="rede" options={REDES} />
            <Field label="Handle" name="handle" placeholder="@marca" />
            <Field label="Freq/sem" name="frequencia_semanal" type="number" />
          </div>
          <CheckboxGroup label="Formatos" name="formatos" options={FORMATOS} />
          <div>
            <SubmitButton>Adicionar canal</SubmitButton>
          </div>
        </form>
      </Section>

      {/* Chave Anthropic (IA) */}
      <form action={setTenantKey}>
        <input type="hidden" name="tenant_id" value={tenant.id} />
        <input type="hidden" name="slug" value={tenant.slug} />
        <Section
          title="Chave Anthropic (IA)"
          desc="Modelo A: cada empresa usa a própria conta Anthropic e paga direto. A chave fica só no servidor, nunca aparece no navegador."
        >
          <div className="mb-3">
            {hasKey ? (
              <span className="text-sm font-semibold text-emerald-700">✓ Chave configurada</span>
            ) : (
              <span className="text-sm font-semibold text-amber-700">Nenhuma chave configurada</span>
            )}
          </div>
          <Field
            label={hasKey ? "Substituir chave" : "Chave Anthropic (sk-ant-…)"}
            name="anthropic_key"
            type="password"
            placeholder="sk-ant-..."
            hint="Cole a chave da conta Anthropic da empresa. Deixe vazio e salve para remover."
          />
          <div className="mt-4">
            <SubmitButton>Salvar chave</SubmitButton>
          </div>
        </Section>
      </form>

      {/* Brand Template do Canva (arte) */}
      <CanvaTemplatePicker tenantId={tenant.id} slug={tenant.slug} current={canvaTemplate} />

      {/* Chave de imagem (IA) */}
      <form action={setTenantImageKey}>
        <input type="hidden" name="tenant_id" value={tenant.id} />
        <input type="hidden" name="slug" value={tenant.slug} />
        <Section
          title="Chave de imagem (IA)"
          desc="Gera as imagens dos slides com o Google Gemini (Nano Banana), ~US$ 0,04 por imagem. Se ficar vazia, usa a chave da agência (GEMINI_API_KEY no servidor)."
        >
          <div className="mb-3">
            {hasImageKey ? (
              <span className="text-sm font-semibold text-emerald-700">✓ Chave configurada</span>
            ) : (
              <span className="text-sm font-semibold text-amber-700">Nenhuma chave configurada</span>
            )}
          </div>
          <Field
            label={hasImageKey ? "Substituir chave" : "Chave Gemini (AIza…)"}
            name="image_api_key"
            type="password"
            placeholder="AIza..."
            hint="Cole a chave da conta Google AI Studio da empresa. Deixe vazio e salve para remover."
          />
          <div className="mt-4">
            <SubmitButton>Salvar chave de imagem</SubmitButton>
          </div>
        </Section>
      </form>

      {/* Usuários-cliente */}
      <Section
        title="Usuários (clientes)"
        desc="Contas que fazem login e veem só o relatório deste tenant. Passe as credenciais ao cliente."
      >
        {members && members.length > 0 ? (
          <ul className="flex flex-col gap-2 mb-4">
            {members.map((m) => {
              const prof = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              return (
                <li
                  key={m.profile_id}
                  className="flex items-center justify-between border border-line rounded-lg px-3 py-2"
                >
                  <span className="text-sm">
                    <span className="font-semibold">
                      {prof?.full_name ?? m.profile_id}
                    </span>
                    <span className="text-muted"> · {prof?.role ?? "client"}</span>
                  </span>
                  <form action={removeMember}>
                    <input type="hidden" name="tenant_id" value={tenant.id} />
                    <input type="hidden" name="profile_id" value={m.profile_id} />
                    <input type="hidden" name="slug" value={tenant.slug} />
                    <button className="text-xs text-red-600 hover:underline">
                      desvincular
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted mb-4">Nenhum usuário-cliente ainda.</p>
        )}

        <CreateClientUserForm tenantId={tenant.id} slug={tenant.slug} />
      </Section>

      {/* Zona de perigo */}
      <section className="card p-6 sm:p-7 border border-red-200">
        <h2 className="font-bold text-lg tracking-tight text-red-700">Zona de perigo</h2>
        <p className="text-sm text-muted mt-1 mb-5 max-w-2xl leading-relaxed">
          Excluir o tenant apaga permanentemente todo o conteúdo dele (pautas, peças, aprovações,
          contexto, voz, canais, chave e template). Os usuários de login não são removidos.
        </p>
        <DeleteTenantButton
          tenantId={tenant.id}
          nome={tenant.nome_exibicao ?? tenant.slug}
        />
      </section>
    </div>
  );
}
