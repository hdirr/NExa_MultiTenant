"use client";

import { useState } from "react";

// Campo com ideias prontas: clicar numa ideia preenche o valor, que pode ser
// editado livremente depois. Salva como qualquer input (usa o atributo name).
// Funciona não-controlado (defaultValue) ou controlado (value+onChange).
export default function SuggestionField({
  label,
  name,
  defaultValue = "",
  value,
  onChange,
  placeholder,
  required,
  multiline,
  rows = 3,
  suggestions,
  danger,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  suggestions?: string[];
  danger?: boolean;
  hint?: string;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const val = value ?? inner;
  const set = (v: string) => (onChange ? onChange(v) : setInner(v));
  const cls = `input ${danger ? "input-danger" : ""}`;
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`field-label ${danger ? "!text-red-600" : ""}`}>
        {label}
        {danger && <span className="font-normal"> · falta preencher</span>}
      </span>
      {multiline ? (
        <textarea
          name={name}
          value={val}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={rows}
          className={`${cls} resize-y`}
        />
      ) : (
        <input
          name={name}
          type="text"
          value={val}
          onChange={(e) => set(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cls}
        />
      )}
      {hint && <span className="text-xs text-muted">{hint}</span>}
      {suggestions && suggestions.length > 0 && (
        <span className="flex flex-wrap items-center gap-1.5">
          {suggestions.map((sg) => (
            <button key={sg} type="button" onClick={() => set(sg)} className="idea-chip">
              {sg}
            </button>
          ))}
        </span>
      )}
    </label>
  );
}
