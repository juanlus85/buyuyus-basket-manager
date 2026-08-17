import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = process.argv[2];
const outputPath = process.argv[3];
if (!sourcePath || !outputPath) throw new Error("Uso: node scripts/summarize-acta-drafts.mjs <borradores.json> <resumen.md>");

const drafts = JSON.parse(readFileSync(sourcePath, "utf8"));
const players = new Map();
for (const match of drafts.matches.filter(item => item.status === "completed")) {
  for (const row of match.players.filter(item => item.playerName)) {
    const current = players.get(row.playerName) ?? { name: row.playerName, played: 0, won: 0, lost: 0, fouls: 0, technicalFouls: 0, unsportsmanlikeFouls: 0 };
    current.played += 1;
    if (match.ownScore > match.opponentScore) current.won += 1;
    if (match.ownScore < match.opponentScore) current.lost += 1;
    current.fouls += row.fouls;
    current.technicalFouls += row.technicalFouls;
    current.unsportsmanlikeFouls += row.unsportsmanlikeFouls;
    players.set(row.playerName, current);
  }
}

const rows = Array.from(players.values()).sort((a, b) => b.played - a.played || b.fouls - a.fouls || a.name.localeCompare(b.name, "es"));
const output = [
  "# Borrador de estadísticas históricas · 2025–2026",
  "",
  "> Fuente: 18 actas aportadas. Se contabilizan 17 partidos con resultado final; la jornada 18 contra CD Dabrowa fue suspendida y queda fuera.",
  "",
  "Las reglas confirmadas son: jugador listado = partido jugado; `P` = falta personal; `T` = técnica; `U` = antideportiva. Este resumen debe revisarse antes de ejecutar el SQL histórico.",
  "",
  "| Jugador | PJ | PG | PP | Faltas | Técnicas | Antideportivas |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...rows.map(row => `| ${row.name} | ${row.played} | ${row.won} | ${row.lost} | ${row.fouls} | ${row.technicalFouls} | ${row.unsportsmanlikeFouls} |`),
  "",
  `**Jugadores con estadísticas:** ${rows.length}. **Participaciones:** ${rows.reduce((sum, row) => sum + row.played, 0)}.`,
  "",
];
writeFileSync(outputPath, output.join("\n"));
console.log(JSON.stringify({ players: rows.length, participations: rows.reduce((sum, row) => sum + row.played, 0), outputPath }, null, 2));
