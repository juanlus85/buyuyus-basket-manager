import { describe, expect, it } from "vitest";
import { calculateOutstandingCents, calculateStatement, guestTrainingPreset, paymentComment } from "./finances";

describe("calculateStatement", () => {
  it("excluye cargos cancelados y pagos no confirmados del saldo exigible", () => {
    const result = calculateStatement(
      [
        { amountCents: 6000, status: "open" },
        { amountCents: 1500, status: "settled" },
        { amountCents: 800, status: "cancelled" },
      ],
      [
        { amountCents: 3000, status: "confirmed" },
        { amountCents: 1500, status: "pending" },
        { amountCents: 1000, status: "rejected" },
      ]
    );

    expect(result).toEqual({
      chargedCents: 7500,
      confirmedCents: 3000,
      pendingCents: 1500,
      balanceCents: 4500,
    });
  });
});

describe("calculateOutstandingCents", () => {
  it("reduce la deuda solo por pagos confirmados y nunca devuelve saldo negativo", () => {
    expect(calculateOutstandingCents(6000, [{ amountCents: 2000, status: "confirmed" }, { amountCents: 1000, status: "pending" }])).toBe(4000);
    expect(calculateOutstandingCents(6000, [{ amountCents: 8000, status: "confirmed" }])).toBe(0);
  });
});

describe("paymentComment", () => {
  it("expone el comentario administrativo y conserva la nota del jugador si no existe revisión", () => {
    expect(paymentComment("Recibido en mano", "Bizum enviado")).toBe("Recibido en mano");
    expect(paymentComment(null, "Bizum enviado")).toBe("Bizum enviado");
    expect(paymentComment(null, null)).toBeNull();
  });
});

describe("guestTrainingPreset", () => {
  it("mantiene Invitado Entreno como ingreso habitual de 3 €", () => {
    expect(guestTrainingPreset).toMatchObject({ name: "Invitado Entreno", direction: "income", defaultAmountCents: 300, defaultConcept: "Invitado Entreno" });
  });
});
