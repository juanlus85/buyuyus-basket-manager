/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchReportReview, type ReportConfirmation } from "../client/src/components/MatchReportReview";
import { WeeklySportsReview, type SnapshotConfirmation } from "../client/src/components/WeeklySportsReview";
import { normalizedPlayerName, suggestReportPlayer, type RosterIdentity } from "../client/src/lib/importReview";

globalThis.React = React;

afterEach(cleanup);

type ReviewReport = Parameters<typeof MatchReportReview>[0]["report"];

function makeReport(playerStats: ReviewReport["playerStats"]): ReviewReport {
  return {
    documentSummary: "Acta ficticia para pruebas de revisión",
    match: { opponent: "Club Inventado", ownScore: 66, opponentScore: 58 },
    playerStats,
    warnings: [],
  };
}

const fictionalRoster: RosterIdentity[] = [
  { id: 301, fullName: "Lucía Ríos", jerseyNumber: 4 },
  { id: 302, fullName: "Elena Prado", jerseyNumber: 8 },
];

const fictionalMatch = {
  match: { id: 701, opponent: "Club Inventado" },
  event: { startsAt: new Date("2026-11-02T18:00:00.000Z") },
  seasonName: "Temporada ficticia",
  competitionName: "Torneo de prueba",
};

describe("sugerencias de fichas para importación de actas", () => {
  it("normaliza coma, orden invertido y acentos aunque haya cambiado el dorsal", () => {
    const reportRow = {
      playerName: "Ríos, Lucia",
      jerseyNumber: 99,
      played: true,
      fouls: 1,
      technicalFouls: 0,
      unsportsmanlikeFouls: 0,
      confidence: 90,
    };

    expect(normalizedPlayerName(reportRow.playerName)).toBe(normalizedPlayerName("Lucía Ríos"));
    expect(suggestReportPlayer(reportRow.playerName, fictionalRoster)).toBe(301);
    expect(reportRow.jerseyNumber).not.toBe(fictionalRoster[0].jerseyNumber);
  });

  it("no asigna una ficha por coincidencia de dorsal si el nombre es diferente", () => {
    const sameNumberDifferentName = [{ id: 410, fullName: "Elena Prado", jerseyNumber: 8 }];

    expect(suggestReportPlayer("Noa Ficticia", sameNumberDifferentName)).toBeNull();
  });

  it("no autopropone cuando hay dos fichas con el mismo nombre normalizado", () => {
    const duplicateNames: RosterIdentity[] = [
      { id: 501, fullName: "Lucía Ríos", jerseyNumber: 4 },
      { id: 502, fullName: "Rios, Lucia", jerseyNumber: 12 },
    ];

    expect(suggestReportPlayer("Ríos, Lucía", duplicateNames)).toBeNull();
  });
});

