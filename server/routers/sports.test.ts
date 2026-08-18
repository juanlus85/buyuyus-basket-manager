import { describe, expect, it } from "vitest";
import { buildEventValues, buildWeeklyTrainingRows, calculatePlayerSeasonStats, calculateStandings, calculateTeamSeasonStatistics, resolveTrainingDeletion, selectNextActivities, summarizeAttendance } from "./sports";

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

describe("calculatePlayerSeasonStats", () => {
  it("acumula participaciones, resultados y sanciones de actas confirmadas", () => {
    const summary = calculatePlayerSeasonStats([
      { played: true, fouls: 4, technicalFouls: 1, unsportsmanlikeFouls: 0, ownScore: 70, opponentScore: 62, status: "completed" },
      { played: true, fouls: 2, technicalFouls: 0, unsportsmanlikeFouls: 1, ownScore: 55, opponentScore: 61, status: "completed" },
      { played: false, fouls: 0, technicalFouls: 0, unsportsmanlikeFouls: 0, ownScore: 80, opponentScore: 60, status: "completed" },
    ]);
    expect(summary).toEqual({ played: 2, won: 1, lost: 1, fouls: 6, technicalFouls: 1, unsportsmanlikeFouls: 1 });
  });
});

describe("calculateTeamSeasonStatistics", () => {
  it("agrupa por jugador y totaliza participación, balance y sanciones de una temporada", () => {
    const result = calculateTeamSeasonStatistics([
      { playerId: 1, fullName: "Ana Base", shortName: "Ana", jerseyNumber: 4, matchId: 10, played: true, fouls: 2, technicalFouls: 1, unsportsmanlikeFouls: 0, ownScore: 61, opponentScore: 55, status: "completed" },
      { playerId: 1, fullName: "Ana Base", shortName: "Ana", jerseyNumber: 4, matchId: 11, played: true, fouls: 1, technicalFouls: 0, unsportsmanlikeFouls: 0, ownScore: 48, opponentScore: 52, status: "completed" },
      { playerId: 2, fullName: "Beto Alero", shortName: null, jerseyNumber: 7, matchId: 10, played: true, fouls: 3, technicalFouls: 0, unsportsmanlikeFouls: 1, ownScore: 61, opponentScore: 55, status: "completed" },
    ]);
    expect(result.summary).toEqual({ playersWithStats: 2, reportedMatches: 2, participations: 3, teamPlayed: 2, teamWon: 1, teamLost: 1, fouls: 6, technicalFouls: 1, unsportsmanlikeFouls: 1 });
    expect(result.players[0]).toMatchObject({ player: { id: 1, fullName: "Ana Base" }, summary: { played: 2, won: 1, lost: 1, fouls: 3 } });
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

describe("entrenamientos recurrentes", () => {
  it("crea una sesión semanal con la misma hora y convocatoria hasta el final de temporada", () => {
    const rows = buildWeeklyTrainingRows({ seasonId: 3, seriesId: "serie-1", title: "Entrenamiento", startsAt: new Date("2026-09-03T20:00:00"), callAt: new Date("2026-09-03T19:30:00"), seasonEndsAt: new Date("2026-09-24T23:59:00"), location: "Pista 2", createdByUserId: 1 });
    expect(rows).toHaveLength(4);
    expect(rows.map(row => row.startsAt.getHours())).toEqual([20, 20, 20, 20]);
    expect(rows.map(row => row.callAt?.getMinutes())).toEqual([30, 30, 30, 30]);
    expect(rows.every(row => row.recurrenceSeriesId === "serie-1" && row.attendanceEnabled)).toBe(true);
  });

  it("distingue una sesión, la serie desde una fecha y la serie completa al eliminar", () => {
    const event = { id: 9, startsAt: new Date("2026-10-08T20:00:00"), recurrenceSeriesId: "serie-9" };
    expect(resolveTrainingDeletion("single", event)).toEqual({ kind: "single", eventId: 9 });
    expect(resolveTrainingDeletion("from_here", event)).toEqual({ kind: "from_here", seriesId: "serie-9", startsAt: event.startsAt });
    expect(resolveTrainingDeletion("all_series", event)).toEqual({ kind: "all_series", seriesId: "serie-9" });
  });
});
