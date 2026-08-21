"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { createTenant } from "../actions";
import { Field, Select, Section } from "@/components/form";
import SuggestionField from "@/components/SuggestionField";
import SubmitButton from "@/components/SubmitButton";
import { slugify } from "@/lib/slugify";

// Exemplo pronto para testes: um clique preenche o form com dados plausíveis.
const TESTE = {
  vende: "Organiza e automatiza o atendimento de PMEs com CRM, IA e automações",
  publico: "Donos e gerentes de PMEs que atendem clientes pelo WhatsApp",
  diferencial: "Implantação consultiva — não é software genérico pra configurar sozinho",
};

export default function NewTenantPage() {
  const [state, formAction] = useActionState(createTenant, null);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [vende, setVende] = useState("");
  const [publico, setPublico] = useState("");
  const [diferencial, setDiferencial] = useState("");
  const slugEditado = useRef(false);

  function onNomeChange(v: string) {
    setNome(v);
    if (!slugEditado.current) setSlug(slugify(v));
  }

  function preencherTeste() {
    const dia = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const n = `Teste ${dia}`;
    setNome(n);
    setSlug(slugify(n));
    slugEditado.current = false;
    setVende(TESTE.vende);
    setPublico(TESTE.publico);
    setDiferencial(TESTE.diferencial);
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">
        ← Voltar ao painel
      </Link>
      <div className="flex items-center justify-between mt-2 mb-6">
        <h1 className="text-2xl font-bold">Novo tenant</h1>
        <button type="button" onClick={preencherTeste} className="btn-ghost">
          Preencher com dados de teste
        </button>
      </div>

      <form action={formAction}>
        <Section
          title="Dados do tenant"
          desc="Só o nome é obrigatório — o slug é gerado automaticamente. O restante pode ficar para depois."
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Nome de exibição"
              name="nome_exibicao"
              value={nome}
              onChange={(e) => onNomeChange(e.target.value)}
              placeholder="ex: Leaf Comex"
              required
            />
            <Field
              label="Slug (identificador)"
              name="slug"
              value={slug}
              onChange={(e) => {
                slugEditado.current = true;
                setSlug(e.target.value);
              }}
              placeholder="gerado do nome"
              hint="Apenas letras minúsculas, números e hífen. Deixe vazio para gerar do nome."
            />
            <Select
              label="Status"
              name="status"
              options={[
                { value: "ativo", label: "Ativo" },
                { value: "pausado", label: "Pausado" },
                { value: "arquivado", label: "Arquivado" },
              ]}
            />
            <Select
              label="Objetivo"
              name="objetivo"
              options={[
                { value: "lead", label: "Lead" },
                { value: "autoridade", label: "Autoridade" },
                { value: "educacao", label: "Educação" },
                { value: "retencao", label: "Retenção" },
              ]}
            />
            <details className="sm:col-span-2 border border-line rounded-xl px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-muted select-none">
                Preencher dados de negócio (opcional)
              </summary>
              <div className="grid gap-4 pt-4">
                <SuggestionField
                  label="O que vende"
                  name="negocio_vende"
                  value={vende}
                  onChange={setVende}
                  placeholder="Uma frase"
                  suggestions={[
                    "Software de gestão para pequenas empresas",
                    "Consultoria de marketing digital",
                    "Curso online com mentoria",
                  ]}
                />
                <SuggestionField
                  label="Para quem"
                  name="negocio_publico"
                  value={publico}
                  onChange={setPublico}
                  placeholder="Cargo, porte, setor"
                  suggestions={[
                    "Donos de PME (5–50 funcionários)",
                    "Gerentes de marketing",
                    "Famílias com renda média",
                  ]}
                />
                <SuggestionField
                  label="Diferencial"
                  name="negocio_diferencial"
                  value={diferencial}
                  onChange={setDiferencial}
                  suggestions={[
                    "Garantia de resultado em 90 dias",
                    "Atendimento humano, sem robô",
                    "Implementação em uma semana",
                  ]}
                />
              </div>
            </details>
          </div>

          {state?.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
              {state.error}
            </p>
          )}

          <div className="mt-5">
            <SubmitButton>Criar tenant</SubmitButton>
          </div>
        </Section>
      </form>
    </div>
  );
}
