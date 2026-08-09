import Link from "next/link";
import { createTenant } from "../actions";
import { Field, Select, Section } from "@/components/form";
import SubmitButton from "@/components/SubmitButton";

export default function NewTenantPage() {
  return (
    <div className="max-w-2xl">
      <Link
        href="/admin"
        className="text-sm text-muted hover:text-foreground"
      >
        ← Voltar ao painel
      </Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Novo tenant</h1>

      <form action={createTenant}>
        <Section
          title="Dados do tenant"
          desc="O contexto, a voz e os canais você preenche depois de criar."
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Slug (identificador)"
              name="slug"
              required
              placeholder="ex: leaf"
              hint="Apenas letras minúsculas, números e hífen."
            />
            <Field label="Nome de exibição" name="nome_exibicao" placeholder="ex: Leaf Comex" />
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
                { value: "autoridade", label: "Autoridade" },
                { value: "lead", label: "Lead" },
                { value: "educacao", label: "Educação" },
                { value: "retencao", label: "Retenção" },
              ]}
            />
            <Field label="Aprovador" name="aprovador" placeholder="Nome de quem aprova" />
            <Field label="O que vende" name="negocio_vende" placeholder="Uma frase" />
            <Field label="Para quem" name="negocio_publico" placeholder="Cargo, porte, setor" />
            <Field label="Diferencial" name="negocio_diferencial" />
          </div>
          <div className="mt-5">
            <SubmitButton>Criar tenant</SubmitButton>
          </div>
        </Section>
      </form>
    </div>
  );
}
