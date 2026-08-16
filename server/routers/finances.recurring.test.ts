import { describe, expect, it } from "vitest";
import { buildDueChargeRows, calculateAccountBalance, calculateStatement } from "./finances";

describe("cálculos de cuotas y cajas", () => {
  it("no reduce la deuda de un jugador hasta confirmar el pago", () => {
    const statement = calculateStatement(
      [{ amountCents: 6000, status: "open" }, { amountCents: 6000, status: "open" }],
      [{ amountCents: 6000, status: "confirmed" }, { amountCents: 6000, status: "pending" }]
    );

    expect(statement).toEqual({ chargedCents: 12000, confirmedCents: 6000, pendingCents: 6000, balanceCents: 6000 });
  });

  it("incluye saldo inicial, ingresos, gastos y solo pagos confirmados en cada caja", () => {
    const balance = calculateAccountBalance(
      14500,
      [{ direction: "income", amountCents: 6000 }, { direction: "expense", amountCents: 2750 }],
      [{ amountCents: 6000, status: "confirmed" }, { amountCents: 5000, status: "pending" }]
    );

    expect(balance).toBe(23750);
  });

  it("genera la cuota vencida una sola vez para cada jugador activo", () => {
    const rows = buildDueChargeRows({
      now: new Date("2026-09-01T12:00:00Z"),
      players: [{ id: 11, status: "active", isActiveCurrentSeason: true }, { id: 12, status: "active", isActiveCurrentSeason: true }, { id: 13, status: "active", isActiveCurrentSeason: false }, { id: 14, status: "inactive", isActiveCurrentSeason: true }],
      installments: [
        { id: 7, dueAt: new Date("2026-09-01T00:00:00Z"), amountCents: 6000, plan: { seasonId: 4, concept: "Liga", createdByUserId: null } },
        { id: 8, dueAt: new Date("2027-02-01T00:00:00Z"), amountCents: 6000, plan: { seasonId: 4, concept: "Liga", createdByUserId: null } },
      ],
      existingKeys: new Set(["11:7"]),
    });

    expect(rows).toEqual([{ playerId: 12, seasonId: 4, feeInstallmentId: 7, concept: "Liga · cuota programada", amountCents: 6000, dueAt: new Date("2026-09-01T00:00:00Z"), createdByUserId: null }]);
  });
});
