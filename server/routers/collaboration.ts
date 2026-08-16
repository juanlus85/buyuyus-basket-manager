import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { teamAnnouncements } from "../../drizzle/schema";
import { requireDb } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

export const announcementRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(teamAnnouncements).orderBy(desc(teamAnnouncements.isPinned), desc(teamAnnouncements.publishedAt));
  }),

  publish: adminProcedure.input(z.object({ title: z.string().trim().min(2).max(180), content: z.string().trim().min(2).max(8000), isPinned: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(teamAnnouncements).values({ ...input, authorUserId: ctx.user.id });
    return { id: Number(result[0].insertId) };
  }),

  remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(teamAnnouncements).where(eq(teamAnnouncements.id, input.id));
    return { success: true };
  }),

  setPinned: adminProcedure.input(z.object({ id: z.number().int().positive(), isPinned: z.boolean() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(teamAnnouncements).set({ isPinned: input.isPinned, updatedAt: new Date() }).where(eq(teamAnnouncements.id, input.id));
    return { success: true };
  }),
});
