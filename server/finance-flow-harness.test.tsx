/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminPaymentSubmitButton } from "../client/src/pages/FinancesPage";
import { AdminPaymentForm } from "../client/src/components/AdminPaymentForm";
import { PaymentComment } from "../client/src/components/PaymentComment";
import { habitualMovementMode, keepsHabitualFeePresetOnPlayerChange, prepareHabitualMovement } from "../client/src/lib/financePresentation";

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

function PlayerFeePresetHarness() {
  const [playerId, setPlayerId] = useState("none");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [preserveFeePreset, setPreserveFeePreset] = useState(false);
  const chooseHabitualFee = () => {
    const prepared = prepareHabitualMovement({ defaultAmountCents: 6000, defaultAccountId: null, defaultConcept: "Cuota de jugador", direction: "income" });
    if (habitualMovementMode("Cuota de jugador") === "payment") {
      setConcept(prepared.concept);
      setAmount(prepared.amount);
      setPreserveFeePreset(true);
    }
  };
  const choosePlayer = (value: string) => {
    setPlayerId(value);
    if (!keepsHabitualFeePresetOnPlayerChange(preserveFeePreset)) {
      setConcept("");
      setAmount("");
    }
  };
  return <div><button onClick={chooseHabitualFee}>Cuota de jugador</button><label>Quién paga<select aria-label="Quién paga" value={playerId} onChange={(event) => choosePlayer(event.target.value)}><option value="none">Sin asignar</option><option value="8">Jugador Uno</option></select></label><label>Concepto de nueva cuota<input aria-label="Concepto de nueva cuota" value={concept} readOnly /></label><label>Importe<input aria-label="Importe" value={amount} readOnly /></label></div>;
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

  it("mantiene concepto e importe al seleccionar Quién paga desde Cuota de jugador", async () => {
    const user = userEvent.setup();
    render(<PlayerFeePresetHarness />);
    await user.click(screen.getByRole("button", { name: "Cuota de jugador" }));
    await user.selectOptions(screen.getByLabelText("Quién paga"), "8");
    expect(screen.getByLabelText("Concepto de nueva cuota")).toHaveProperty("value", "Cuota de jugador");
    expect(screen.getByLabelText("Importe")).toHaveProperty("value", "60");
  });

  it("conserva el valor precargado en el formulario real Registrar cobro", async () => {
    const user = userEvent.setup();
    render(<AdminPaymentForm players={[{ player: { id: 8, fullName: "Jugador Uno", status: "active", isActiveCurrentSeason: true } }]} charges={[]} accounts={[{ account: { id: 3, name: "Caja Juanlu", isActive: true } }]} initialConcept="Cuota de jugador" initialAmount="60" preserveInitialFee={true} pending={false} onCancel={() => undefined} onSubmit={() => undefined} />);
    await user.selectOptions(screen.getByLabelText("Quién paga"), "8");
    expect(screen.getByLabelText("Concepto de nueva cuota")).toHaveProperty("value", "Cuota de jugador");
    expect(screen.getByLabelText("Importe")).toHaveProperty("value", "60");
  });
});
