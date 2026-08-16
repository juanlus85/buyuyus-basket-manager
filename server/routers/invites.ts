import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { playerProfiles, userInvites, users } from "../../drizzle/schema";
import { requireDb } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const inviteRouter = router({
  list: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select({ invite: userInvites, playerName: playerProfiles.fullName }).from(userInvites).leftJoin(playerProfiles, eq(userInvites.playerId, playerProfiles.id)).orderBy(desc(userInvites.createdAt));
  }),

  create: adminProcedure
    .input(z.object({ email: z.string().trim().email().max(320), role: z.enum(["user", "admin"]).default("user"), playerId: z.number().int().positive().nullable().optional(), origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const origin = new URL(input.origin);
      if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La invitación debe generarse desde una URL segura." });
      }
      const db = await requireDb();
      const token = nanoid(48);
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const result = await db.insert(userInvites).values({ email: input.email.toLowerCase(), role: input.role, playerId: input.playerId ?? null, token, expiresAt, createdByUserId: ctx.user.id });
      return { id: Number(result[0].insertId), inviteUrl: `${origin.origin}/invitar/${token}`, expiresAt };
    }),

  revoke: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(userInvites).set({ status: "revoked", updatedAt: new Date() }).where(eq(userInvites.id, input.id));
    return { success: true };
  }),

  accept: protectedProcedure.input(z.object({ token: z.string().min(20).max(96) })).mutation(async ({ ctx, input }) => {
    if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Tu cuenta no tiene correo disponible para validar la invitación." });
    const db = await requireDb();
    const [invite] = await db.select().from(userInvites).where(and(eq(userInvites.token, input.token), eq(userInvites.status, "pending"), gt(userInvites.expiresAt, new Date()))).limit(1);
    if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "La invitación no está disponible o ha caducado." });
    if (invite.email.toLowerCase() !== ctx.user.email.toLowerCase()) throw new TRPCError({ code: "FORBIDDEN", message: "Esta invitación está dirigida a otra dirección de correo." });
    await db.update(users).set({ role: invite.role, isActive: true }).where(eq(users.id, ctx.user.id));
    if (invite.playerId) await db.update(playerProfiles).set({ userId: ctx.user.id, updatedAt: new Date() }).where(eq(playerProfiles.id, invite.playerId));
    await db.update(userInvites).set({ status: "accepted", acceptedByUserId: ctx.user.id, acceptedAt: new Date(), updatedAt: new Date() }).where(eq(userInvites.id, invite.id));
    return { success: true };
  }),
});
