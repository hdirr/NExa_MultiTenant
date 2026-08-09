"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children = "Salvar",
}: {
  children?: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand text-white font-semibold rounded-lg px-4 py-2.5 hover:opacity-90 disabled:opacity-60 transition self-start"
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}
