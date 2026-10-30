import { describe, expect, it } from "vitest";
import { extractBuyuyusCalendarDraft } from "./calendarImport";

const imdCalendarText = [
  "BALONCESTO SENIOR MIXTO GRUPO: 1ªA-01",
  "1 56 N C.B. REINONAS NERVION-SAN PABLO",
  "2 36 N C.B. BISTIBOYS NERVION-SAN PABLO",
  "6 69 A C.B. BUYUYUS CERRO AMATE",
  "10 190 E REAL BETIS ACADEMY DAVANTE ESTE",
  "1ª Jornada",
  "REAL BETIS ACADEMY DAVANTE C.B. BUYUYUS MEDAC 06-11-2026 20:00 VIERNES",
  "C.B. REINONAS C.B. BISTIBOYS CD. SAN PABLO 07-11-2026 18:00 SABADO",
  "2ª Jornada",
  "C.B. BUYUYUS C.B. BISTIBOYS CD. HYTASA NAVE BC/VB 15-11-2026 09:00 DOMINGO",
  "C.B. BUYUYUS BLANCO GUZMÁN JUAN LUIS 655432612 NEGRA",
].join("\n");

describe("extractBuyuyusCalendarDraft", () => {
  it("turns IMD fixture rows into a review-only Buyuyus calendar draft", () => {
    const draft = extractBuyuyusCalendarDraft(imdCalendarText);

    expect(draft).toMatchObject({
      documentSummary: expect.stringContaining("2 partidos"),
      warnings: [],
    });
    expect(draft?.items).toEqual([
      expect.objectContaining({
        recordType: "match",
        summary: "Jornada 1 · Visitante contra REAL BETIS ACADEMY DAVANTE",
        rawFields: "Fecha: 06-11-2026\nHora: 20:00\nRival: REAL BETIS ACADEMY DAVANTE\nCondición: Visitante\nLugar: MEDAC\nJornada 1",
        confidence: 99,
      }),
      expect.objectContaining({
        recordType: "match",
        summary: "Jornada 2 · Local contra C.B. BISTIBOYS",
        rawFields: "Fecha: 15-11-2026\nHora: 09:00\nRival: C.B. BISTIBOYS\nCondición: Local\nLugar: CD. HYTASA NAVE BC/VB\nJornada 2",
        confidence: 99,
      }),
    ]);
    expect(JSON.stringify(draft)).not.toContain("BLANCO GUZMÁN");
    expect(JSON.stringify(draft)).not.toContain("C.B. REINONAS C.B. BISTIBOYS");
  });

  it("returns null for documents without a Buyuyus team directory", () => {
    expect(extractBuyuyusCalendarDraft("CB FLAMA SAFAUR 22-11-2026 10:30")).toBeNull();
  });
});
