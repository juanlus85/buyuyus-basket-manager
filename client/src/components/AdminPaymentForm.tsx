import React, { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PaymentMethod = "cash" | "bank_transfer" | "bizum" | "paypal";

type Props = {
  players: any[];
  charges: any[];
  accounts: any[];
  initialConcept: string;
  initialAmount: string;
  preserveInitialFee: boolean;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (data: { playerId: string; chargeId: string; accountId: string; concept: string; amount: string; method: PaymentMethod; comment: string; paidAt: string }) => void;
};

export function AdminPaymentForm({ players, charges, accounts, initialConcept, initialAmount, preserveInitialFee, pending, onCancel, onSubmit }: Props) {
  const [playerId, setPlayerId] = useState("none");
  const [chargeId, setChargeId] = useState("none");
  const [accountId, setAccountId] = useState("none");
  const [concept, setConcept] = useState(initialConcept === "none" ? "" : initialConcept);
  const [amount, setAmount] = useState(initialAmount);
  const [method, setMethod] = useState<PaymentMethod>("bizum");
  const [comment, setComment] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const openCharges = charges.filter(item => item.charge.playerId === Number(playerId) && item.charge.status === "open");

  const choosePlayer = (value: string) => {
    setPlayerId(value);
    setChargeId("none");
    if (!preserveInitialFee) { setConcept(""); setAmount(""); }
  };
  const chooseCharge = (value: string) => {
    setChargeId(value);
    const charge = charges.find(item => String(item.charge.id) === value);
    if (charge) { setConcept(charge.charge.concept); setAmount(String(charge.charge.amountCents / 100)); }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ playerId, chargeId, accountId, concept, amount, method, comment, paidAt });
  };

  return <form onSubmit={submit} className="paper-card mt-6 grid gap-4 p-5 lg:grid-cols-4">
    <div className="lg:col-span-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900"><strong>Paso 1.</strong> Selecciona quién paga. Después elige una de sus cuotas pendientes o crea una cuota individual para registrar el cobro.</div>
    <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Quién paga</span><select aria-label="Quién paga" value={playerId} onChange={event => choosePlayer(event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="none">Sin asignar</option>{players.filter(item => item.player.status === "active" && item.player.isActiveCurrentSeason).map(item => <option key={item.player.id} value={String(item.player.id)}>{item.player.fullName}</option>)}</select></label>
    <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Cuota o cargo pendiente</span><select aria-label="Cuota o cargo pendiente" value={chargeId} onChange={event => chooseCharge(event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="none">Sin asignar</option>{openCharges.map(item => <option key={item.charge.id} value={String(item.charge.id)}>{item.charge.concept} · {(item.charge.amountCents / 100).toFixed(2)} €</option>)}</select>{playerId !== "none" && openCharges.length === 0 ? <p className="text-xs text-muted-foreground">No tiene cuotas abiertas. Puedes crear una cuota individual con el concepto e importe.</p> : null}</label>
    <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Concepto de nueva cuota</span><Input aria-label="Concepto de nueva cuota" value={concept} onChange={event => setConcept(event.target.value)} placeholder="Ej.: Cuota de liga" className="rounded-xl" /></label>
    <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Caja receptora</span><select aria-label="Caja receptora" value={accountId} onChange={event => setAccountId(event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="none">Sin asignar</option>{accounts.filter(item => item.account.isActive).map(item => <option key={item.account.id} value={String(item.account.id)}>{item.account.name}</option>)}</select></label>
    <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Importe (€)</span><Input aria-label="Importe" value={amount} onChange={event => setAmount(event.target.value)} type="number" step="0.01" required className="rounded-xl" /></label>
    <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Fecha</span><Input value={paidAt} onChange={event => setPaidAt(event.target.value)} type="date" required className="rounded-xl" /></label>
    <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Método</span><select value={method} onChange={event => setMethod(event.target.value as PaymentMethod)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="cash">Efectivo</option><option value="bank_transfer">Transferencia</option><option value="bizum">Bizum</option><option value="paypal">PayPal</option></select></label>
    <label className="space-y-2"><span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Comentario opcional</span><Input value={comment} onChange={event => setComment(event.target.value)} placeholder="Referencia o aclaración" className="rounded-xl" /></label>
    <div className="lg:col-span-4 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button disabled={pending || playerId === "none" || accountId === "none" || (!concept.trim() && chargeId === "none")} className="rounded-xl" type="submit">Confirmar y descontar deuda</Button></div>
  </form>;
}
