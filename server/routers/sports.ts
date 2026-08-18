import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";
import { competitionStandings, competitions, eventAttendances, matches, playerMatchStats, playerProfiles, seasons, teamEvents, users } from "../../drizzle/schema";
import { requireDb } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const seasonInput = z.object({
  name: z.string().trim().min(4).max(80),
  startsAt: z.date(),
  endsAt: z.date(),
  description: z.string().trim().max(4000).nullable().optional(),
});

const competitionInput = z.object({
  seasonId: z.number().int().positive(),
  name: z.string().trim().min(2).max(140),
  phase: z.string().trim().max(80).nullable().optional(),
  status: z.enum(["upcoming", "active", "finished", "archived"]).default("upcoming"),
  description: z.string().trim().max(4000).nullable().optional(),
});

const eventInput = z.object({
  seasonId: z.number().int().positive().nullable().optional(),
  competitionId: z.number().int().positive().nullable().optional(),
  type: z.enum(["training", "match", "general"]),
  title: z.string().trim().min(2).max(180),
  startsAt: z.date(),
  endsAt: z.date().nullable().optional(),
  callAt: z.date().nullable().optional(),
  location: z.string().trim().max(220).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  attendanceEnabled: z.boolean().optional(),
});
type EventInput = z.infer<typeof eventInput>;

type CompletedGame = { opponent: string; ownScore: number; opponentScore: number };
const playerStatInput = z.object({ playerId: z.number().int().positive(), played: z.boolean().default(true), fouls: z.number().int().min(0).max(10).default(0), technicalFouls: z.number().int().min(0).max(5).default(0), unsportsmanlikeFouls: z.number().int().min(0).max(5).default(0) });

export function calculatePlayerSeasonStats(rows: Array<{ played: boolean; fouls: number; technicalFouls: number; unsportsmanlikeFouls: number; ownScore: number | null; opponentScore: number | null; status: "scheduled" | "completed" | "postponed" | "cancelled" }>) {
  return rows.reduce((summary, row) => {
    if (!row.played) return summary;
    summary.played += 1; summary.fouls += row.fouls; summary.technicalFouls += row.technicalFouls; summary.unsportsmanlikeFouls += row.unsportsmanlikeFouls;
    if (row.status === "completed" && row.ownScore !== null && row.opponentScore !== null) {
      if (row.ownScore > row.opponentScore) summary.won += 1;
      else if (row.ownScore < row.opponentScore) summary.lost += 1;
    }
    return summary;
  }, { played: 0, won: 0, lost: 0, fouls: 0, technicalFouls: 0, unsportsmanlikeFouls: 0 });
}

type TeamStatisticRow = {
  playerId: number;
  fullName: string;
  shortName: string | null;
  jerseyNumber: number | null;
  matchId: number;
  played: boolean;
  fouls: number;
  technicalFouls: number;
  unsportsmanlikeFouls: number;
  ownScore: number | null;
  opponentScore: number | null;
  status: "scheduled" | "completed" | "postponed" | "cancelled";
};

