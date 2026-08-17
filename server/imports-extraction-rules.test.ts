import { describe, expect, it } from "vitest";
import { matchReportExtractionInstructions } from "./routers/imports";

describe("reglas de extracción de actas", () => {
  it("trata a todo jugador listado como participante e interpreta P, T y U", () => {
    expect(matchReportExtractionInstructions).toContain("todo jugador que figure en la lista del acta cuenta como participante");
    expect(matchReportExtractionInstructions).toContain("P como falta personal");
    expect(matchReportExtractionInstructions).toContain("T como falta técnica");
    expect(matchReportExtractionInstructions).toContain("U como falta antideportiva");
    expect(matchReportExtractionInstructions).toContain("borrador");
  });
});
