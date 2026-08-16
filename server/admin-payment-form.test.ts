import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminPaymentSubmitButton } from "../client/src/pages/FinancesPage";

describe("formulario Registrar cobro", () => {
  it("renderiza el botón deshabilitado sin jugador y lo habilita solo con jugador, cuota y caja", () => {
    expect(renderToStaticMarkup(createElement(AdminPaymentSubmitButton, { pending: false, playerId: "none", chargeId: "15", accountId: "3" }))).toContain("disabled=\"\"");
    expect(renderToStaticMarkup(createElement(AdminPaymentSubmitButton, { pending: false, playerId: "8", chargeId: "15", accountId: "3" }))).not.toContain("disabled=\"\"");
  });
});
