import { describe, expect, it } from "vitest";
import { calculateStandings } from "./sports";

describe("calculateStandings", () => {
  it("calcula puntos, diferencia y posición a partir de resultados confirmados", () => {
    const standings = calculateStandings([
      { opponent: "CB Norte", ownScore: 64, opponentScore: 52 },
      { opponent: "CB Sur", ownScore: 48, opponentScore: 55 },
      { opponent: "CB Norte", ownScore: 61, opponentScore: 61 },
    ]);

    expect(standings).toMatchObject([
      { teamName: "Buyuyus", played: 3, won: 1, drawn: 1, lost: 1, points: 3, pointsFor: 173, pointsAgainst: 168, position: 1 },
      { teamName: "CB Sur", played: 1, won: 1, points: 2, position: 2 },
      { teamName: "CB Norte", played: 2, won: 0, drawn: 1, lost: 1, points: 1, position: 3 },
    ]);
  });
});
