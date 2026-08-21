import { getSessionProfile } from "@/lib/auth";
import PerfilForm from "./PerfilForm";

export default async function PerfilPage() {
  const sp = await getSessionProfile();
  if (!sp) return null;

  return (
    <div>
      <div className="mb-6">
        <div className="kicker">Sua conta</div>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Perfil</h1>
        <p className="text-sm text-muted mt-1">
          Atualize seu nome e senha quando quiser — sem precisar pedir para a agência.
        </p>
      </div>
      <PerfilForm email={sp.email} nomeAtual={sp.fullName} />
    </div>
  );
}
