import { describe, expect, it } from "vitest";
import { buildEventValues, calculateStandings, selectNextActivities, summarizeAttendance } from "./sports";

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

describe("summarizeAttendance", () => {
  it("resume respuestas de entrenamiento e identifica la propia respuesta", () => {
    expect(summarizeAttendance([{ userId: 1, status: "going" }, { userId: 2, status: "maybe" }, { userId: 3, status: "not_going" }, { userId: 4, status: "going" }], 2)).toEqual({ going: 2, maybe: 1, notGoing: 1, mine: "maybe" });
  });
});

describe("agenda deportiva", () => {
  it("selecciona el próximo partido con rival, lugar y hora de convocatoria", () => {
    const match = { event: { type: "match" as const, startsAt: new Date("2026-10-10T18:00:00"), callAt: new Date("2026-10-10T17:15:00"), location: "Pabellón Hytasa" }, match: { opponent: "CB Norte" } };
    const training = { event: { type: "training" as const, startsAt: new Date("2026-10-09T20:00:00"), callAt: null, location: "Pista 2" }, match: null };
    expect(selectNextActivities([training, match])).toEqual({ nextMatch: match, nextTraining: training });
  });

  it("crea un entrenamiento apto para asistencia y consulta compartida de calendario", () => {
    const values = buildEventValues({ type: "training", title: "Entrenamiento", startsAt: new Date("2026-10-09T20:00:00"), location: "Pista 2" }, 12);
    expect(values).toMatchObject({ type: "training", title: "Entrenamiento", location: "Pista 2", attendanceEnabled: true, createdByUserId: 12 });
  });
});
