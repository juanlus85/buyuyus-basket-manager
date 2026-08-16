/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminPaymentSubmitButton } from "../client/src/pages/FinancesPage";
import { PaymentComment } from "../client/src/components/PaymentComment";
import { prepareHabitualMovement } from "../client/src/lib/financePresentation";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

afterEach(cleanup);
const guestTemplate = { defaultAmountCents: 300, defaultAccountId: 3, defaultConcept: "Invitado Entreno", direction: "income" as const };

function FinanceFlowHarness() {
  const [playerId, setPlayerId] = useState("");
  const [chargeId, setChargeId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [habitual, setHabitual] = useState<{ concept: string; directionLabel: string; amount: string } | null>(null);
  return <div>
    <label>Jugador<select aria-label="Jugador" value={playerId} onChange={(event) => setPlayerId(event.target.value)}><option value="">Sin jugador</option><option value="8">Jugador Uno</option></select></label>
    <label>Cuota<select aria-label="Cuota" value={chargeId} onChange={(event) => setChargeId(event.target.value)}><option value="">Sin cuota</option><option value="15">Liga · Primer pago</option></select></label>
    <label>Caja<select aria-label="Caja" value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">Sin caja</option><option value="3">Caja Juanlu</option></select></label>
    <AdminPaymentSubmitButton pending={false} playerId={playerId || "none"} chargeId={chargeId || "none"} accountId={accountId || "none"} />
    <label>Movimiento habitual<select aria-label="Movimiento habitual" defaultValue="" onChange={(event) => { if (event.target.value !== "guest") return setHabitual(null); const entry = prepareHabitualMovement(guestTemplate); setHabitual({ concept: entry.concept, directionLabel: entry.directionLabel, amount: entry.amount }); }}><option value="">Selecciona un movimiento</option><option value="guest">Invitado Entreno</option></select></label>
    {habitual ? <p>{habitual.concept} · {habitual.directionLabel} · {habitual.amount} €</p> : null}
    <section aria-label="Historial administrativo"><PaymentComment note="Rival: CB Norte" /></section>
    <section aria-label="Vista del jugador"><PaymentComment note="Referencia del jugador" /></section>
  </div>;
}

describe("arnés de flujo contable", () => {
  it("muestra comentarios en historial administrativo y vista de jugador, y precarga Invitado Entreno de 3 € desde el selector", async () => {
    const user = userEvent.setup();
    render(<FinanceFlowHarness />);
    expect(screen.getByRole("region", { name: "Historial administrativo" }).textContent).toContain("Comentario: Rival: CB Norte");
    expect(screen.getByRole("region", { name: "Vista del jugador" }).textContent).toContain("Comentario: Referencia del jugador");
    await user.selectOptions(screen.getByLabelText("Movimiento habitual"), "guest");
    expect(screen.getByText("Invitado Entreno · Ingreso · 3 €")).toBeTruthy();
  });

  it("mantiene el cobro bloqueado hasta elegir jugador, cuota y caja", async () => {
    const user = userEvent.setup();
    render(<FinanceFlowHarness />);
    const submit = screen.getByRole("button", { name: "Confirmar y descontar deuda" });
    expect(submit).toHaveProperty("disabled", true);
    await user.selectOptions(screen.getByLabelText("Jugador"), "8");
    await user.selectOptions(screen.getByLabelText("Cuota"), "15");
    await user.selectOptions(screen.getByLabelText("Caja"), "3");
    expect(screen.getByRole("button", { name: "Confirmar y descontar deuda" })).toHaveProperty("disabled", false);
  });
});
