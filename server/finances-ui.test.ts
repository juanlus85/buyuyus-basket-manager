import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("comentarios de pagos en interfaz", () => {
  it("muestra comentarios en el histórico de Cuentas y en los movimientos del jugador", () => {
    const page = readFileSync(new URL("../client/src/pages/FinancesPage.tsx", import.meta.url), "utf8");
    expect(page).toContain("Comentario: {item.notes}");
    expect(page).toContain("<PaymentComment note={payment.adminNote || payment.playerNote} />");
    expect(page).toContain("<PaymentComment note={item.payment.adminNote || item.payment.playerNote} />");
  });
});
