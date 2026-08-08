import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";

// Guarda de rota: só admin acessa /admin/*. A autorização é reforçada aqui
// (camada de servidor), não só no proxy.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sp = await getSessionProfile();
  if (!sp) redirect("/login");
  if (sp.role !== "admin") redirect("/");

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-line bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand text-white grid place-items-center font-extrabold">
              C
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-brand uppercase">
                Painel de Controle
              </div>
              <div className="font-semibold">Conteúdo Engine</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm font-semibold text-muted hover:text-foreground"
            >
              Tenants
            </Link>
            <span className="text-sm text-muted">
              {sp.fullName ?? sp.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  );
}
