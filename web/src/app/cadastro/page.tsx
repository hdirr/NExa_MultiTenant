"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupTenant, type SignupState } from "./actions";

const slugify = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

export default function CadastroPage() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signupTenant, {});
  const [empresa, setEmpresa] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  if (state.ok) {
    return (
      <main className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-md card p-7 text-center" style={{ boxShadow: "var(--shadow-lg)" }}>
          <div className="text-4xl">🎉</div>
          <h1 className="text-xl font-bold mt-3">Cadastro recebido!</h1>
          <p className="text-sm text-muted mt-2">
            Criamos a área do seu negócio. Agora é só{" "}
            <Link href="/login" className="font-semibold underline">
              entrar com o e-mail e a senha
            </Link>{" "}
            que você cadastrou e completar o briefing.
          </p>
          <p className="text-xs text-muted mt-3">
            A produção de conteúdo libera após a ativação pela nossa equipe (costuma levar até 1 dia útil).
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="logo-mark" style={{ width: 52, height: 52, fontSize: 22, borderRadius: 15 }}>
            C
          </div>
          <div className="kicker mt-4">Conteúdo Engine</div>
          <h1 className="text-2xl font-bold tracking-tight mt-1">Cadastre seu negócio</h1>
          <p className="text-sm text-muted mt-1">
            Crie a conta da sua empresa em 1 minuto. Depois complete o briefing no seu ritmo.
          </p>
        </div>

        <form action={action} className="card p-6 sm:p-7 flex flex-col gap-4" style={{ boxShadow: "var(--shadow-lg)" }}>
          {/* Honeypot anti-bot */}
          <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Nome da empresa *</span>
            <input
              type="text"
              name="nome_exibicao"
              required
              value={empresa}
              onChange={(e) => {
                setEmpresa(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className="input"
              placeholder="Ex.: Padaria Pão de Ouro"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Identificador (endereço da sua área)</span>
            <input
              type="text"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className="input"
              placeholder="padaria-pao-de-ouro"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="field-label">Seu nome</span>
              <input type="text" name="nome" className="input" placeholder="Cesar Andrade" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="field-label">E-mail *</span>
              <input type="email" name="email" required className="input" placeholder="voce@empresa.com" />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="field-label">Senha *</span>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="input"
              placeholder="mínimo 6 caracteres"
            />
          </label>

          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-muted select-none">
              Opcional: já me conte sobre o negócio (+)
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="field-label">O que você vende?</span>
                <textarea
                  name="o_que_vende"
                  rows={2}
                  className="input"
                  placeholder="Ex.: pães artesanais, bolos sob encomenda e café especial"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="field-label">Para quem?</span>
                <textarea
                  name="para_quem"
                  rows={2}
                  className="input"
                  placeholder="Ex.: moradores do bairro que valorizam pão fresco todos os dias"
                />
              </label>
            </div>
          </details>

          {state.error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary w-full justify-center mt-1">
            {pending ? "Criando conta…" : "Criar minha conta"}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-5">
          Já tem conta?{" "}
          <Link href="/login" className="font-semibold underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
