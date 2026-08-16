import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  playerCharges,
  playerPayments,
  playerProfiles,
  teamFinancialCategories,
  teamTransactions,
} from "../../drizzle/schema";
import { requireDb } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const moneyCents = z.number().int().positive().max(10_000_000);

async function getCurrentPlayer(userId: number) {
  const db = await requireDb();
  const [player] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Tu usuario no tiene una ficha de jugador vinculada." });
  }
  return { db, player };
}

export function calculateStatement(charges: Array<{ amountCents: number; status: "open" | "cancelled" | "settled" }>, payments: Array<{ amountCents: number; status: "pending" | "confirmed" | "rejected" }>) {
  const chargedCents = charges.filter(charge => charge.status !== "cancelled").reduce((sum, charge) => sum + charge.amountCents, 0);
  const confirmedCents = payments.filter(payment => payment.status === "confirmed").reduce((sum, payment) => sum + payment.amountCents, 0);
  const pendingCents = payments.filter(payment => payment.status === "pending").reduce((sum, payment) => sum + payment.amountCents, 0);
  return { chargedCents, confirmedCents, pendingCents, balanceCents: chargedCents - confirmedCents };
}

export const financeRouter = router({
  myStatement: protectedProcedure.query(async ({ ctx }) => {
    const { db, player } = await getCurrentPlayer(ctx.user.id);
    const [charges, payments] = await Promise.all([
      db.select().from(playerCharges).where(eq(playerCharges.playerId, player.id)).orderBy(desc(playerCharges.createdAt)),
      db.select().from(playerPayments).where(eq(playerPayments.playerId, player.id)).orderBy(desc(playerPayments.paidAt)),
    ]);
    return { player, charges, payments, summary: calculateStatement(charges, payments) };
  }),

  submitPayment: protectedProcedure
    .input(z.object({ amountCents: moneyCents, paidAt: z.date(), method: z.enum(["cash", "bank_transfer", "bizum", "paypal"]), chargeId: z.number().int().positive().nullable().optional(), seasonId: z.number().int().positive().nullable().optional(), playerNote: z.string().trim().max(2000).nullable().optional(), proofKey: z.string().max(512).nullable().optional(), proofUrl: z.string().max(1024).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { db, player } = await getCurrentPlayer(ctx.user.id);
      if (player.status !== "active") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Una ficha de baja no puede registrar nuevos pagos." });
      }
      if (input.chargeId) {
        const [charge] = await db.select().from(playerCharges).where(and(eq(playerCharges.id, input.chargeId), eq(playerCharges.playerId, player.id))).limit(1);
        if (!charge || charge.status === "cancelled") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El cargo seleccionado no está disponible." });
        }
      }
      const result = await db.insert(playerPayments).values({
        playerId: player.id,
        chargeId: input.chargeId ?? null,
        seasonId: input.seasonId ?? null,
        amountCents: input.amountCents,
        paidAt: input.paidAt,
        method: input.method,
        playerNote: input.playerNote ?? null,
        proofKey: input.proofKey ?? null,
        proofUrl: input.proofUrl ?? null,
        submittedByUserId: ctx.user.id,
      });
      return { id: Number(result[0].insertId), status: "pending" as const };
    }),

  paymentQueue: adminProcedure.query(async () => {
    const db = await requireDb();
    return db
      .select({ payment: playerPayments, playerName: playerProfiles.fullName, playerShortName: playerProfiles.shortName })
      .from(playerPayments)
      .innerJoin(playerProfiles, eq(playerPayments.playerId, playerProfiles.id))
      .where(eq(playerPayments.status, "pending"))
      .orderBy(asc(playerPayments.paidAt));
  }),

  reviewPayment: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["confirmed", "rejected"]), adminNote: z.string().trim().max(2000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [payment] = await db.select().from(playerPayments).where(eq(playerPayments.id, input.id)).limit(1);
    if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "No se ha encontrado el pago." });
    if (payment.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Este pago ya ha sido revisado." });

    await db.update(playerPayments).set({ status: input.decision, adminNote: input.adminNote ?? null, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(playerPayments.id, input.id));

    if (input.decision === "confirmed" && payment.chargeId) {
      const [charge] = await db.select().from(playerCharges).where(eq(playerCharges.id, payment.chargeId)).limit(1);
      const confirmed = await db.select().from(playerPayments).where(and(eq(playerPayments.chargeId, payment.chargeId), eq(playerPayments.status, "confirmed")));
      const paidCents = confirmed.reduce((sum, row) => sum + row.amountCents, 0);
      if (charge && paidCents >= charge.amountCents) {
        await db.update(playerCharges).set({ status: "settled", updatedAt: new Date() }).where(eq(playerCharges.id, charge.id));
      }
    }
    return { success: true };
  }),

  ledger: adminProcedure.query(async () => {
    const db = await requireDb();
    const [transactions, charges, payments, categories] = await Promise.all([
      db.select().from(teamTransactions).orderBy(desc(teamTransactions.occurredAt)),
      db.select({ charge: playerCharges, playerName: playerProfiles.fullName }).from(playerCharges).innerJoin(playerProfiles, eq(playerCharges.playerId, playerProfiles.id)).orderBy(desc(playerCharges.createdAt)),
      db.select({ payment: playerPayments, playerName: playerProfiles.fullName }).from(playerPayments).innerJoin(playerProfiles, eq(playerPayments.playerId, playerProfiles.id)).orderBy(desc(playerPayments.paidAt)),
      db.select().from(teamFinancialCategories).where(eq(teamFinancialCategories.isActive, true)).orderBy(asc(teamFinancialCategories.name)),
    ]);
    const generalBalanceCents = transactions.reduce((sum, transaction) => sum + (transaction.direction === "income" ? transaction.amountCents : -transaction.amountCents), 0) + payments.filter(row => row.payment.status === "confirmed").reduce((sum, row) => sum + row.payment.amountCents, 0);
    return { transactions, charges, payments, categories, generalBalanceCents };
  }),

  createTransaction: adminProcedure
    .input(z.object({ seasonId: z.number().int().positive().nullable().optional(), categoryId: z.number().int().positive().nullable().optional(), direction: z.enum(["income", "expense"]), concept: z.string().trim().min(2).max(180), amountCents: moneyCents, occurredAt: z.date(), notes: z.string().trim().max(4000).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const result = await db.insert(teamTransactions).values({ ...input, seasonId: input.seasonId ?? null, categoryId: input.categoryId ?? null, notes: input.notes ?? null, createdByUserId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  createCategory: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), direction: z.enum(["income", "expense"]), defaultAmountCents: z.number().int().positive().nullable().optional() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const result = await db.insert(teamFinancialCategories).values({ ...input, defaultAmountCents: input.defaultAmountCents ?? null });
    return { id: Number(result[0].insertId) };
  }),

  createCharges: adminProcedure
    .input(z.object({ playerIds: z.array(z.number().int().positive()).min(1), seasonId: z.number().int().positive().nullable().optional(), concept: z.string().trim().min(2).max(180), amountCents: moneyCents, dueAt: z.date().nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const players = await db.select({ id: playerProfiles.id }).from(playerProfiles).where(inArray(playerProfiles.id, input.playerIds));
      if (players.length !== input.playerIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Uno o más jugadores no existen." });
      await db.insert(playerCharges).values(input.playerIds.map(playerId => ({ playerId, seasonId: input.seasonId ?? null, concept: input.concept, amountCents: input.amountCents, dueAt: input.dueAt ?? null, notes: input.notes ?? null, createdByUserId: ctx.user.id })));
      return { created: input.playerIds.length };
    }),

  cancelCharge: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(playerCharges).set({ status: "cancelled", updatedAt: new Date() }).where(eq(playerCharges.id, input.id));
    return { success: true };
  }),

  playerBalances: adminProcedure.query(async () => {
    const db = await requireDb();
    const [players, charges, payments] = await Promise.all([
      db.select().from(playerProfiles).orderBy(asc(playerProfiles.status), asc(playerProfiles.fullName)),
      db.select().from(playerCharges),
      db.select().from(playerPayments),
    ]);
    return players.map(player => ({
      player,
      summary: calculateStatement(charges.filter(charge => charge.playerId === player.id), payments.filter(payment => payment.playerId === player.id)),
    }));
  }),
});
