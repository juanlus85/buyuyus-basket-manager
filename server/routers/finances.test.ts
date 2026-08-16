import { describe, expect, it } from "vitest";
import { calculateStatement } from "./finances";

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
