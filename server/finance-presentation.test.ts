import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PaymentComment } from "../client/src/components/PaymentComment";
import { canRecordAdminPayment, prepareHabitualMovement, visiblePaymentComment } from "../client/src/lib/financePresentation";

describe("presentación de contabilidad", () => {
  it("prepara Invitado Entreno como ingreso de 3 € y muestra su concepto", () => {
    expect(prepareHabitualMovement({ defaultAmountCents: 300, defaultAccountId: null, defaultConcept: "Invitado Entreno", direction: "income" })).toEqual({ amount: "3", accountId: "none", concept: "Invitado Entreno", directionLabel: "Ingreso" });
  });

  it("convierte una nota guardada en el texto visible del historial", () => {
    expect(visiblePaymentComment("Pago entregado tras entrenar")).toBe("Comentario: Pago entregado tras entrenar");
    expect(visiblePaymentComment(null)).toBeNull();
  });

  it("renderiza el comentario guardado en la interfaz de pagos", () => {
    expect(renderToStaticMarkup(createElement(PaymentComment, { note: "Pago entregado tras entrenar" }))).toContain("Comentario: Pago entregado tras entrenar");
    expect(renderToStaticMarkup(createElement(PaymentComment, { note: null }))).toBe("");
  });

  it("bloquea el botón de cobro hasta que se seleccionen jugador, cuota y caja", () => {
    expect(canRecordAdminPayment({ playerId: "none", chargeId: "15", accountId: "3" })).toBe(false);
    expect(canRecordAdminPayment({ playerId: "8", chargeId: "none", accountId: "3" })).toBe(false);
    expect(canRecordAdminPayment({ playerId: "8", chargeId: "15", accountId: "none" })).toBe(false);
    expect(canRecordAdminPayment({ playerId: "8", chargeId: "15", accountId: "3" })).toBe(true);
    expect(canRecordAdminPayment({ playerId: "8", chargeId: "none", accountId: "3", manualConcept: "Cuota de liga" })).toBe(true);
  });
});
