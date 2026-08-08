import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

// Área do cliente. Admin é redirecionado para /admin.
export default async function Home() {
  const sp = await getSessionProfile();
  if (!sp) redirect("/login");
  if (sp.role === "admin") redirect("/admin");

  // RLS garante que só vêm os tenants de que o usuário é membro.
  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("slug, nome_exibicao, negocio_vende")
    .order("nome_exibicao");

  const primeiro = tenants?.[0];

  return (
    <div className="flex-1">
      <header className="border-b border-line bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand text-white grid place-items-center font-extrabold">
              {(primeiro?.nome_exibicao ?? "C").charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-brand uppercase">
                Relatório de Conteúdo
              </div>
              <div className="font-semibold">
                {primeiro?.nome_exibicao ?? "Seu painel"}
              </div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {primeiro ? (
          <div className="bg-card border border-line rounded-2xl p-8 shadow-sm">
            <p className="text-muted text-sm mb-1">
              Bem-vindo, {sp.fullName ?? sp.email}.
            </p>
            <h1 className="text-2xl font-bold mb-2">
              {primeiro.nome_exibicao}
            </h1>
            {primeiro.negocio_vende && (
              <p className="text-muted">{primeiro.negocio_vende}</p>
            )}
            <div className="mt-6 text-sm text-muted border-t border-line pt-6">
              O relatório com peças entregues e desempenho aparece aqui na
              próxima fase. Você está autenticado e vendo apenas o seu conteúdo.
            </div>
          </div>
        ) : (
          <div className="bg-card border border-line rounded-2xl p-8 shadow-sm text-center text-muted">
            Nenhum conteúdo associado à sua conta ainda.
          </div>
        )}
      </main>
    </div>
  );
}
