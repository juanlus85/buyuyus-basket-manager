import { useAuth } from "@/_core/hooks/useAuth";
import { ShieldAlert } from "lucide-react";
import { ReactNode } from "react";

export function AdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role === "admin") return <>{children}</>;
  return (
    <div className="paper-card mx-auto mt-16 max-w-lg p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-700"><ShieldAlert className="h-6 w-6" /></span>
      <h1 className="display-face mt-5 text-3xl">Área restringida</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Esta pantalla está reservada a los administradores del equipo.</p>
    </div>
  );
}
