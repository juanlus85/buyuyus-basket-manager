import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type PositionedText = { text: string; x: number; y: number };
type TextLine = { y: number; items: PositionedText[] };

/**
 * Extracts selectable text from a PDF and rebuilds visual lines from PDF.js
 * coordinates. Empty results are expected for scanned/image-only PDFs; callers
 * can then fall back to sending the PDF itself to the vision model.
 */
export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const loadingTask = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });

  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const positioned: PositionedText[] = content.items.flatMap(item => {
        if (!("str" in item) || typeof item.str !== "string" || !item.str.trim()) return [];
        return [{ text: item.str.trim(), x: item.transform[4], y: item.transform[5] }];
      });
      positioned.sort((a, b) => b.y - a.y || a.x - b.x);

      const lines: TextLine[] = [];
      for (const item of positioned) {
        const current = lines.at(-1);
        if (!current || Math.abs(current.y - item.y) > 2) {
          lines.push({ y: item.y, items: [item] });
        } else {
          current.items.push(item);
        }
      }
      pages.push(lines.map(line => line.items.sort((a, b) => a.x - b.x).map(item => item.text).join(" ")).join("\n"));
    }

    return pages.filter(Boolean).join("\n\n").trim();
  } finally {
    await loadingTask.destroy();
  }
}