export function calculateTeamSeasonStatistics(rows: TeamStatisticRow[]) {
  const grouped = new Map<number, { player: Pick<TeamStatisticRow, "playerId" | "fullName" | "shortName" | "jerseyNumber">; rows: TeamStatisticRow[] }>();
  for (const row of rows) {
    const current = grouped.get(row.playerId) ?? { player: { playerId: row.playerId, fullName: row.fullName, shortName: row.shortName, jerseyNumber: row.jerseyNumber }, rows: [] };
    current.rows.push(row);
    grouped.set(row.playerId, current);
  }
  const players = Array.from(grouped.values()).map(entry => ({
    player: { id: entry.player.playerId, fullName: entry.player.fullName, shortName: entry.player.shortName, jerseyNumber: entry.player.jerseyNumber },
    summary: calculatePlayerSeasonStats(entry.rows),
  })).sort((a, b) => b.summary.played - a.summary.played || b.summary.won - a.summary.won || b.summary.fouls - a.summary.fouls || a.player.fullName.localeCompare(b.player.fullName, "es"));
  const uniqueCompletedMatches = Array.from(new Map(rows.filter(row => row.status === "completed" && row.ownScore !== null && row.opponentScore !== null).map(row => [row.matchId, row])).values());
  return {
    players,
    summary: {
      playersWithStats: players.length,
      reportedMatches: new Set(rows.map(row => row.matchId)).size,
      participations: players.reduce((total, item) => total + item.summary.played, 0),
      teamPlayed: uniqueCompletedMatches.length,
      teamWon: uniqueCompletedMatches.filter(match => match.ownScore! > match.opponentScore!).length,
      teamLost: uniqueCompletedMatches.filter(match => match.ownScore! < match.opponentScore!).length,
      fouls: players.reduce((total, item) => total + item.summary.fouls, 0),
      technicalFouls: players.reduce((total, item) => total + item.summary.technicalFouls, 0),
      unsportsmanlikeFouls: players.reduce((total, item) => total + item.summary.unsportsmanlikeFouls, 0),
    },
  };
}

export function summarizeAttendance(responses: Array<{ status: "going" | "maybe" | "not_going"; userId: number }>, userId: number) {
  return { going: responses.filter(item => item.status === "going").length, maybe: responses.filter(item => item.status === "maybe").length, notGoing: responses.filter(item => item.status === "not_going").length, mine: responses.find(item => item.userId === userId)?.status ?? null };
}

export function selectNextActivities<T extends { event: { type: "training" | "match" | "general" } }>(rows: T[]) {
  return { nextMatch: rows.find(row => row.event.type === "match") ?? null, nextTraining: rows.find(row => row.event.type === "training") ?? null };
}

export function buildEventValues(input: EventInput, userId: number) {
  return { ...input, seasonId: input.seasonId ?? null, competitionId: input.competitionId ?? null, endsAt: input.endsAt ?? null, callAt: input.callAt ?? null, location: input.location ?? null, description: input.description ?? null, attendanceEnabled: input.attendanceEnabled ?? input.type === "training", createdByUserId: userId };
}

export function buildWeeklyTrainingRows(input: { seasonId: number; seriesId: string; title: string; startsAt: Date; seasonEndsAt: Date; callAt?: Date | null; location?: string | null; description?: string | null; createdByUserId: number }) {
  const rows: Array<{ seasonId: number; recurrenceSeriesId: string; type: "training"; title: string; startsAt: Date; callAt: Date | null; location: string | null; description: string | null; attendanceEnabled: boolean; createdByUserId: number }> = [];
  const callOffset = input.callAt ? input.callAt.getTime() - input.startsAt.getTime() : null;
  for (let current = new Date(input.startsAt); current <= input.seasonEndsAt; current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)) {
    rows.push({ seasonId: input.seasonId, recurrenceSeriesId: input.seriesId, type: "training", title: input.title, startsAt: new Date(current), callAt: callOffset === null ? null : new Date(current.getTime() + callOffset), location: input.location ?? null, description: input.description ?? null, attendanceEnabled: true, createdByUserId: input.createdByUserId });
  }
  return rows;
}

export function resolveTrainingDeletion(scope: "single" | "from_here" | "all_series", event: { id: number; startsAt: Date; recurrenceSeriesId: string | null }) {
  if (scope === "single" || !event.recurrenceSeriesId) return { kind: "single" as const, eventId: event.id };
  if (scope === "from_here") return { kind: "from_here" as const, seriesId: event.recurrenceSeriesId, startsAt: event.startsAt };
  return { kind: "all_series" as const, seriesId: event.recurrenceSeriesId };
}

