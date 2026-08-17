import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { users } from "../../drizzle/schema";
import { COOKIE_NAME } from "../../shared/const";
import { getDb, requireDb } from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { sendAccountCredentials } from "../mailer";

const username = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,80}$/, "Usa entre 3 y 80 caracteres: letras, números, punto, guion o guion bajo.");
const password = z.string().min(10, "La contraseña debe tener al menos 10 caracteres.").max(128);

export const localAuthRouter = router({
  login: publicProcedure.input(z.object({ username, password })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [user] = await db.select().from(users).where(eq(users.username, input.username)).limit(1);
    if (!user || !user.isActive || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuario o contraseña incorrectos." });
    }
    const token = await sdk.createSessionToken(user.openId, { name: user.name ?? input.username });
    ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
    return { success: true, mustChangePassword: user.mustChangePassword };
  }),
  changePassword: protectedProcedure.input(z.object({ currentPassword: password, newPassword: password })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user?.passwordHash || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "La contraseña actual no es correcta." });
    await db.update(users).set({ passwordHash: await bcrypt.hash(input.newPassword, 12), mustChangePassword: false, updatedAt: new Date() }).where(eq(users.id, user.id));
    return { success: true };
  }),
});

export const localUserRouter = router({
  create: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email().max(320), username, password, role: z.enum(["user", "admin"]).default("user"), playerId: z.number().int().positive().nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, input.username)).limit(1);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Ese usuario ya existe." });
    const openId = `local_${nanoid(24)}`;
    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = await db.insert(users).values({ openId, name: input.name, email: input.email, username: input.username, passwordHash, mustChangePassword: true, role: input.role, loginMethod: "local", isActive: true });
    const id = Number(result[0].insertId);
    if (input.playerId) {
      const { playerProfiles } = await import("../../drizzle/schema");
      await db.update(playerProfiles).set({ userId: id, updatedAt: new Date() }).where(eq(playerProfiles.id, input.playerId));
    }
    try {
      const delivery = await sendAccountCredentials({ recipient: input.email, name: input.name, username: input.username, password: input.password, mustChangePassword: true });
      const emailSent = delivery.accepted.some(recipient => recipient.toLowerCase() === input.email.toLowerCase()) && delivery.rejected.length === 0;
      return { id, emailSent, delivery };
    } catch (error) {
      console.error("[localUsers.create] SMTP delivery failed", error);
      return { id, emailSent: false, delivery: null };
    }
  }),
  resetCredentials: adminProcedure.input(z.object({ id: z.number().int().positive(), password })).mutation(async ({ input }) => {
    const db = await requireDb();
    const [user] = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
    if (!user?.email || !user.username) throw new TRPCError({ code: "BAD_REQUEST", message: "El usuario debe tener correo y nombre de usuario local." });
    await db.update(users).set({ passwordHash: await bcrypt.hash(input.password, 12), mustChangePassword: true, updatedAt: new Date() }).where(eq(users.id, input.id));
    try {
      const delivery = await sendAccountCredentials({ recipient: user.email, name: user.name ?? user.username, username: user.username, password: input.password, mustChangePassword: true });
      const emailSent = delivery.accepted.some(recipient => recipient.toLowerCase() === user.email!.toLowerCase()) && delivery.rejected.length === 0;
      return { success: true, emailSent, delivery };
    } catch (error) {
      console.error("[localUsers.resetCredentials] SMTP delivery failed", error);
      return { success: true, emailSent: false, delivery: null };
    }
  }),
});
