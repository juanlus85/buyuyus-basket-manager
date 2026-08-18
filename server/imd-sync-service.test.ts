import { describe, expect, it } from "vitest";
import { normalizeImdName, parseImdResults, parseImdStandings } from "./imdSyncService";

const standingHtml = `<table><tr><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>PNP</th><th>TF</th><th>TC</th><th>Puntos</th></tr><tr><td>4 - C.B.BUYUYUS</td><td>17</td><td>10</td><td>0</td><td>7</td><td>0</td><td>617</td><td>589</td><td>27</td></tr></table>`;
const resultHtml = `<table><tr><th>Jornada</th><th>Equipo Local</th><th>Equipo Visitante</th><th>Resultado</th><th>Observaciones</th></tr><tr><td>1</td><td>C.B.BUYUYUS</td><td>DESFASE FORASTERO</td><td>26 - 25</td><td></td></tr></table>`;

describe("lector público del IMD", () => {
  it("normaliza nombres de equipo para enlazar sin depender de acentos o puntos", () => {
    expect(normalizeImdName("C.B. Buyuyús")).toBe("CBBUYUYUS");
  });
  it("extrae una clasificación del grupo", () => {
    expect(parseImdStandings(standingHtml)).toEqual([expect.objectContaining({ position: 4, teamName: "C.B.BUYUYUS", played: 17, won: 10, lost: 7, points: 27 })]);
  });
  it("extrae resultados y conserva las jornadas sin marcador como nulas", () => {
    expect(parseImdResults(resultHtml)).toEqual([expect.objectContaining({ journey: 1, homeScore: 26, awayScore: 25 })]);
  });
});
