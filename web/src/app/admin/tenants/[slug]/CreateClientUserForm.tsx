"use client";

import { useActionState } from "react";
import { createClientUser } from "../actions";
import { Field } from "@/components/form";
import SubmitButton from "@/components/SubmitButton";

// Formulário de criar acesso do cliente. Erros esperados (e-mail já
// cadastrado, senha curta, etc.) voltam como mensagem no próprio form,
// em vez de derrubarem a página num 500.
export default function CreateClientUserForm({
  tenantId,
  slug,
}: {
  tenantId: string;
  slug: string;
}) {
  const [state, formAction] = useActionState(createClientUser, null);

  return (
    <form action={formAction} className="grid sm:grid-cols-3 gap-3">
      <input type="hidden" name="tenant_id" value={tenantId} />
      <input type="hidden" name="slug" value={slug} />
      <Field label="Nome" name="nome" placeholder="Nome do cliente" />
      <Field
        label="E-mail"
        name="email"
        type="email"
        required
        placeholder="cliente@empresa.com"
      />
      <Field
        label="Senha inicial"
        name="password"
        placeholder="mín. 6 caracteres"
        hint="compartilhe com o cliente"
      />
      {state?.error && (
        <p className="sm:col-span-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <div className="sm:col-span-3">
        <SubmitButton>Criar acesso do cliente</SubmitButton>
      </div>
    </form>
  );
}
