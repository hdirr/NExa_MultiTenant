"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children = "Salvar",
}: {
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary self-start">
      {pending ? "Salvando…" : children}
    </button>
  );
}
