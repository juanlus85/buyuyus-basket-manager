import { describe, expect, it } from "vitest";
import { extractMatchReportDraft } from "./matchReportImport";
import { buildDocumentExtractionPrompt, matchReportExtractionInstructions } from "./routers/imports";

const sampleMatchReport = `
Fecha 06/11/2026 Hora 20:00 Terreno PABELLON MUNICIPAL MEDAC Fase 1ª FASE DE DISTRITO Grupo 1ªA-01 Jornada 1
Equipo A REAL BETIS ACADEMY EQUIPO ARBITRAL
111A JUGADOR DE MUESTRA UNO 4 P P 10
222B JUGADOR DE MUESTRA DOS 12 T U 11
333C JUGADOR DE MUESTRA TRES 7 12
Periodo Faltas Tiempos
Equipo B C.B. BUYUYUS 24 24 74 74 124 124
444D JUGADOR DE MUESTRA CUATRO 8 P T U 20
555E JUGADOR DE MUESTRA CINCO 22 P P 21
Periodo Faltas Tiempos
RESULTADO FINAL
Firmado árbitro
Equipo A Equipo B
Pág. 1 de 2 · CIERRE ACTA: 06/11/2026
35 24
`;

describe("reglas de extracción de actas", () => {
  it("trata a todo jugador listado como participante e interpreta P, T y U", () => {
    expect(matchReportExtractionInstructions).toContain("todo jugador que figure en la lista del acta cuenta como participante");
    expect(matchReportExtractionInstructions).toContain("P como falta personal");
    expect(matchReportExtractionInstructions).toContain("T como falta técnica");
    expect(matchReportExtractionInstructions).toContain("U como falta antideportiva");
    expect(matchReportExtractionInstructions).toContain("borrador");
  });

  it("extrae localmente el borrador del acta, incluidos metadatos y todas las filas de jugadores", () => {
    const result = extractMatchReportDraft(sampleMatchReport);
    expect(result).not.toBeNull();
    expect(result?.match).toEqual({ opponent: "REAL BETIS ACADEMY", ownScore: 24, opponentScore: 35 });
    expect(result?.matchDetails).toMatchObject({ date: "06/11/2026", time: "20:00", venue: "PABELLON MUNICIPAL MEDAC", journey: "1" });
    expect(result?.playerStats).toHaveLength(2);
    expect(result?.playerStats).toEqual([
      expect.objectContaining({ jerseyNumber: 8, played: true, fouls: 1, technicalFouls: 1, unsportsmanlikeFouls: 1 }),
      expect.objectContaining({ jerseyNumber: 22, played: true, fouls: 2, technicalFouls: 0, unsportsmanlikeFouls: 0 }),
    ]);
    expect(result?.warnings).toEqual([]);
  });

  it("cuenta las marcas de falta solo en las filas del equipo Buyuyus", () => {
    const result = extractMatchReportDraft(sampleMatchReport);
    const buyuyusPlayers = result?.playerStats ?? [];
    expect(buyuyusPlayers.reduce((total, player) => total + player.fouls, 0)).toBe(3);
    expect(buyuyusPlayers.reduce((total, player) => total + player.technicalFouls, 0)).toBe(1);
    expect(buyuyusPlayers.reduce((total, player) => total + player.unsportsmanlikeFouls, 0)).toBe(1);
  });

  it("normaliza el marcador cuando Buyuyus figura como Equipo A", () => {
    const sideAReport = `Fecha 06/11/2026 Hora 20:00 Terreno PISTA DE PRUEBA Fase LIGA Distrito CENTRO Grupo 1ªA-01 Jornada 2
Equipo A C.B. BUYUYUS
444D JUGADORA DE PRUEBA UNO 8 P T 16
555E JUGADORA DE PRUEBA DOS 22 U 17
Periodo Faltas Tiempos
Equipo B CLUB RIVAL DE PRUEBA
111A JUGADORA RIVAL UNO 4 P 10
Periodo Faltas Tiempos
RESULTADO FINAL
Equipo A Equipo B
35 24`;
    const result = extractMatchReportDraft(sideAReport);

    expect(result?.match).toEqual({ opponent: "CLUB RIVAL DE PRUEBA", ownScore: 35, opponentScore: 24 });
    expect(result?.playerStats).toEqual([
      expect.objectContaining({ playerName: "JUGADORA DE PRUEBA UNO", played: true, fouls: 1, technicalFouls: 1, unsportsmanlikeFouls: 0 }),
      expect.objectContaining({ playerName: "JUGADORA DE PRUEBA DOS", played: true, fouls: 0, technicalFouls: 0, unsportsmanlikeFouls: 1 }),
    ]);
  });

  it("incluye como participante al jugador listado sin marcas P/T/U", () => {
    const reportWithNoFouls = sampleMatchReport.replace(
      "555E JUGADOR DE MUESTRA CINCO 22 P P 21",
      "555E JUGADOR DE MUESTRA CINCO 22 P P 21\n666F JUGADOR DE MUESTRA SEIS 9 0",
    );
    const result = extractMatchReportDraft(reportWithNoFouls);

    expect(result?.playerStats).toContainEqual(expect.objectContaining({ playerName: "JUGADOR DE MUESTRA SEIS", jerseyNumber: 9, played: true, fouls: 0, technicalFouls: 0, unsportsmanlikeFouls: 0 }));
  });

  it("extrae metadatos aunque estén separados en líneas y se niega a inventar un marcador ausente", () => {
    const reportWithoutFinalScore = sampleMatchReport
      .replace("Fecha 06/11/2026 Hora 20:00 Terreno PABELLON MUNICIPAL MEDAC Fase 1ª FASE DE DISTRITO Grupo 1ªA-01 Jornada 1", "Fecha 06/11/2026\nHora 20:00\nTerreno PABELLON MUNICIPAL MEDAC\nFase 1ª FASE DE DISTRITO\nGrupo 1ªA-01\nJornada 1")
      .replace("35 24", "Marcador no visible");

    expect(extractMatchReportDraft(reportWithoutFinalScore)).toBeNull();
    const withScore = extractMatchReportDraft(reportWithoutFinalScore.replace("Marcador no visible", "35 24"));
    expect(withScore?.matchDetails).toMatchObject({ date: "06/11/2026", time: "20:00", venue: "PABELLON MUNICIPAL MEDAC", journey: "1" });
  });

  it("no inventa una extracción local para un formato que no parece un acta IMD", () => {
    expect(extractMatchReportDraft("Documento sin alineaciones ni resultado")).toBeNull();
  });

  it("prepara análisis de capturas de clasificación/resultados como borrador de revisión", () => {
    const prompt = buildDocumentExtractionPrompt("standing");
    expect(prompt).toContain("cada equipo visible");
    expect(prompt).toContain("no actualices clasificación ni resultados automáticamente");
  });
});
