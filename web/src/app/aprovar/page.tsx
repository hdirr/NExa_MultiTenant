import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
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
      <AppHeader
        width="max-w-3xl"
        initial="✓"
        kicker="Aprovações"
        title="Peças aguardando você"
        right={
          <>
            <Link href="/" className="text-sm font-semibold text-muted hover:text-foreground transition">
              Relatório
            </Link>
            <SignOutButton />
          </>
        }
      />

      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-8 sm:py-10 flex flex-col gap-4">
        {pieces && pieces.length > 0 ? (
          pieces.map((p) => {
            const texto =
              p.conteudo && typeof p.conteudo === "object" && "texto" in p.conteudo
                ? (p.conteudo as { texto?: string }).texto
                : null;
            return (
              <div key={p.id} className="card card-hover p-6">
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
                    className="input resize-y"
                  />
                  <div className="flex gap-3">
                    <button type="submit" name="decisao" value="aprovado" className="btn-primary">
                      Aprovar
                    </button>
                    <button
                      type="submit"
                      name="decisao"
                      value="reprovado"
                      className="btn-ghost !text-red-700 hover:!border-red-300 hover:!bg-red-50"
                    >
                      Reprovar
                    </button>
                  </div>
                </form>
              </div>
            );
          })
        ) : (
          <div className="card p-12 text-center text-muted">
            <div className="text-3xl mb-2">✅</div>
            <b className="text-foreground">Nada aguardando aprovação.</b>
            <br />
            Quando houver peças novas, elas aparecem aqui.
          </div>
        )}
      </main>
    </div>
  );
}
