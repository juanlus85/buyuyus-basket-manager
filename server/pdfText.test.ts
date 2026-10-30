import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractBuyuyusCalendarDraft } from "./calendarImport";
import { extractPdfText } from "./pdfText";
import { buildDocumentExtractionPrompt, prepareCalendarPdfText } from "./routers/imports";

async function makePdf(draw?: (document: PDFDocument) => void) {
  const document = await PDFDocument.create();
  if (draw) draw(document);
  return new Uint8Array(await document.save());
}

describe("PDF calendar text extraction", () => {
  it("extracts text in visual reading order across pages", async () => {
    const bytes = await makePdf(document => {
      const firstPage = document.addPage([600, 800]);
      firstPage.drawText("C.B. BUYUYUS", { x: 40, y: 700 });
      firstPage.drawText("SAFAUR", { x: 260, y: 700 });
      firstPage.drawText("22-11-2026", { x: 420, y: 700 });
      const secondPage = document.addPage([600, 800]);
      secondPage.drawText("Segunda página", { x: 40, y: 700 });
    });

    const text = await extractPdfText(bytes);
    expect(text).toContain("C.B. BUYUYUS SAFAUR 22-11-2026");
    expect(text.indexOf("C.B. BUYUYUS")).toBeLessThan(text.indexOf("Segunda página"));
  });

  it("returns an empty string for an image-only or blank PDF so the caller can use visual fallback", async () => {
    const bytes = await makePdf();
    await expect(extractPdfText(bytes)).resolves.toBe("");
  });

  it("uses a calendar-specific prompt that limits extraction to Buyuyus fixtures and preserves manual review", () => {
    const prompt = buildDocumentExtractionPrompt("calendar");
    expect(prompt).toContain("C.B. BUYUYUS");
    expect(prompt).toContain("borrador de revisión");
    expect(prompt).toContain("No inventes hora o lugar");
  });

  it("keeps team directory rows for local rival matching while filtering unrelated fixtures and contacts", () => {
    const selected = prepareCalendarPdfText([
      "6 69 A C.B. BUYUYUS CERRO AMATE",
      "1 56 N C.B. REINONAS NERVION-SAN PABLO",
      "C.B. BUYUYUS C.B. REINONAS CD. HYTASA 25-04-2027 09:00 DOMINGO",
      "SAFAUR CB FLAMA COLEGIO SAGRADA FAMILIA 01-04-2027 20:20 JUEVES",
      "C.B. BUYUYUS BLANCO GUZMÁN JUAN LUIS 655432612 NEGRA",
    ].join("\n"));

    expect(selected).toContain("6 69 A C.B. BUYUYUS CERRO AMATE");
    expect(selected).toContain("1 56 N C.B. REINONAS NERVION-SAN PABLO");
    expect(selected).toContain("C.B. BUYUYUS C.B. REINONAS CD. HYTASA");
    expect(selected).not.toContain("BLANCO GUZMÁN");
    expect(selected).not.toContain("SAFAUR CB FLAMA");
    expect(selected.split("\n")).toHaveLength(3);

    const draft = extractBuyuyusCalendarDraft(selected);
    expect(draft?.items).toHaveLength(1);
    expect(draft?.items[0]?.summary).toContain("C.B. REINONAS");
  });
});
