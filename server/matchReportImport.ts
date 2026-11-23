export type MatchReportImportDraft = {
  documentSummary: string;
  match: {
    opponent: string | null;
    ownScore: number | null;
    opponentScore: number | null;
  };
  matchDetails: {
    date: string | null;
    time: string | null;
    venue: string | null;
    phase: string | null;
    district: string | null;
    group: string | null;
    journey: string | null;
  };
  playerStats: Array<{
    playerName: string;
    jerseyNumber: number | null;
    played: boolean;
    fouls: number;
    technicalFouls: number;
    unsportsmanlikeFouls: number;
    confidence: number;
  }>;
  warnings: string[];
};

const FOUL_MARKERS = new Set(["P", "T", "U"]);

function textField(lines: string[], field: string, followingFields: string[]) {
  const nextLabel = followingFields.join("|");
  const line = lines.find(value => new RegExp(`\\b${field}\\b`, "i").test(value));
  const match = line?.match(new RegExp(`\\b${field}\\s+(.+?)(?=\\s+(?:${nextLabel})\\b|$)`, "i"));
  return match?.[1]?.trim().replace(/\s+/g, " ") || null;
}

function teamHeaderName(lines: string[], side: "A" | "B") {
  const header = lines.find(line => new RegExp(`^Equipo\\s+${side}\\b`, "i").test(line));
  if (!header) return null;
  let name = header.replace(new RegExp(`^Equipo\\s+${side}\\s+`, "i"), "");
  name = name.split(/\bEQUIPO ARBITRAL\b/i)[0] ?? name;
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  const firstNumeric = tokens.findIndex(token => /^\d+$/.test(token));
  const teamName = tokens.slice(0, firstNumeric < 0 ? tokens.length : firstNumeric).join(" ").trim();
  return teamName || null;
}

function parseBuyuyusPlayers(lines: string[], side: "A" | "B") {
  const teamHeader = lines.findIndex(line => new RegExp(`^Equipo\\s+${side}\\b`, "i").test(line));
  if (teamHeader < 0) return [];
  const nextPeriod = lines.findIndex((line, index) => index > teamHeader && /^Periodo\b/i.test(line));
  const nextTeam = lines.findIndex((line, index) => index > teamHeader && /^Equipo\s+[AB]\b/i.test(line));
  const endCandidates = [nextPeriod, nextTeam].filter(index => index >= 0);
  const end = endCandidates.length ? Math.min(...endCandidates) : lines.length;
  const players: MatchReportImportDraft["playerStats"] = [];

  for (const line of lines.slice(teamHeader + 1, end)) {
    const license = line.match(/^(\d{3}[A-Z])\s+(.+)$/i);
    if (!license) continue;
    const tokens = license[2].trim().split(/\s+/).filter(Boolean);
    if (tokens[0]?.toUpperCase() === "C") tokens.shift();
    const jerseyIndex = tokens.findIndex(token => /^\d{1,2}$/.test(token));
    if (jerseyIndex < 1) continue;

    const playerName = tokens.slice(0, jerseyIndex).join(" ").trim();
    const jerseyNumber = Number(tokens[jerseyIndex]);
    const marks: string[] = [];
    for (const token of tokens.slice(jerseyIndex + 1)) {
      const marker = token.toUpperCase();
      if (!FOUL_MARKERS.has(marker)) break;
      marks.push(marker);
    }

    if (!playerName || jerseyNumber > 99) continue;
    players.push({
      playerName,
      jerseyNumber,
      played: true,
      fouls: marks.filter(marker => marker === "P").length,
      technicalFouls: marks.filter(marker => marker === "T").length,
      unsportsmanlikeFouls: marks.filter(marker => marker === "U").length,
      confidence: 98,
    });
  }
  return players;
}

/**
 * Reads text-based IMD basketball score sheets. A null result means the source
 * does not contain enough recognizable structure to produce a safe draft.
 */
export function extractMatchReportDraft(text: string): MatchReportImportDraft | null {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const teamA = teamHeaderName(lines, "A");
  const teamB = teamHeaderName(lines, "B");
  if (!teamA || !teamB) return null;

  const buyuyusSide: "A" | "B" | null = /\bBUYUYUS\b/i.test(teamA) ? "A" : /\bBUYUYUS\b/i.test(teamB) ? "B" : null;
  if (!buyuyusSide) return null;

  const finalScoreIndex = lines.findIndex(line => /^RESULTADO\s+FINAL$/i.test(line));
  const finalScoreLine = lines.slice(finalScoreIndex + 1, finalScoreIndex + 10).find(line => /^(\d{1,3})\s+(\d{1,3})$/.test(line));
  const finalScore = finalScoreLine?.match(/^(\d{1,3})\s+(\d{1,3})$/);
  if (finalScoreIndex < 0 || !finalScore) return null;
  const scoreA = Number(finalScore[1]);
  const scoreB = Number(finalScore[2]);
  const players = parseBuyuyusPlayers(lines, buyuyusSide);
  if (!players.length) return null;

  const opponent = buyuyusSide === "A" ? teamB : teamA;
  const ownScore = buyuyusSide === "A" ? scoreA : scoreB;
  const opponentScore = buyuyusSide === "A" ? scoreB : scoreA;
  const date = text.match(/\bFecha\s+(\d{2}[/-]\d{2}[/-]\d{4})/i)?.[1] ?? null;
  const time = text.match(/\bHora\s+(\d{2}:\d{2})/i)?.[1] ?? null;
  const venue = textField(lines, "Terreno", ["Fase", "Grupo", "Jornada", "Fecha", "Hora"]);
  const phaseLine = lines.find(line => /\bFase\b/i.test(line));
  const phaseMatch = phaseLine?.match(/\bFase\s+(.+?)\s+Distrito\b/i);
  const phase = phaseMatch ? `${phaseMatch[1].trim()} DISTRITO` : textField(lines, "Fase", ["Grupo", "Jornada", "Fecha", "Hora", "Terreno"]);
  const district = textField(lines, "Distrito", ["Fecha", "Grupo", "Jornada", "Hora", "Terreno"]);
  const group = text.match(/\bGrupo\s+([\wª-]+)/i)?.[1] ?? null;
  const journey = text.match(/\bJornada\s+(\d+)/i)?.[1] ?? null;

  const details = [
    `Acta IMD · C.B. Buyuyus contra ${opponent}`,
    `Resultado final: Buyuyus ${ownScore}–${opponentScore} ${opponent}`,
    date ? `Fecha: ${date}` : null,
    time ? `Hora: ${time}` : null,
    venue ? `Terreno: ${venue}` : null,
    phase ? `Fase: ${phase}` : null,
    district ? `Distrito: ${district}` : null,
    group ? `Grupo: ${group}` : null,
    journey ? `Jornada: ${journey}` : null,
    `${players.length} jugadores de Buyuyus identificados`,
  ].filter(Boolean);

  return {
    documentSummary: details.join(" · "),
    match: { opponent, ownScore, opponentScore },
    matchDetails: { date, time, venue, phase, district, group, journey },
    playerStats: players,
    warnings: [],
  };
}
