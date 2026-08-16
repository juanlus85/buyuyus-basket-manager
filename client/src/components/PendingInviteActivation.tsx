import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function PendingInviteActivation() {
  const { user } = useAuth();
  const attempted = useRef(false);
  const accept = trpc.invites.accept.useMutation({ onSuccess: () => { localStorage.removeItem("buyuyus-pending-invite"); toast.success("Invitación aceptada. Bienvenido a Buyuyus Basket."); } });
  useEffect(() => {
    const token = localStorage.getItem("buyuyus-pending-invite");
    if (!user || !token || attempted.current) return;
    attempted.current = true;
    accept.mutate({ token });
  }, [user, accept]);
  return null;
}