export function calculateStandings(games: CompletedGame[]) {
  const table = new Map<string, { teamName: string; played: number; won: number; drawn: number; lost: number; forfeits: number; pointsFor: number; pointsAgainst: number; points: number }>();
  const entry = (name: string) => {
    const current = table.get(name);
    if (current) return current;
    const next = { teamName: name, played: 0, won: 0, drawn: 0, lost: 0, forfeits: 0, pointsFor: 0, pointsAgainst: 0, points: 0 };
    table.set(name, next);
    return next;
  };
  for (const game of games) {
    const buyuyus = entry("Buyuyus");
    const opponent = entry(game.opponent);
    buyuyus.played += 1; opponent.played += 1;
    buyuyus.pointsFor += game.ownScore; buyuyus.pointsAgainst += game.opponentScore;
    opponent.pointsFor += game.opponentScore; opponent.pointsAgainst += game.ownScore;
    if (game.ownScore > game.opponentScore) { buyuyus.won += 1; buyuyus.points += 2; opponent.lost += 1; }
    else if (game.ownScore < game.opponentScore) { opponent.won += 1; opponent.points += 2; buyuyus.lost += 1; }
    else { buyuyus.drawn += 1; opponent.drawn += 1; buyuyus.points += 1; opponent.points += 1; }
  }
  return Array.from(table.values())
    .sort((a, b) => b.points - a.points || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst) || b.pointsFor - a.pointsFor || a.teamName.localeCompare(b.teamName))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

async function syncStandings(competitionId: number) {
  const db = await requireDb();
  const games = await db
    .select({ opponent: matches.opponent, ownScore: matches.ownScore, opponentScore: matches.opponentScore })
    .from(matches)
    .where(and(eq(matches.competitionId, competitionId), eq(matches.status, "completed")));
  const completed = games.filter((game): game is CompletedGame => game.ownScore !== null && game.opponentScore !== null);
  const rows = calculateStandings(completed);
  await db.delete(competitionStandings).where(eq(competitionStandings.competitionId, competitionId));
  if (rows.length) await db.insert(competitionStandings).values(rows.map(row => ({ competitionId, ...row })));
}

