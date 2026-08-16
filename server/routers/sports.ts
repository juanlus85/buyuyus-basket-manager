import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { competitionStandings, competitions, matches, seasons, teamEvents } from "../../drizzle/schema";
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
  location: z.string().trim().max(220).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
});

type CompletedGame = { opponent: string; ownScore: number; opponentScore: number };

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

  events: protectedProcedure.input(z.object({ seasonId: z.number().int().positive().optional(), limit: z.number().int().min(1).max(250).default(100) }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const statement = db
      .select({ event: teamEvents, competitionName: competitions.name, seasonName: seasons.name })
      .from(teamEvents)
      .leftJoin(competitions, eq(teamEvents.competitionId, competitions.id))
      .leftJoin(seasons, eq(teamEvents.seasonId, seasons.id))
      .orderBy(asc(teamEvents.startsAt))
      .limit(input?.limit ?? 100);
    return input?.seasonId ? statement.where(eq(teamEvents.seasonId, input.seasonId)) : statement;
  }),

  createEvent: adminProcedure.input(eventInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(teamEvents).values({ ...input, seasonId: input.seasonId ?? null, competitionId: input.competitionId ?? null, endsAt: input.endsAt ?? null, location: input.location ?? null, description: input.description ?? null, createdByUserId: ctx.user.id });
    return { id: Number(result[0].insertId) };
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
        location: input.location ?? null,
        description: input.description ?? null,
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

  standings: protectedProcedure.input(z.object({ competitionId: z.number().int().positive() })).query(async ({ input }) => {
    const db = await requireDb();
    return db.select().from(competitionStandings).where(eq(competitionStandings.competitionId, input.competitionId)).orderBy(asc(competitionStandings.position), desc(competitionStandings.points), desc(competitionStandings.pointsFor));
  }),

  upsertStanding: adminProcedure
    .input(z.object({ competitionId: z.number().int().positive(), teamName: z.string().trim().min(2).max(160), position: z.number().int().min(1).max(999).nullable().optional(), played: z.number().int().min(0).max(999).default(0), won: z.number().int().min(0).max(999).default(0), drawn: z.number().int().min(0).max(999).default(0), lost: z.number().int().min(0).max(999).default(0), forfeits: z.number().int().min(0).max(999).default(0), pointsFor: z.number().int().min(0).max(99999).default(0), pointsAgainst: z.number().int().min(0).max(99999).default(0), points: z.number().int().min(0).max(9999).default(0) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db.insert(competitionStandings).values({ ...input, position: input.position ?? null }).onDuplicateKeyUpdate({ set: { position: input.position ?? null, played: input.played, won: input.won, drawn: input.drawn, lost: input.lost, forfeits: input.forfeits, pointsFor: input.pointsFor, pointsAgainst: input.pointsAgainst, points: input.points, updatedAt: new Date() } });
      return { success: true };
    }),
});
