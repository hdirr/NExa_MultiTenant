"use client";

import { useState } from "react";
import { Section } from "@/components/form";
import SubmitButton from "@/components/SubmitButton";
import { setTenantCanvaTemplate, listCanvaTemplatesAction } from "../actions";

type Tpl = { id: string; title: string };

// Seletor de Brand Template do Canva: cola o ID manualmente OU clica em
// "Buscar templates" para listar os da conta e escolher — sem sair do app.
export default function CanvaTemplatePicker({
  tenantId,
  slug,
  current,
}: {
  tenantId: string;
  slug: string;
  current: string | null;
}) {
  const [value, setValue] = useState(current ?? "");
  const [list, setList] = useState<Tpl[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function buscar() {
    setLoading(true);
    setErr(null);
    try {
      const items = await listCanvaTemplatesAction();
      setList(items);
      if (items.length === 0) {
        setErr("Nenhum template com campos de autofill encontrado na conta Canva.");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={setTenantCanvaTemplate}>
      <input type="hidden" name="tenant_id" value={tenantId} />
      <input type="hidden" name="slug" value={slug} />
      <Section
        title="Template do Canva (arte)"
        desc="Brand Template com os campos hook, s2…s7, cta. O app preenche e exporta as imagens da peça de carrossel."
      >
        <div className="mb-3">
          {value ? (
            <span className="text-sm font-semibold text-emerald-700">✓ Template configurado</span>
          ) : (
            <span className="text-sm font-semibold text-amber-700">Nenhum template configurado</span>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="field-label">ID do Brand Template</span>
          <input
            name="canva_template_id"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="EAH… / BTM…"
            className="input"
          />
          <span className="text-xs text-muted">
            Cole o ID, ou use “Buscar templates” para escolher. Deixe vazio e salve para remover.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button type="button" onClick={buscar} disabled={loading} className="btn-ghost">
            {loading ? "Buscando…" : "🔎 Buscar templates do Canva"}
          </button>
          <SubmitButton>Salvar template</SubmitButton>
        </div>

        {err && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
            {err}
          </p>
        )}

        {list && list.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 border border-line rounded-lg p-2 max-h-64 overflow-auto">
            {list.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setValue(t.id)}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-black/[0.04] ${
                    value === t.id ? "bg-emerald-50 ring-1 ring-emerald-200" : ""
                  }`}
                >
                  <span className="text-sm font-medium">{t.title}</span>
                  <span className="block text-xs text-muted">{t.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </form>
  );
}
