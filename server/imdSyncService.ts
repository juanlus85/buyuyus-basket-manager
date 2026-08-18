import { and, desc, eq } from "drizzle-orm";
import { competitionStandings, competitions, imdSyncConfigs, imdSyncDrafts, matches, seasons, teamEvents } from "../drizzle/schema";
import { requireDb } from "./db";

const IMD_URL = "https://imd.sevilla.org/app/jjddmm_resultados/resultados.php";
const IMD_PUBLIC_PAGE = "https://imd.sevilla.org/app/jjddmm_resultados/";

export type ImdStanding = { position: number | null; teamName: string; played: number; won: number; drawn: number; lost: number; forfeits: number; pointsFor: number; pointsAgainst: number; points: number };
export type ImdResult = { journey: number; homeTeam: string; awayTeam: string; homeScore: number | null; awayScore: number | null; observations: string | null };
export type ImdSnapshot = { sourceUrl: string; portalCompetition: string; portalTeamId: string; portalGroup: string | null; standings: ImdStanding[]; results: ImdResult[]; retrievedAt: string };

type SyncConfig = typeof imdSyncConfigs.$inferSelect;

const entityDecode = (value: string) => value
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&aacute;/gi, "á").replace(/&eacute;/gi, "é").replace(/&iacute;/gi, "í").replace(/&oacute;/gi, "ó").replace(/&uacute;/gi, "ú")
  .replace(/&ntilde;/gi, "ñ").replace(/&uuml;/gi, "ü")
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

export const normalizeImdName = (value: string) => entityDecode(value)
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^A-Z0-9]+/gi, "")
  .toUpperCase();

function extractTables(html: string): string[][][] {
  return Array.from(html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi))
    .map(tableMatch => Array.from(tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
      .map(rowMatch => Array.from(rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi))
        .map(cellMatch => entityDecode(cellMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()))
        .filter(cell => cell.length > 0))
      .filter(row => row.length > 0))
    .filter(table => table.length > 0);
}

