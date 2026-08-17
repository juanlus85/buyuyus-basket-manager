import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = process.argv[2];
const outputPath = process.argv[3];
if (!sourcePath || !outputPath) throw new Error("Uso: node scripts/build-acta-drafts.mjs <extraccion.json> <salida.json>");

const normalize = value => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Z0-9]+/gi, " ")
  .trim()
  .toUpperCase();

const aliases = new Map([
  ["REINA PROY ALVARO", "REINA PROY, ÁLVARO"],
  ["GARCIA LINARES JAIME", "GARCÍA LINARES, JAIME"],
  ["MARTIN ARROYO DANIEL", "MARTÍN ARROYO, DANIEL"],
  ["JIMENEZ GIL ADRIAN", "JIMÉNEZ GIL, ADRIÁN"],
  ["SUAREZ RUFO ALBERTO", "SUÁREZ RUFO, ALBERTO"],
  ["GOTOR CRESPILLO ALVARO", "GOTOR CRESPILLO, ÁLVARO"],
  ["FERNANDEZ DIEGUEZ PABLO", "FERNÁNDEZ DIEGUEZ, PABLO"],
  ["BLANCO GUZMAN JUAN LUIS", "BLANCO GUZMÁN, JUAN LUIS"],
  ["GARCIA BARROSO JESUS", "GARCÍA BARROSO, JESÚS"],
  ["RODRIGUEZ BENITEZ ANGEL ANTONIO", "RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO"],
  ["RODRIGUEZ BENITEZ ENGEL ANTONIO", "RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO"],
  ["MALINE ALARCON ALEJANDRO", "MALINE ALARCÓN, ALEJANDRO"],
  ["SANCHEZ PICHARDO JAIME ANTONIO", "SÁNCHEZ PICHARDO, JAIME ANTONIO"],
  ["JIMENEZ LOPEZ REY ALVARO", "JIMENEZ LOPEZ REY ALVARO"],
  ["BAYO SANCHEZ MIGUEL ANGEL", "BAYO SÁNCHEZ, MIGUEL ÁNGEL"],
  ["CERVANTES VARGAS SANTIAGO", "CERVANTES VARGAS, SANTIAGO"],
  ["BELTRAN GALAN ALFONSO CARLOS", "BELTRÁN GALÁN, ALFONSO CARLOS"],
]);

const countToken = (text, token) => (text.match(new RegExp(`(^|[^A-ZÁÉÍÓÚÑ])${token}(?=$|[^A-ZÁÉÍÓÚÑ])`, "g")) ?? []).length;
const extraction = JSON.parse(readFileSync(sourcePath, "utf8"));

const matches = extraction.results.map(result => {
  const match = JSON.parse(result.output.partido);
  const players = JSON.parse(result.output.jugadores).map(raw => {
    const rawName = String(raw.nombre ?? "");
    const playerName = aliases.get(normalize(rawName)) ?? null;
    const marks = String(raw.marca ?? "").toUpperCase();
    return {
      rawName,
      playerName,
      jerseyNumber: raw.dorsal ? Number(raw.dorsal) : null,
      played: true,
      fouls: countToken(marks, "P"),
      technicalFouls: countToken(marks, "T"),
      unsportsmanlikeFouls: countToken(marks, "U"),
      sourceMarks: raw.marca ?? "",
      observation: raw.observacion ?? "",
    };
  });
  return {
    sourceFile: result.output.archivo,
    sourceMatchId: match.id,
    occurredOn: match.fecha,
    opponent: match.rival,
    ownScore: match.buyuyus,
    opponentScore: match.rivalPuntos,
    status: match.buyuyus === null || match.rivalPuntos === null ? "cancelled" : "completed",
    confidence: result.output.confianza,
    players,
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  rules: {
    participation: "Todo jugador listado en el acta cuenta como partido disputado.",
    P: "Falta personal",
    T: "Falta técnica",
    U: "Falta antideportiva",
  },
  matches,
  reviewSummary: {
    actas: matches.length,
    completedMatches: matches.filter(match => match.status === "completed").length,
    cancelledOrWithoutScore: matches.filter(match => match.status !== "completed").map(match => ({ sourceMatchId: match.sourceMatchId, occurredOn: match.occurredOn, opponent: match.opponent })),
    unmatchedPlayers: Array.from(new Set(matches.flatMap(match => match.players.filter(player => !player.playerName).map(player => player.rawName)))).sort(),
  },
};

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.reviewSummary, null, 2));
