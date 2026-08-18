import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { imdSyncConfigs, imdSyncDrafts, competitions, seasons } from "../../drizzle/schema";
import { requireDb } from "../db";
import { applyImdDraft, createImdDraft } from "../imdSyncService";
import { adminProcedure, router } from "../_core/trpc";

const configInput = z.object({ seasonId: z.number().int().positive(), competitionId: z.number().int().positive(), portalCompetition: z.string().trim().min(4).max(180), teamSearch: z.string().trim().min(3).max(120).default("BUYUYUS") });

export const imdSyncRouter = router({
  configs: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select({ config: imdSyncConfigs, season: seasons, competition: competitions }).from(imdSyncConfigs).innerJoin(seasons, eq(imdSyncConfigs.seasonId, seasons.id)).innerJoin(competitions, eq(imdSyncConfigs.competitionId, competitions.id)).orderBy(desc(imdSyncConfigs.createdAt));
  }),
  saveConfig: adminProcedure.input(configInput).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const existing = (await db.select().from(imdSyncConfigs).where(eq(imdSyncConfigs.competitionId, input.competitionId)).limit(1))[0];
    if (existing) {
      await db.update(imdSyncConfigs).set({ seasonId: input.seasonId, portalCompetition: input.portalCompetition, teamSearch: input.teamSearch, isActive: true }).where(eq(imdSyncConfigs.id, existing.id));
      return { id: existing.id, created: false };
    }
    const result = await db.insert(imdSyncConfigs).values({ ...input, createdByUserId: ctx.user.id });
    return { id: Number(result[0].insertId), created: true };
  }),
  runNow: adminProcedure.input(z.object({ configId: z.number().int().positive(), mode: z.enum(["provisional", "final"]) })).mutation(async ({ input }) => createImdDraft(input.configId, input.mode)),
  drafts: adminProcedure.input(z.object({ configId: z.number().int().positive().optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const base = db.select({ draft: imdSyncDrafts, config: imdSyncConfigs, season: seasons, competition: competitions }).from(imdSyncDrafts).innerJoin(imdSyncConfigs, eq(imdSyncDrafts.configId, imdSyncConfigs.id)).innerJoin(seasons, eq(imdSyncConfigs.seasonId, seasons.id)).innerJoin(competitions, eq(imdSyncConfigs.competitionId, competitions.id)).orderBy(desc(imdSyncDrafts.createdAt)).limit(30);
    return input?.configId ? base.where(eq(imdSyncDrafts.configId, input.configId)) : base;
  }),
  applyDraft: adminProcedure.input(z.object({ draftId: z.number().int().positive() })).mutation(async ({ ctx, input }) => applyImdDraft(input.draftId, ctx.user.id)),
  discard: adminProcedure.input(z.object({ draftId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(imdSyncDrafts).set({ status: "discarded", reviewedByUserId: ctx.user.id, reviewedAt: new Date() }).where(eq(imdSyncDrafts.id, input.draftId));
    return { success: true };
  }),
});
