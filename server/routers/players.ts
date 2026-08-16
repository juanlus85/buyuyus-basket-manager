import { TRPCError } from "@trpc/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { playerProfiles, users } from "../../drizzle/schema";
import { requireDb } from "../db";
import { storagePut } from "../storage";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const playerInput = z.object({
  userId: z.number().int().positive().nullable().optional(),
  fullName: z.string().trim().min(2).max(160),
  shortName: z.string().trim().max(80).nullable().optional(),
  position: z.string().trim().max(80).nullable().optional(),
  jerseyNumber: z.number().int().min(0).max(99).nullable().optional(),
  dateOfBirth: z.date().nullable().optional(),
  jerseySize: z.string().trim().max(16).nullable().optional(),
  dni: z.string().trim().max(32).nullable().optional(),
  isActiveCurrentSeason: z.boolean().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  contactEmail: z.string().trim().email().max(320).nullable().optional(),
  photoKey: z.string().max(512).nullable().optional(),
  photoUrl: z.string().max(1024).nullable().optional(),
  joinedAt: z.date().nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

function nullableFields<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

export function filterCurrentSeasonPlayers<T extends { status: "active" | "inactive"; isActiveCurrentSeason: boolean }>(players: T[]) {
  return players.filter(player => player.status === "active" && player.isActiveCurrentSeason);
}

export function normalizeFederativeFields(input: { dateOfBirth?: Date | null; jerseySize?: string | null; dni?: string | null; isActiveCurrentSeason?: boolean }) {
  return { dateOfBirth: input.dateOfBirth ?? null, jerseySize: input.jerseySize ?? null, dni: input.dni ?? null, isActiveCurrentSeason: input.isActiveCurrentSeason ?? true };
}

export const playerRouter = router({
  roster: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db
      .select({
        id: playerProfiles.id,
        fullName: playerProfiles.fullName,
        shortName: playerProfiles.shortName,
        position: playerProfiles.position,
        jerseyNumber: playerProfiles.jerseyNumber,
        isActiveCurrentSeason: playerProfiles.isActiveCurrentSeason,
        photoUrl: playerProfiles.photoUrl,
        status: playerProfiles.status,
        joinedAt: playerProfiles.joinedAt,
      })
      .from(playerProfiles)
      .where(eq(playerProfiles.status, "active"))
      .orderBy(asc(playerProfiles.fullName));
    return filterCurrentSeasonPlayers(rows);
  }),

  adminRoster: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(playerProfiles).orderBy(asc(playerProfiles.status), asc(playerProfiles.fullName));
  }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, ctx.user.id)).limit(1);
    return profile ?? null;
  }),

  create: adminProcedure.input(playerInput).mutation(async ({ input }) => {
    const db = await requireDb();
    const result = await db.insert(playerProfiles).values({
      ...input,
      userId: input.userId ?? null,
      shortName: input.shortName ?? null,
      position: input.position ?? null,
      jerseyNumber: input.jerseyNumber ?? null,
      ...normalizeFederativeFields(input),
      phone: input.phone ?? null,
      contactEmail: input.contactEmail ?? null,
      photoKey: input.photoKey ?? null,
      photoUrl: input.photoUrl ?? null,
      joinedAt: input.joinedAt ?? null,
      notes: input.notes ?? null,
    });
    return { id: Number(result[0].insertId) };
  }),

  update: adminProcedure.input(playerInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...changes } = input;
    await db
      .update(playerProfiles)
      .set({ ...nullableFields(changes), updatedAt: new Date() })
      .where(eq(playerProfiles.id, id));
    return { success: true };
  }),

  archive: adminProcedure.input(z.object({ id: z.number().int().positive(), leftAt: z.date().optional() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db
      .update(playerProfiles)
      .set({ status: "inactive", isActiveCurrentSeason: false, leftAt: input.leftAt ?? new Date(), updatedAt: new Date() })
      .where(eq(playerProfiles.id, input.id));
    return { success: true };
  }),

  restore: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(playerProfiles).set({ status: "active", isActiveCurrentSeason: true, leftAt: null, updatedAt: new Date() }).where(eq(playerProfiles.id, input.id));
    return { success: true };
  }),

  uploadPhoto: adminProcedure
    .input(z.object({ id: z.number().int().positive(), filename: z.string().trim().min(1).max(255), mimeType: z.string().startsWith("image/"), base64: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const data = Buffer.from(input.base64, "base64");
      if (!data.length || data.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "La fotografía debe ocupar como máximo 5 MB." });
      }
      const filename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "jugador.jpg";
      const stored = await storagePut(`player-photos/${input.id}/${filename}`, data, input.mimeType);
      const db = await requireDb();
      await db.update(playerProfiles).set({ photoKey: stored.key, photoUrl: stored.url, updatedAt: new Date() }).where(eq(playerProfiles.id, input.id));
      return stored;
    }),

  activeSeasonList: adminProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db
      .select({ jerseyNumber: playerProfiles.jerseyNumber, fullName: playerProfiles.fullName, dni: playerProfiles.dni, dateOfBirth: playerProfiles.dateOfBirth, status: playerProfiles.status, isActiveCurrentSeason: playerProfiles.isActiveCurrentSeason })
      .from(playerProfiles)
      .where(eq(playerProfiles.status, "active"))
      .orderBy(asc(playerProfiles.jerseyNumber), asc(playerProfiles.fullName));
    return filterCurrentSeasonPlayers(rows).map(({ status, isActiveCurrentSeason, ...player }) => player);
  }),
});

export const userManagementRouter = router({
  list: adminProcedure.query(async () => {
    const db = await requireDb();
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        role: users.role,
        isActive: users.isActive,
        lastSignedIn: users.lastSignedIn,
        playerId: playerProfiles.id,
        playerName: playerProfiles.fullName,
        playerStatus: playerProfiles.status,
      })
      .from(users)
      .leftJoin(playerProfiles, eq(playerProfiles.userId, users.id))
      .orderBy(desc(users.lastSignedIn));
  }),

  setRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) })).mutation(async ({ input, ctx }) => {
    if (input.userId === ctx.user.id && input.role !== "admin") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes retirarte tu propio permiso de administrador." });
    }
    const db = await requireDb();
    await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
    return { success: true };
  }),

  updateIdentity: adminProcedure.input(z.object({ userId: z.number().int().positive(), name: z.string().trim().min(2).max(160).nullable().optional(), email: z.string().trim().email().max(320).nullable().optional() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(users).set({ name: input.name ?? null, email: input.email ?? null }).where(eq(users.id, input.userId));
    return { success: true };
  }),

  setActive: adminProcedure.input(z.object({ userId: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ input, ctx }) => {
    if (input.userId === ctx.user.id && !input.isActive) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No puedes desactivar tu propio acceso." });
    }
    const db = await requireDb();
    await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.userId));
    return { success: true };
  }),

  unlinkedPlayers: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(playerProfiles).where(sql`${playerProfiles.userId} IS NULL`).orderBy(asc(playerProfiles.fullName));
  }),

  linkPlayer: adminProcedure.input(z.object({ userId: z.number().int().positive(), playerId: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(playerProfiles).set({ userId: input.userId, updatedAt: new Date() }).where(eq(playerProfiles.id, input.playerId));
    return { success: true };
  }),
});
