import { describe, expect, it } from "vitest";
import { filterCurrentSeasonPlayers, normalizeFederativeFields } from "./players";

describe("player federation profile", () => {
  it("conserva fecha de nacimiento, DNI, talla y actividad de temporada al normalizar una ficha", () => {
    const dateOfBirth = new Date("1996-02-14T12:00:00Z");
    expect(normalizeFederativeFields({ dateOfBirth, dni: "12345678A", jerseySize: "L", isActiveCurrentSeason: false })).toEqual({ dateOfBirth, dni: "12345678A", jerseySize: "L", isActiveCurrentSeason: false });
  });

  it("incluye en plantilla solo a perfiles activos durante la temporada actual", () => {
    const players = [
      { id: 1, status: "active" as const, isActiveCurrentSeason: true },
      { id: 2, status: "active" as const, isActiveCurrentSeason: false },
      { id: 3, status: "inactive" as const, isActiveCurrentSeason: true },
    ];

    expect(filterCurrentSeasonPlayers(players)).toEqual([{ id: 1, status: "active", isActiveCurrentSeason: true }]);
  });
});
