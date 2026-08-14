// Componentes de formulário reutilizáveis (apresentacionais, server-safe).

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  hint,
  value,
  onChange,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const controlled = value !== undefined;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="field-label">{label}</span>
      <input
        name={name}
        type={type}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : (defaultValue ?? "")}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="input"
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="field-label">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className="input resize-y"
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="field-label">{label}</span>
      <select name={name} defaultValue={defaultValue ?? options[0]?.value} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card card-hover p-6 sm:p-7">
      <h2 className="font-bold text-lg tracking-tight">{title}</h2>
      {desc && <p className="text-sm text-muted mt-1 mb-5 max-w-2xl leading-relaxed">{desc}</p>}
      <div className={desc ? "" : "mt-5"}>{children}</div>
    </section>
  );
}
