import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { UsersRound } from "lucide-react";
import { useEffect } from "react";
import { useRoute } from "wouter";

export default function InvitePage() {
  const [, params] = useRoute("/invitar/:token");
  const { user, loading } = useAuth();
  useEffect(() => { if (params?.token) localStorage.setItem("buyuyus-pending-invite", params.token); }, [params?.token]);
  return <main className="grid min-h-screen place-items-center bg-sidebar p-5 text-sidebar-foreground"><section className="w-full max-w-md rounded-3xl bg-card p-8 text-card-foreground shadow-2xl"><span className="court-mark grid h-11 w-11 place-items-center rounded-2xl bg-sky-300 text-sm font-black text-sidebar">B</span><p className="eyebrow mt-7">Buyuyus Basket Club</p><h1 className="display-face mt-2 text-4xl">Te han invitado al equipo.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Inicia sesión con la dirección de correo que recibió esta invitación. Al volver, tu acceso quedará preparado automáticamente.</p>{loading ? <p className="mt-7 text-sm text-muted-foreground">Comprobando acceso…</p> : user ? <p className="mt-7 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">La invitación se está activando. Puedes volver al panel.</p> : <Button onClick={() => startLogin()} className="mt-7 w-full rounded-xl">Iniciar sesión y unirme</Button>}</section></main>;
}
