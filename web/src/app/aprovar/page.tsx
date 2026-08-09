import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { submitApproval } from "./actions";

export default async function AprovarPage() {
  const sp = await getSessionProfile();
  if (!sp) redirect("/login");

  const supabase = await createClient();
  // RLS restringe às peças do(s) tenant(s) do usuário.
  const { data: pieces } = await supabase
    .from("pieces")
    .select("id, titulo, formato, conteudo")
    .eq("status", "aguardando_aprovacao")
    .order("created_at", { ascending: false });

  return (
    <div className="flex-1">
      <header className="border-b border-line bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand text-white grid place-items-center font-extrabold">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-brand uppercase">
                Aprovações
              </div>
              <div className="font-semibold">Peças aguardando você</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-muted hover:text-foreground">
              Relatório
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-4">
        {pieces && pieces.length > 0 ? (
          pieces.map((p) => {
            const texto =
              p.conteudo && typeof p.conteudo === "object" && "texto" in p.conteudo
                ? (p.conteudo as { texto?: string }).texto
                : null;
            return (
              <div key={p.id} className="bg-card border border-line rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="font-bold text-lg">{p.titulo}</h2>
                  {p.formato && (
                    <span className="text-xs bg-black/[0.04] text-muted rounded px-2 py-0.5">
                      {p.formato}
                    </span>
                  )}
                </div>
                {texto && (
                  <p className="text-sm whitespace-pre-wrap text-foreground/90 border-l-2 border-line pl-3 my-3">
                    {texto}
                  </p>
                )}
                <form action={submitApproval} className="mt-4 flex flex-col gap-3">
                  <input type="hidden" name="piece_id" value={p.id} />
                  <textarea
                    name="comentario"
                    rows={2}
                    placeholder="Comentário (opcional — obrigatório se reprovar)"
                    className="border border-line rounded-lg px-3 py-2 outline-none focus:border-brand bg-card resize-y text-sm"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      name="decisao"
                      value="aprovado"
                      className="bg-brand text-white font-semibold rounded-lg px-4 py-2 hover:opacity-90 transition"
                    >
                      Aprovar
                    </button>
                    <button
                      type="submit"
                      name="decisao"
                      value="reprovado"
                      className="border border-red-300 text-red-700 font-semibold rounded-lg px-4 py-2 hover:bg-red-50 transition"
                    >
                      Reprovar
                    </button>
                  </div>
                </form>
              </div>
            );
          })
        ) : (
          <div className="bg-card border border-line rounded-2xl p-10 shadow-sm text-center text-muted">
            <b className="text-foreground">Nada aguardando aprovação.</b>
            <br />
            Quando houver peças novas, elas aparecem aqui.
          </div>
        )}
      </main>
    </div>
  );
}
