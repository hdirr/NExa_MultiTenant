import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
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
      <AppHeader
        initial="C"
        kicker="Painel de Controle"
        title="Conteúdo Engine"
        right={
          <>
            <Link href="/admin" className="hidden sm:inline text-sm font-semibold text-muted hover:text-foreground transition">
              Tenants
            </Link>
            <span className="hidden md:inline text-sm text-muted">{sp.fullName ?? sp.email}</span>
            <SignOutButton />
          </>
        }
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-6 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
