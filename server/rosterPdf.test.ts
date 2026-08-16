import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createRosterPdfBytes, formatRosterPdfRow } from "../client/src/lib/rosterPdf";

describe("createRosterPdfBytes", () => {
  it("genera un PDF de una página para la plantilla activa", async () => {
    const bytes = await createRosterPdfBytes([
      { jerseyNumber: 7, fullName: "Ana García", dni: "12345678A", dateOfBirth: new Date("1996-02-14T12:00:00Z") },
    ]);
    const document = await PDFDocument.load(bytes);

    expect(bytes.slice(0, 4)).toEqual(new Uint8Array([37, 80, 68, 70]));
    expect(document.getPageCount()).toBe(1);
  });

  it("incluye dorsal, DNI y fecha de nacimiento en cada fila federativa", () => {
    expect(formatRosterPdfRow({ jerseyNumber: 7, fullName: "Ana García", dni: "12345678A", dateOfBirth: new Date("1996-02-14T12:00:00Z") })).toEqual(["7", "Ana García", "12345678A", "14/2/1996"]);
  });
});
