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
  danger,
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
  danger?: boolean;
}) {
  const controlled = value !== undefined;
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`field-label ${danger ? "!text-red-600" : ""}`}>
        {label}
        {danger && <span className="font-normal"> · falta preencher</span>}
      </span>
      <input
        name={name}
        type={type}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : (defaultValue ?? "")}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`input ${danger ? "input-danger" : ""}`}
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
  danger,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`field-label ${danger ? "!text-red-600" : ""}`}>
        {label}
        {danger && <span className="font-normal"> · falta preencher</span>}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className={`input resize-y ${danger ? "input-danger" : ""}`}
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
  danger,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  danger?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={`field-label ${danger ? "!text-red-600" : ""}`}>
        {label}
        {danger && <span className="font-normal"> · falta preencher</span>}
      </span>
      <select
        name={name}
        defaultValue={defaultValue ?? options[0]?.value}
        className={`input ${danger ? "input-danger" : ""}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// Grupo de checkboxes em formato de pílula. No servidor, leia os valores
// marcados com formData.getAll(name).
export function CheckboxGroup({
  label,
  name,
  options,
  defaultValue = [],
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="field-label mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="check-chip">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={defaultValue.includes(o.value)}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Section({
  title,
  desc,
  id,
  children,
}: {
  title: string;
  desc?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="card card-hover p-6 sm:p-7 scroll-mt-24">
      <h2 className="font-bold text-lg tracking-tight">{title}</h2>
      {desc && <p className="text-sm text-muted mt-1 mb-5 max-w-2xl leading-relaxed">{desc}</p>}
      <div className={desc ? "" : "mt-5"}>{children}</div>
    </section>
  );
}