function toNumber(value: string | undefined) {
  const parsed = Number.parseInt((value ?? "").replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseImdStandings(html: string): ImdStanding[] {
  const table = extractTables(html).find(rows => rows[0]?.some(cell => normalizeImdName(cell) === "PJ") && rows[0]?.some(cell => normalizeImdName(cell) === "PUNTOS"));
  if (!table) return [];
  return table.slice(1).map(cells => {
    const match = cells[0]?.match(/^\s*(\d+)\s*-\s*(.+)$/);
    return {
      position: match ? Number(match[1]) : null,
      teamName: (match?.[2] ?? cells[0] ?? "").trim(),
      played: toNumber(cells[1]), won: toNumber(cells[2]), drawn: toNumber(cells[3]), lost: toNumber(cells[4]), forfeits: toNumber(cells[5]), pointsFor: toNumber(cells[6]), pointsAgainst: toNumber(cells[7]), points: toNumber(cells[8]),
    };
  }).filter(row => row.teamName.length > 0);
}

export function parseImdResults(html: string): ImdResult[] {
  const table = extractTables(html).find(rows => normalizeImdName(rows[0]?.[0] ?? "") === "JORNADA" && rows[0]?.some(cell => normalizeImdName(cell) === "RESULTADO"));
  if (!table) return [];
  return table.slice(1).map(cells => {
    const score = cells[3]?.match(/(\d+)\s*-\s*(\d+)/);
    return { journey: toNumber(cells[0]), homeTeam: cells[1] ?? "", awayTeam: cells[2] ?? "", homeScore: score ? Number(score[1]) : null, awayScore: score ? Number(score[2]) : null, observations: cells[4] || null };
  }).filter(row => row.journey > 0 && row.homeTeam && row.awayTeam);
}

async function imdRequest(params: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(IMD_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Buyuyus-Basket-Manager/1.0" }, body: new URLSearchParams(params).toString(), signal: controller.signal });
    if (!response.ok) throw new Error(`El portal del IMD respondió ${response.status}.`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function findTeamId(html: string) {
  return html.match(/datosequipo\s*\(\s*['"]([^'"]+)['"]\s*\)/i)?.[1]
    ?? html.match(/id=["']jdmresult_idequipo["'][^>]*value=["']([^'"]+)["']/i)?.[1]
    ?? null;
}

function findGroup(html: string) {
  const buyuyusRow = extractTables(html).flat().find(cells => normalizeImdName(cells[0] ?? "").includes("BUYUYUS"));
  return buyuyusRow?.[4] ?? null;
}

export async function fetchImdSnapshot(config: SyncConfig, mode: "provisional" | "final"): Promise<ImdSnapshot> {
  if (!config.portalCompetition) throw new Error("Configura el nombre de competición del portal IMD antes de consultar.");
  const provisional = mode === "provisional" ? "1" : "2";
  const discovery = await imdRequest({ opc: "2", provisional, com: config.portalCompetition, dis: "", busqueda: config.teamSearch, idequipo: "", jor: "" });
  const portalTeamId = findTeamId(discovery) ?? config.portalTeamId;
  if (!portalTeamId) throw new Error(`No se ha localizado ningún equipo IMD para la búsqueda «${config.teamSearch}».`);
  const base = { provisional, com: config.portalCompetition, dis: "", busqueda: "", idequipo: portalTeamId, jor: "" };
  const [classificationHtml, resultsHtml] = await Promise.all([
    imdRequest({ ...base, opc: "3" }),
    imdRequest({ ...base, opc: "4" }),
  ]);
  const standings = parseImdStandings(classificationHtml);
  const results = parseImdResults(resultsHtml);
  if (!standings.length && !results.length) throw new Error("El IMD no devolvió clasificación ni resultados para el equipo seleccionado.");
  return { sourceUrl: IMD_PUBLIC_PAGE, portalCompetition: config.portalCompetition, portalTeamId, portalGroup: findGroup(discovery), standings, results, retrievedAt: new Date().toISOString() };
}

function isBuyuyus(team: string) { return normalizeImdName(team).includes("BUYUYUS"); }

export async function buildImdChanges(config: SyncConfig, snapshot: ImdSnapshot) {
  const db = await requireDb();
  const existing = await db.select({ matchId: matches.id, opponent: matches.opponent, venue: matches.venue, ownScore: matches.ownScore, opponentScore: matches.opponentScore, status: matches.status }).from(matches).where(eq(matches.competitionId, config.competitionId));
  const updates = snapshot.results.filter(item => item.homeScore !== null && item.awayScore !== null).map(item => {
    const opponent = isBuyuyus(item.homeTeam) ? item.awayTeam : item.homeTeam;
    const ownScore = isBuyuyus(item.homeTeam) ? item.homeScore! : item.awayScore!;
    const opponentScore = isBuyuyus(item.homeTeam) ? item.awayScore! : item.homeScore!;
    const match = existing.find(candidate => normalizeImdName(candidate.opponent) === normalizeImdName(opponent));
    return { journey: item.journey, opponent, ownScore, opponentScore, matchId: match?.matchId ?? null, currentOwnScore: match?.ownScore ?? null, currentOpponentScore: match?.opponentScore ?? null, needsUpdate: Boolean(match && (match.ownScore !== ownScore || match.opponentScore !== opponentScore || match.status !== "completed")) };
  });
  const unmatched = updates.filter(item => !item.matchId);
  const changes = updates.filter(item => item.needsUpdate);
  const currentStanding = await db.select().from(competitionStandings).where(eq(competitionStandings.competitionId, config.competitionId));
  const standingChanged = JSON.stringify(currentStanding.map(row => ({ teamName: normalizeImdName(row.teamName), position: row.position, played: row.played, won: row.won, drawn: row.drawn, lost: row.lost, forfeits: row.forfeits, pointsFor: row.pointsFor, pointsAgainst: row.pointsAgainst, points: row.points })).sort((a, b) => a.teamName.localeCompare(b.teamName))) !== JSON.stringify(snapshot.standings.map(row => ({ ...row, teamName: normalizeImdName(row.teamName) })).sort((a, b) => a.teamName.localeCompare(b.teamName)));
  return { resultUpdates: changes, unmatchedResults: unmatched, standingChanged, hasChanges: Boolean(changes.length || unmatched.length || standingChanged) };
}

export async function createImdDraft(configId: number, mode: "provisional" | "final") {
  const db = await requireDb();
  const [config] = await db.select().from(imdSyncConfigs).where(eq(imdSyncConfigs.id, configId)).limit(1);
  if (!config || !config.isActive) throw new Error("No se ha encontrado una configuración IMD activa.");
  try {
    const snapshot = await fetchImdSnapshot(config, mode);
    const changes = await buildImdChanges(config, snapshot);
    const status = changes.hasChanges ? "pending" : "unchanged" as const;
    const result = await db.insert(imdSyncDrafts).values({ configId, mode, status, sourceUrl: snapshot.sourceUrl, portalCompetition: snapshot.portalCompetition, portalTeamId: snapshot.portalTeamId, portalGroup: snapshot.portalGroup, classificationData: snapshot.standings, resultsData: snapshot.results, changesData: changes });
    await db.update(imdSyncConfigs).set({ portalTeamId: snapshot.portalTeamId, portalGroup: snapshot.portalGroup, lastProvisionalAt: mode === "provisional" ? new Date() : config.lastProvisionalAt, lastFinalAt: mode === "final" ? new Date() : config.lastFinalAt }).where(eq(imdSyncConfigs.id, configId));
    return { id: Number(result[0].insertId), status, changes };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al consultar el IMD.";
    const result = await db.insert(imdSyncDrafts).values({ configId, mode, status: "failed", sourceUrl: IMD_PUBLIC_PAGE, errorMessage: message });
    return { id: Number(result[0].insertId), status: "failed" as const, changes: null, error: message };
  }
}

export async function runActiveImdSyncs(mode: "provisional" | "final") {
  const db = await requireDb();
  const configs = await db.select().from(imdSyncConfigs).where(eq(imdSyncConfigs.isActive, true));
  const results = [];
  for (const config of configs) results.push(await createImdDraft(config.id, mode));
  return results;
}

export async function applyImdDraft(draftId: number, reviewerId: number) {
  const db = await requireDb();
  const [draft] = await db.select().from(imdSyncDrafts).where(eq(imdSyncDrafts.id, draftId)).limit(1);
  if (!draft || draft.status !== "pending") throw new Error("El borrador ya no está pendiente de revisión.");
  const [config] = await db.select().from(imdSyncConfigs).where(eq(imdSyncConfigs.id, draft.configId)).limit(1);
  if (!config) throw new Error("No se ha encontrado la configuración asociada al borrador.");
  const changes = draft.changesData as { resultUpdates?: Array<{ matchId: number; ownScore: number; opponentScore: number }> } | null;
  const standings = draft.classificationData as ImdStanding[] | null;
  for (const update of changes?.resultUpdates ?? []) {
    await db.update(matches).set({ ownScore: update.ownScore, opponentScore: update.opponentScore, status: "completed", updatedAt: new Date() }).where(and(eq(matches.id, update.matchId), eq(matches.competitionId, config.competitionId)));
  }
  if (standings?.length) {
    await db.delete(competitionStandings).where(eq(competitionStandings.competitionId, config.competitionId));
    await db.insert(competitionStandings).values(standings.map(row => ({ competitionId: config.competitionId, ...row })));
  }
  await db.update(imdSyncDrafts).set({ status: "applied", reviewedByUserId: reviewerId, reviewedAt: new Date(), appliedAt: new Date() }).where(eq(imdSyncDrafts.id, draftId));
  return { appliedResults: changes?.resultUpdates?.length ?? 0, appliedStandings: standings?.length ?? 0 };
}