describe("revisión de acta", () => {
  it("espera un mapeo explícito y cifras válidas, y confirma una sola vez todos los datos revisados", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async (_payload: ReportConfirmation) => undefined);
    const report = makeReport([
      {
        playerName: "Ríos, Lucia",
        jerseyNumber: 99,
        played: true,
        fouls: 2,
        technicalFouls: 1,
        unsportsmanlikeFouls: 0,
        confidence: 92,
      },
      {
        playerName: "Noa Ficticia",
        jerseyNumber: 8,
        played: false,
        fouls: 3,
        technicalFouls: 0,
        unsportsmanlikeFouls: 1,
        confidence: 61,
      },
    ]);

    render(<MatchReportReview report={report} matches={[fictionalMatch]} roster={fictionalRoster} pending={false} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole("button", { name: "Confirmar acta y actualizar estadísticas" });
    const playerSelects = screen.getAllByLabelText("Ficha de jugador", { selector: "select" });
    expect(playerSelects[0]).toHaveProperty("value", "301");
    expect(playerSelects[1]).toHaveProperty("value", "none");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(confirmButton).toHaveProperty("disabled", true);

    await user.selectOptions(screen.getByLabelText("Asociar al partido y temporada"), "701");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(confirmButton).toHaveProperty("disabled", true);

    const ownScore = screen.getByLabelText("Puntos Buyuyus");
    await user.selectOptions(playerSelects[1], "302");
    expect(confirmButton).toHaveProperty("disabled", false);
    await user.clear(ownScore);
    await user.type(ownScore, "301");
    expect(confirmButton).toHaveProperty("disabled", true);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.clear(ownScore);
    await user.type(ownScore, "67");
    expect(confirmButton).toHaveProperty("disabled", false);
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      matchId: 701,
      ownScore: 67,
      opponentScore: 58,
      playerStats: [
        { playerId: 301, played: true, fouls: 2, technicalFouls: 1, unsportsmanlikeFouls: 0 },
        { playerId: 302, played: false, fouls: 3, technicalFouls: 0, unsportsmanlikeFouls: 1 },
      ],
    });
  });

  it("muestra un acta histórica sin matchDetails en modo solo lectura y sin confirmar", () => {
    const onConfirm = vi.fn(async (_payload: ReportConfirmation) => undefined);
    const historicalReport = makeReport([
      {
        playerName: "Inés Prueba",
        jerseyNumber: 21,
        played: true,
        fouls: 1,
        technicalFouls: 0,
        unsportsmanlikeFouls: 0,
        confidence: 88,
      },
    ]);

    expect(historicalReport).not.toHaveProperty("matchDetails");
    render(<MatchReportReview report={historicalReport} matches={[]} roster={[]} pending={false} readonly onConfirm={onConfirm} />);

    expect(screen.getByText(/Inés Prueba/)).toBeTruthy();
    expect(screen.getByText("Consulta del borrador guardado. No se pueden aplicar cambios desde una importación ya revisada o descartada.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirmar acta y actualizar estadísticas" })).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("revisión semanal de clasificación y resultados", () => {
  const draft = {
    documentSummary: "Captura semanal ficticia",
    standings: [
      { teamName: "Club A ficticio", position: 1, played: 5, won: 4, drawn: 0, lost: 1, forfeits: 0, pointsFor: 320, pointsAgainst: 277, points: 9 },
      { teamName: "Club B incompleto", position: null, played: null, won: null, drawn: null, lost: null, forfeits: null, pointsFor: null, pointsAgainst: null, points: null },
    ],
    results: [{ opponent: "Club A ficticio", ownScore: null, opponentScore: 57, date: "2026-11-03" }],
    warnings: [],
  };
  const competitions = [
    { id: 11, seasonId: 3, name: "Liga ficticia", phase: "Fase de prueba" },
    { id: 12, seasonId: 4, name: "Otra liga", phase: null },
  ];
  const seasons = [{ id: 3, name: "Temporada ficticia" }, { id: 4, name: "Otra temporada" }];
  const games = [
    { match: { id: 21, competitionId: 11, opponent: "Club A ficticio" }, event: { startsAt: new Date("2026-11-03T18:00:00Z") } },
    { match: { id: 22, competitionId: 12, opponent: "Equipo de otra liga" }, event: { startsAt: new Date("2026-11-03T18:00:00Z") } },
  ];

  it("confirma solo filas marcadas y el resultado asociado a un partido de la competición elegida", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async (_payload: SnapshotConfirmation) => undefined);
    render(<WeeklySportsReview draft={draft} matches={games} competitions={competitions} seasons={seasons} pending={false} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole("button", { name: "Confirmar clasificación y resultados seleccionados" });
    expect(confirmButton).toHaveProperty("disabled", true);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText("Competición y temporada de destino"), "11");
    const matchSelect = screen.getByLabelText("Partido al que aplicar el resultado");
    expect(matchSelect.querySelector('option[value="22"]')).toBeNull();
    await user.selectOptions(matchSelect, "21");
    expect(confirmButton).toHaveProperty("disabled", true);

    const ownScore = screen.getByLabelText("Buyuyus", { selector: "input" });
    await user.type(ownScore, "61");
    await user.click(screen.getByLabelText("Aplicar fila Club A ficticio"));
    expect(confirmButton).toHaveProperty("disabled", false);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      competitionId: 11,
      standings: [{ teamName: "Club A ficticio", position: 1, played: 5, won: 4, drawn: 0, lost: 1, forfeits: 0, pointsFor: 320, pointsAgainst: 277, points: 9 }],
      results: [{ matchId: 21, ownScore: 61, opponentScore: 57 }],
    });
  });

  it("bloquea una fila marcada mientras tenga cifras ausentes o inválidas", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn(async (_payload: SnapshotConfirmation) => undefined);
    render(<WeeklySportsReview draft={draft} matches={[]} competitions={competitions} seasons={seasons} pending={false} onConfirm={onConfirm} />);
    await user.selectOptions(screen.getByLabelText("Competición y temporada de destino"), "11");
    await user.click(screen.getByLabelText("Aplicar fila Club B incompleto"));

    const confirmButton = screen.getByRole("button", { name: "Confirmar clasificación y resultados seleccionados" });
    expect(confirmButton).toHaveProperty("disabled", true);
    expect(screen.getByText("Fila incompleta o inválida. Completa las cifras o desmárcala antes de confirmar.")).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
