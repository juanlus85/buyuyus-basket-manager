import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type RosterPdfPlayer = { jerseyNumber: number | null; fullName: string; dni: string | null; dateOfBirth: Date | null };

export function formatRosterPdfRow(player: RosterPdfPlayer) {
  return [player.jerseyNumber?.toString() ?? "—", player.fullName, player.dni ?? "—", player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString("es-ES") : "—"];
}

export async function createRosterPdfBytes(players: RosterPdfPlayer[]) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const rowsPerPage = 26;
  for (let start = 0; start < players.length; start += rowsPerPage) {
    const page = pdf.addPage([595.28, 841.89]); const { width, height } = page.getSize();
    page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: rgb(0.025, 0.11, 0.18) });
    page.drawText("BUYUYUS BASKET CLUB", { x: 42, y: height - 52, size: 20, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Plantilla activa · Dorsal, nombre, DNI y fecha de nacimiento", { x: 42, y: height - 75, size: 9, font: regular, color: rgb(0.75, 0.88, 0.98) });
    const headers = ["Nº", "Nombre", "DNI", "Fecha nacimiento"]; const positions = [42, 82, 290, 430];
    headers.forEach((header, index) => page.drawText(header, { x: positions[index], y: height - 126, size: 9, font: bold, color: rgb(0.1, 0.16, 0.22) }));
    players.slice(start, start + rowsPerPage).forEach((player, index) => {
      const y = height - 150 - index * 24;
      if (index % 2 === 0) page.drawRectangle({ x: 34, y: y - 7, width: 527, height: 21, color: rgb(0.95, 0.97, 0.98) });
      const values = formatRosterPdfRow(player);
      values.forEach((value, column) => page.drawText(value.slice(0, column === 1 ? 34 : 24), { x: positions[column], y, size: 9, font: regular, color: rgb(0.12, 0.16, 0.2) }));
    });
    page.drawText(`Página ${start / rowsPerPage + 1}`, { x: 42, y: 35, size: 8, font: regular, color: rgb(0.35, 0.4, 0.46) });
  }
  return pdf.save();
}
