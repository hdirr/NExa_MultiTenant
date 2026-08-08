import { createClient } from "@/lib/supabase/server";

export default async function AdminHome() {
  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("slug, nome_exibicao, status")
    .order("nome_exibicao");

  const total = tenants?.length ?? 0;
  const ativos = tenants?.filter((t) => t.status === "ativo").length ?? 0;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-line rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted">Tenants</div>
          <div className="text-3xl font-extrabold mt-1">{total}</div>
        </div>
        <div className="bg-card border border-line rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted">Ativos</div>
          <div className="text-3xl font-extrabold mt-1">{ativos}</div>
        </div>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wide text-muted mb-3">
        Tenants
      </h2>
      <div className="bg-card border border-line rounded-xl shadow-sm overflow-hidden">
        {total > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted bg-black/[0.02]">
                <th className="px-4 py-3 font-bold">Nome</th>
                <th className="px-4 py-3 font-bold">Slug</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants!.map((t) => (
                <tr key={t.slug} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">{t.nome_exibicao}</td>
                  <td className="px-4 py-3 text-muted">{t.slug}</td>
                  <td className="px-4 py-3">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-muted text-sm">
            Nenhum tenant ainda. A criação de tenants entra na Fase 2.
          </div>
        )}
      </div>
    </div>
  );
}