export const sportRouter = router({
  seasons: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(seasons).orderBy(desc(seasons.isCurrent), desc(seasons.startsAt));
  }),

  createSeason: adminProcedure.input(seasonInput).mutation(async ({ input }) => {
    if (input.startsAt >= input.endsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "La temporada debe tener una fecha de cierre posterior al inicio." });
    const db = await requireDb();
    const result = await db.insert(seasons).values({ ...input, description: input.description ?? null });
    return { id: Number(result[0].insertId) };
  }),

  setCurrentSeason: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(seasons).set({ isCurrent: false });
    await db.update(seasons).set({ isCurrent: true, updatedAt: new Date() }).where(eq(seasons.id, input.id));
    return { success: true };
  }),

  competitions: protectedProcedure.input(z.object({ seasonId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const statement = db.select().from(competitions).orderBy(asc(competitions.name));
    return input?.seasonId ? statement.where(eq(competitions.seasonId, input.seasonId)) : statement;
  }),

  createCompetition: adminProcedure.input(competitionInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const result = await db.insert(competitions).values({ ...input, phase: input.phase ?? null, description: input.description ?? null });
    return { id: Number(result[0].insertId) };
  }),

  events: protectedProcedure.input(z.object({ seasonId: z.number().int().positive().optional(), limit: z.number().int().min(1).max(250).default(100) }).optional()).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const statement = db
      .select({ event: teamEvents, competitionName: competitions.name, seasonName: seasons.name })
      .from(teamEvents)
      .leftJoin(competitions, eq(teamEvents.competitionId, competitions.id))
      .leftJoin(seasons, eq(teamEvents.seasonId, seasons.id))
      .orderBy(asc(teamEvents.startsAt))
      .limit(input?.limit ?? 100);
    const rows = await (input?.seasonId ? statement.where(eq(teamEvents.seasonId, input.seasonId)) : statement);
    const ids = rows.map(row => row.event.id);
    if (!ids.length) return rows.map(row => ({ ...row, attendance: { going: 0, maybe: 0, notGoing: 0, mine: null as "going" | "maybe" | "not_going" | null } }));
    const responses = await db.select({ eventId: eventAttendances.eventId, status: eventAttendances.status, userId: eventAttendances.userId }).from(eventAttendances).where(inArray(eventAttendances.eventId, ids));
    return rows.map(row => {
      const current = responses.filter(response => response.eventId === row.event.id);
      return { ...row, attendance: summarizeAttendance(current, ctx.user.id) };
    });
  }),

  createEvent: adminProcedure.input(eventInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(teamEvents).values(buildEventValues(input, ctx.user.id));
    return { id: Number(result[0].insertId) };
  }),

  createRecurringTraining: adminProcedure.input(z.object({ seasonId: z.number().int().positive(), title: z.string().trim().min(2).max(180).default("Entrenamiento"), startsAt: z.date(), callAt: z.date().nullable().optional(), location: z.string().trim().max(220).nullable().optional(), description: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [season] = await db.select().from(seasons).where(eq(seasons.id, input.seasonId)).limit(1);
    if (!season) throw new TRPCError({ code: "NOT_FOUND", message: "No se ha encontrado la temporada seleccionada." });
    if (input.startsAt > season.endsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "El primer entrenamiento debe estar dentro de la temporada." });
    const seriesId = crypto.randomUUID();
    const rows = buildWeeklyTrainingRows({ ...input, seriesId, seasonEndsAt: season.endsAt, createdByUserId: ctx.user.id });
    if (rows.length > 70) throw new TRPCError({ code: "BAD_REQUEST", message: "La serie supera el máximo de 70 entrenamientos." });
    await db.insert(teamEvents).values(rows);
    return { seriesId, created: rows.length };
  }),

  deleteTraining: adminProcedure.input(z.object({ eventId: z.number().int().positive(), scope: z.enum(["single", "from_here", "all_series"]) })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [event] = await db.select().from(teamEvents).where(eq(teamEvents.id, input.eventId)).limit(1);
    if (!event || event.type !== "training") throw new TRPCError({ code: "NOT_FOUND", message: "No se ha encontrado el entrenamiento." });
    const deletion = resolveTrainingDeletion(input.scope, event);
    if (deletion.kind === "single") await db.delete(teamEvents).where(eq(teamEvents.id, deletion.eventId));
    else if (deletion.kind === "from_here") await db.delete(teamEvents).where(and(eq(teamEvents.recurrenceSeriesId, deletion.seriesId), gte(teamEvents.startsAt, deletion.startsAt)));
    else await db.delete(teamEvents).where(eq(teamEvents.recurrenceSeriesId, deletion.seriesId));
    return { success: true };
  }),

  matches: protectedProcedure.input(z.object({ competitionId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const statement = db
      .select({ match: matches, event: teamEvents, competitionName: competitions.name, seasonName: seasons.name })
      .from(matches)
      .innerJoin(teamEvents, eq(matches.eventId, teamEvents.id))
      .leftJoin(competitions, eq(matches.competitionId, competitions.id))
      .leftJoin(seasons, eq(teamEvents.seasonId, seasons.id))
      .orderBy(desc(teamEvents.startsAt));
    return input?.competitionId ? statement.where(eq(matches.competitionId, input.competitionId)) : statement;
  }),

  createMatch: adminProcedure
    .input(eventInput.extend({ opponent: z.string().trim().min(2).max(140), venue: z.enum(["home", "away", "neutral"]).default("home"), ownScore: z.number().int().min(0).max(300).nullable().optional(), opponentScore: z.number().int().min(0).max(300).nullable().optional(), status: z.enum(["scheduled", "completed", "postponed", "cancelled"]).default("scheduled"), notes: z.string().trim().max(4000).nullable().optional() }).refine(value => value.type === "match", { message: "Un partido debe tener tipo match." }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [event] = await db.insert(teamEvents).values({
        seasonId: input.seasonId ?? null,
        competitionId: input.competitionId ?? null,
        type: "match",
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        callAt: input.callAt ?? null,
        location: input.location ?? null,
        description: input.description ?? null,
        attendanceEnabled: input.attendanceEnabled ?? false,
        createdByUserId: ctx.user.id,
      });
      const result = await db.insert(matches).values({
        eventId: Number(event.insertId),
        competitionId: input.competitionId ?? null,
        opponent: input.opponent,
        venue: input.venue,
        ownScore: input.ownScore ?? null,
        opponentScore: input.opponentScore ?? null,
        status: input.status,
        notes: input.notes ?? null,
      });
      if (input.status === "completed" && input.competitionId) await syncStandings(input.competitionId);
      return { id: Number(result[0].insertId) };
    }),

  updateResult: adminProcedure.input(z.object({ id: z.number().int().positive(), ownScore: z.number().int().min(0).max(300), opponentScore: z.number().int().min(0).max(300), notes: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [match] = await db.select().from(matches).where(eq(matches.id, input.id)).limit(1);
    if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "No se ha encontrado el partido." });
    await db.update(matches).set({ ownScore: input.ownScore, opponentScore: input.opponentScore, notes: input.notes ?? null, status: "completed", updatedAt: new Date() }).where(eq(matches.id, input.id));
    if (match.competitionId) await syncStandings(match.competitionId);
    return { success: true };
  }),

  applyMatchReport: adminProcedure.input(z.object({ matchId: z.number().int().positive(), ownScore: z.number().int().min(0).max(300), opponentScore: z.number().int().min(0).max(300), sourceImportId: z.number().int().positive().nullable().optional(), notes: z.string().trim().max(4000).nullable().optional(), playerStats: z.array(playerStatInput).min(1).max(40) }).superRefine((value, ctx) => { if (new Set(value.playerStats.map(item => item.playerId)).size !== value.playerStats.length) ctx.addIssue({ code: "custom", message: "Un jugador solo puede aparecer una vez en el acta." }); })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [match] = await db.select().from(matches).where(eq(matches.id, input.matchId)).limit(1);
    if (!match) throw new TRPCError({ code: "NOT_FOUND", message: "No se ha encontrado el partido." });
    const knownPlayers = await db.select({ id: playerProfiles.id }).from(playerProfiles).where(inArray(playerProfiles.id, input.playerStats.map(item => item.playerId)));
    if (knownPlayers.length !== input.playerStats.length) throw new TRPCError({ code: "BAD_REQUEST", message: "El acta contiene un jugador no reconocido." });
    await db.update(matches).set({ ownScore: input.ownScore, opponentScore: input.opponentScore, notes: input.notes ?? null, status: "completed", updatedAt: new Date() }).where(eq(matches.id, input.matchId));
    await db.delete(playerMatchStats).where(eq(playerMatchStats.matchId, input.matchId));
    await db.insert(playerMatchStats).values(input.playerStats.map(stat => ({ ...stat, matchId: input.matchId, sourceImportId: input.sourceImportId ?? null, confirmedByUserId: ctx.user.id })));
    if (match.competitionId) await syncStandings(match.competitionId);
    return { success: true, playersUpdated: input.playerStats.length };
  }),

  playerStatistics: protectedProcedure.input(z.object({ playerId: z.number().int().positive(), seasonId: z.number().int().positive().optional() })).query(async ({ input }) => {
    const db = await requireDb();
    const condition = input.seasonId ? and(eq(playerMatchStats.playerId, input.playerId), eq(teamEvents.seasonId, input.seasonId)) : eq(playerMatchStats.playerId, input.playerId);
    const rows = await db.select({ stat: playerMatchStats, match: matches, event: teamEvents }).from(playerMatchStats).innerJoin(matches, eq(playerMatchStats.matchId, matches.id)).innerJoin(teamEvents, eq(matches.eventId, teamEvents.id)).where(condition).orderBy(desc(teamEvents.startsAt));
    return { summary: calculatePlayerSeasonStats(rows.map(row => ({ ...row.stat, ownScore: row.match.ownScore, opponentScore: row.match.opponentScore, status: row.match.status }))), matches: rows };
  }),

  teamStatistics: protectedProcedure.input(z.object({ seasonId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await requireDb();
    const rows = await db.select({
      playerId: playerProfiles.id,
      fullName: playerProfiles.fullName,
      shortName: playerProfiles.shortName,
      jerseyNumber: playerProfiles.jerseyNumber,
      matchId: matches.id,
      played: playerMatchStats.played,
      fouls: playerMatchStats.fouls,
      technicalFouls: playerMatchStats.technicalFouls,
      unsportsmanlikeFouls: playerMatchStats.unsportsmanlikeFouls,
      ownScore: matches.ownScore,
      opponentScore: matches.opponentScore,
      status: matches.status,
    }).from(playerMatchStats).innerJoin(playerProfiles, eq(playerMatchStats.playerId, playerProfiles.id)).innerJoin(matches, eq(playerMatchStats.matchId, matches.id)).innerJoin(teamEvents, eq(matches.eventId, teamEvents.id)).where(eq(teamEvents.seasonId, input.seasonId));
    return calculateTeamSeasonStatistics(rows);
  }),

  standings: protectedProcedure.input(z.object({ competitionId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await requireDb();
    return db.select().from(competitionStandings).where(eq(competitionStandings.competitionId, input.competitionId)).orderBy(asc(competitionStandings.position), desc(competitionStandings.points), desc(competitionStandings.pointsFor));
  }),

  respondAttendance: protectedProcedure.input(z.object({ eventId: z.number().int().positive(), status: z.enum(["going", "not_going", "maybe"]), note: z.string().trim().max(400).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [event] = await db.select({ id: teamEvents.id, attendanceEnabled: teamEvents.attendanceEnabled }).from(teamEvents).where(eq(teamEvents.id, input.eventId)).limit(1);
    if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "No se ha encontrado la actividad." });
    if (!event.attendanceEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta actividad no requiere confirmación de asistencia." });
    await db.insert(eventAttendances).values({ eventId: input.eventId, userId: ctx.user.id, status: input.status, note: input.note ?? null, respondedAt: new Date() }).onDuplicateKeyUpdate({ set: { status: input.status, note: input.note ?? null, respondedAt: new Date(), updatedAt: new Date() } });
    return { success: true };
  }),

  nextSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb(); const now = new Date();
    const upcoming = await db.select({ event: teamEvents, match: matches, competitionName: competitions.name }).from(teamEvents).leftJoin(matches, eq(matches.eventId, teamEvents.id)).leftJoin(competitions, eq(matches.competitionId, competitions.id)).where(gte(teamEvents.startsAt, now)).orderBy(asc(teamEvents.startsAt)).limit(30);
    const enrich = async (row: typeof upcoming[number] | null | undefined) => {
      if (!row) return null;
      const responses = await db.select({ status: eventAttendances.status, userId: eventAttendances.userId }).from(eventAttendances).where(eq(eventAttendances.eventId, row.event.id));
      return { ...row, attendance: summarizeAttendance(responses, ctx.user.id) };
    };
    const selected = selectNextActivities(upcoming);
    return { nextMatch: await enrich(selected.nextMatch), nextTraining: await enrich(selected.nextTraining) };
  }),

  upsertStanding: adminProcedure
    .input(z.object({ competitionId: z.number().int().positive(), teamName: z.string().trim().min(2).max(160), position: z.number().int().min(1).max(999).nullable().optional(), played: z.number().int().min(0).max(999).default(0), won: z.number().int().min(0).max(999).default(0), drawn: z.number().int().min(0).max(999).default(0), lost: z.number().int().min(0).max(999).default(0), forfeits: z.number().int().min(0).max(999).default(0), pointsFor: z.number().int().min(0).max(99999).default(0), pointsAgainst: z.number().int().min(0).max(99999).default(0), points: z.number().int().min(0).max(9999).default(0) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.insert(competitionStandings).values({ ...input, position: input.position ?? null }).onDuplicateKeyUpdate({ set: { position: input.position ?? null, played: input.played, won: input.won, drawn: input.drawn, lost: input.lost, forfeits: input.forfeits, pointsFor: input.pointsFor, pointsAgainst: input.pointsAgainst, points: input.points, updatedAt: new Date() } });
      return { success: true };
    }),
});
