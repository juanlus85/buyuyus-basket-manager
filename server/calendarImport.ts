export type CalendarImportItem = {
  recordType: "match";
  summary: string;
  rawFields: string;
  confidence: number;
};

export type CalendarImportDraft = {
  documentSummary: string;
  items: CalendarImportItem[];
  warnings: string[];
};

type TeamOccurrence = { team: string; start: number; end: number };

const buyuyusPattern = /\bC\.?B\.?\s+BUYUYUS\b/i;
const fixtureDatePattern = /\b(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})\b/;

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function teamPattern(team: string) {
  return team.trim().split(/\s+/).map(part => escapePattern(part).replace(/\\\./g, "\\.?")).join("\\s+");
}

function extractTeams(text: string) {
  const beforeFixtures = text.split(/\b1ª\s+VUELTA\b/i)[0] ?? text;
  const teams = beforeFixtures
    .split(/\r?\n/)
    .map(line => line.trim())
    .map(line => line.match(/^\d+\s+\d+\s+[A-Z]\s+(.+?)\s+(?:NERVION|MACARENA|CERRO|ESTE)\b/i)?.[1]?.trim())
    .filter((team): team is string => Boolean(team));

  return Array.from(new Set(teams)).sort((a, b) => b.length - a.length);
}

function findTeamOccurrences(line: string, teams: string[]): TeamOccurrence[] {
  return teams.flatMap(team => {
    const match = new RegExp(teamPattern(team), "i").exec(line);
    return !match || match.index === undefined ? [] : [{ team, start: match.index, end: match.index + match[0].length }];
  }).sort((a, b) => a.start - b.start || b.end - a.end);
}

function buildFixtureItem(line: string, teams: string[], journey: string | null): CalendarImportItem | null {
  const dateMatch = line.match(fixtureDatePattern);
  if (!dateMatch || !buyuyusPattern.test(line)) return null;

  const [dateAndTime, date, time] = dateMatch;
  const matchPart = line.slice(0, dateMatch.index).trim();
  const occurrences = findTeamOccurrences(matchPart, teams);
  const buyuyus = occurrences.find(item => buyuyusPattern.test(item.team));
  const opponent = occurrences.find(item => item !== buyuyus);
  if (!buyuyus || !opponent) return null;

  const isHome = buyuyus.start < opponent.start;
  const venueStart = Math.max(buyuyus.end, opponent.end);
  const venue = matchPart.slice(venueStart).trim().replace(/\s+/g, " ");
  const rival = opponent.team;
  const localia = isHome ? "Local" : "Visitante";
  const journeyText = journey ? `Jornada ${journey}` : "Jornada no identificada";
  const rawFields = [
    `Fecha: ${date}`,
    `Hora: ${time}`,
    `Rival: ${rival}`,
    `Condición: ${localia}`,
    `Lugar: ${venue || "No indicado"}`,
    journeyText,
  ].join("\n");

  return {
    recordType: "match",
    summary: `${journeyText} · ${localia} contra ${rival}`,
    rawFields,
    confidence: venue ? 99 : 93,
  };
}

/**
 * Produces a review-only calendar draft from IMD's text-based PDF layout.
 * Returns null when the document does not resemble a Buyuyus fixture calendar.
 */
export function extractBuyuyusCalendarDraft(text: string): CalendarImportDraft | null {
  const teams = extractTeams(text);
  if (!teams.some(team => buyuyusPattern.test(team))) return null;

  let currentJourney: string | null = null;
  const items: CalendarImportItem[] = [];
  for (const line of text.split(/\r?\n/).map(value => value.trim()).filter(Boolean)) {
    const journey = line.match(/^(\d+)ª\s+Jornada$/i)?.[1];
    if (journey) {
      currentJourney = journey;
      continue;
    }
    const fixture = buildFixtureItem(line, teams, currentJourney);
    if (fixture) items.push(fixture);
  }

  if (!items.length) return null;
  const warnings: string[] = [];
  if (items.some(item => item.rawFields.includes("Jornada no identificada"))) {
    warnings.push("No se ha podido identificar la jornada en una o más filas; verifica esos partidos antes de crearlos.");
  }
  if (items.some(item => item.rawFields.includes("Lugar: No indicado"))) {
    warnings.push("No se ha podido identificar el lugar en una o más filas; verifica esos partidos antes de crearlos.");
  }

  return {
    documentSummary: `Calendario IMD detectado: ${items.length} partidos de C.B. Buyuyus. Revisa cada rival, fecha, hora y lugar antes de crear partidos.`,
    items,
    warnings,
  };
}
