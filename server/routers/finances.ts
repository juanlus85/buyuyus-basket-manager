import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { feeInstallments, feePlans, financeTemplates, playerCharges, playerPayments, playerProfiles, seasons, teamAccounts, teamFinancialCategories, teamTransactions } from "../../drizzle/schema";
import { requireDb } from "../db";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const moneyCents = z.number().int().positive().max(10_000_000);
const optionalId = z.number().int().positive().nullable().optional();
const paymentMethod = z.enum(["cash", "bank_transfer", "bizum", "paypal"]);
export const guestTrainingPreset = { name: "Invitado Entreno", direction: "income" as const, defaultConcept: "Invitado Entreno", defaultAmountCents: 300, notes: "Ingreso por invitado en entrenamiento" };

export function calculateStatement(charges: Array<{ amountCents: number; status: "open" | "cancelled" | "settled" }>, payments: Array<{ amountCents: number; status: "pending" | "confirmed" | "rejected" }>) {
  const chargedCents = charges.filter(charge => charge.status !== "cancelled").reduce((sum, charge) => sum + charge.amountCents, 0);
  const confirmedCents = payments.filter(payment => payment.status === "confirmed").reduce((sum, payment) => sum + payment.amountCents, 0);
  const pendingCents = payments.filter(payment => payment.status === "pending").reduce((sum, payment) => sum + payment.amountCents, 0);
  return { chargedCents, confirmedCents, pendingCents, balanceCents: chargedCents - confirmedCents };
}

export function calculateAccountBalance(openingBalanceCents: number, transactions: Array<{ direction: "income" | "expense"; amountCents: number }>, payments: Array<{ amountCents: number; status: "pending" | "confirmed" | "rejected" }>) {
  return openingBalanceCents + transactions.reduce((sum, row) => sum + (row.direction === "income" ? row.amountCents : -row.amountCents), 0) + payments.filter(row => row.status === "confirmed").reduce((sum, row) => sum + row.amountCents, 0);
}

export function calculateOutstandingCents(chargeAmountCents: number, confirmedPayments: Array<{ amountCents: number; status: "pending" | "confirmed" | "rejected" }>) {
  return Math.max(0, chargeAmountCents - confirmedPayments.filter(payment => payment.status === "confirmed").reduce((sum, payment) => sum + payment.amountCents, 0));
}

export function paymentComment(adminNote: string | null, playerNote: string | null) {
  return adminNote || playerNote || null;
}

export function buildDueChargeRows(input: { now: Date; players: Array<{ id: number; status: "active" | "inactive"; isActiveCurrentSeason: boolean }>; installments: Array<{ id: number; dueAt: Date; amountCents: number; plan: { seasonId: number; concept: string; createdByUserId: number | null } }>; existingKeys: Set<string> }) {
  const eligiblePlayers = input.players.filter(player => player.status === "active" && player.isActiveCurrentSeason);
  return input.installments.filter(item => item.dueAt <= input.now).flatMap(({ id, dueAt, amountCents, plan }) => eligiblePlayers.filter(player => !input.existingKeys.has(`${player.id}:${id}`)).map(player => ({ playerId: player.id, seasonId: plan.seasonId, feeInstallmentId: id, concept: `${plan.concept} · cuota programada`, amountCents, dueAt, createdByUserId: plan.createdByUserId })));
}

async function getCurrentPlayer(userId: number) {
  const db = await requireDb();
  const [player] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId)).limit(1);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "Tu usuario no tiene una ficha de jugador vinculada." });
  return { db, player };
}

async function getActiveSeasonId() {
  const db = await requireDb();
  const [season] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.isCurrent, true)).limit(1);
  return season?.id ?? null;
}

async function ensureGuestTrainingTemplate() {
  const db = await requireDb();
  const [existing] = await db.select({ id: financeTemplates.id }).from(financeTemplates).where(and(eq(financeTemplates.name, guestTrainingPreset.name), eq(financeTemplates.direction, guestTrainingPreset.direction))).limit(1);
  if (existing) return existing.id;
  const [category] = await db.select({ id: teamFinancialCategories.id }).from(teamFinancialCategories).where(and(eq(teamFinancialCategories.name, guestTrainingPreset.name), eq(teamFinancialCategories.direction, guestTrainingPreset.direction))).limit(1);
  const categoryId = category?.id ?? Number((await db.insert(teamFinancialCategories).values({ name: guestTrainingPreset.name, direction: guestTrainingPreset.direction, defaultAmountCents: guestTrainingPreset.defaultAmountCents }))[0].insertId);
  const result = await db.insert(financeTemplates).values({ ...guestTrainingPreset, categoryId });
  return Number(result[0].insertId);
}

async function materializeDueCharges() {
  const db = await requireDb();
  const now = new Date();
  const due = await db.select({ installment: feeInstallments, plan: feePlans }).from(feeInstallments).innerJoin(feePlans, eq(feeInstallments.feePlanId, feePlans.id)).where(and(eq(feePlans.isActive, true)));
  const applicable = due.filter(row => row.installment.dueAt <= now);
  if (!applicable.length) return 0;
  const players = await db.select({ id: playerProfiles.id, status: playerProfiles.status, isActiveCurrentSeason: playerProfiles.isActiveCurrentSeason }).from(playerProfiles).where(and(eq(playerProfiles.status, "active"), eq(playerProfiles.isActiveCurrentSeason, true)));
  const existing = await db.select({ playerId: playerCharges.playerId, installmentId: playerCharges.feeInstallmentId }).from(playerCharges).where(inArray(playerCharges.feeInstallmentId, applicable.map(row => row.installment.id)));
  const seen = new Set(existing.filter(row => row.installmentId !== null).map(row => `${row.playerId}:${row.installmentId}`));
  const rows = buildDueChargeRows({ now, players, installments: due.map(({ installment, plan }) => ({ id: installment.id, dueAt: installment.dueAt, amountCents: installment.amountCents, plan })), existingKeys: seen }).map(row => ({ ...row, concept: `${due.find(item => item.installment.id === row.feeInstallmentId)?.plan.concept ?? row.concept} · ${due.find(item => item.installment.id === row.feeInstallmentId)?.installment.label ?? "cuota programada"}` }));
  if (rows.length) await db.insert(playerCharges).values(rows);
  return rows.length;
}

async function settleCharge(chargeId: number) {
  const db = await requireDb();
  const [charge] = await db.select().from(playerCharges).where(eq(playerCharges.id, chargeId)).limit(1);
  if (!charge) return;
  const payments = await db.select().from(playerPayments).where(and(eq(playerPayments.chargeId, chargeId), eq(playerPayments.status, "confirmed")));
  const paid = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  if (paid >= charge.amountCents) await db.update(playerCharges).set({ status: "settled", updatedAt: new Date() }).where(eq(playerCharges.id, chargeId));
}

const installmentInput = z.object({ label: z.string().trim().min(2).max(120), amountCents: moneyCents, dueAt: z.date() });
const nextSeasonInput = z.object({ name: z.string().trim().min(4).max(80), startsAt: z.date(), endsAt: z.date(), description: z.string().trim().max(4000).nullable().optional(), feePlan: z.object({ name: z.string().trim().min(2).max(140), concept: z.string().trim().min(2).max(180), installments: z.array(installmentInput).min(1).max(24) }).nullable().optional() });

export const financeRouter = router({
  myStatement: protectedProcedure.query(async ({ ctx }) => {
    await materializeDueCharges();
    const { db, player } = await getCurrentPlayer(ctx.user.id);
    const seasonId = await getActiveSeasonId();
    const chargeFilter = seasonId ? and(eq(playerCharges.playerId, player.id), eq(playerCharges.seasonId, seasonId)) : eq(playerCharges.playerId, player.id);
    const paymentFilter = seasonId ? and(eq(playerPayments.playerId, player.id), eq(playerPayments.seasonId, seasonId)) : eq(playerPayments.playerId, player.id);
    const [charges, payments] = await Promise.all([db.select().from(playerCharges).where(chargeFilter).orderBy(desc(playerCharges.dueAt)), db.select().from(playerPayments).where(paymentFilter).orderBy(desc(playerPayments.paidAt))]);
    return { player, charges, payments, summary: calculateStatement(charges, payments) };
  }),

  submitPayment: protectedProcedure.input(z.object({ amountCents: moneyCents, paidAt: z.date(), method: paymentMethod, chargeId: optionalId, seasonId: optionalId, concept: z.string().trim().max(180).nullable().optional(), playerNote: z.string().trim().max(2000).nullable().optional(), proofKey: z.string().max(512).nullable().optional(), proofUrl: z.string().max(1024).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const { db, player } = await getCurrentPlayer(ctx.user.id);
    if (player.status !== "active") throw new TRPCError({ code: "FORBIDDEN", message: "Una ficha de baja no puede registrar nuevos pagos." });
    let chargeConcept: string | null = null;
    let chargeSeasonId: number | null = null;
    if (input.chargeId) {
      const [charge] = await db.select().from(playerCharges).where(and(eq(playerCharges.id, input.chargeId), eq(playerCharges.playerId, player.id))).limit(1);
      if (!charge || charge.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "El cargo seleccionado no está disponible." });
      chargeConcept = charge.concept;
      chargeSeasonId = charge.seasonId;
    }
    const result = await db.insert(playerPayments).values({ playerId: player.id, chargeId: input.chargeId ?? null, seasonId: input.seasonId ?? chargeSeasonId ?? await getActiveSeasonId(), amountCents: input.amountCents, paidAt: input.paidAt, method: input.method, concept: input.concept ?? chargeConcept, playerNote: input.playerNote ?? null, proofKey: input.proofKey ?? null, proofUrl: input.proofUrl ?? null, submittedByUserId: ctx.user.id });
    return { id: Number(result[0].insertId), status: "pending" as const };
  }),

  paymentQueue: adminProcedure.query(async () => {
    await materializeDueCharges();
    const db = await requireDb();
    return db.select({ payment: playerPayments, playerName: playerProfiles.fullName, playerShortName: playerProfiles.shortName, chargeConcept: playerCharges.concept }).from(playerPayments).innerJoin(playerProfiles, eq(playerPayments.playerId, playerProfiles.id)).leftJoin(playerCharges, eq(playerPayments.chargeId, playerCharges.id)).where(eq(playerPayments.status, "pending")).orderBy(asc(playerPayments.paidAt));
  }),

  reviewPayment: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["confirmed", "rejected"]), accountId: optionalId, adminNote: z.string().trim().max(2000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [payment] = await db.select().from(playerPayments).where(eq(playerPayments.id, input.id)).limit(1);
    if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "No se ha encontrado el pago." });
    if (payment.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Este pago ya ha sido revisado." });
    await db.update(playerPayments).set({ status: input.decision, accountId: input.decision === "confirmed" ? input.accountId ?? null : null, adminNote: input.adminNote ?? null, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(playerPayments.id, input.id));
    if (input.decision === "confirmed" && payment.chargeId) await settleCharge(payment.chargeId);
    return { success: true };
  }),

  recordAdminPayment: adminProcedure.input(z.object({ playerId: z.number().int().positive(), chargeId: z.number().int().positive(), accountId: z.number().int().positive(), amountCents: moneyCents, paidAt: z.date(), method: paymentMethod, adminNote: z.string().trim().max(2000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [player] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, input.playerId)).limit(1);
    if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "No se ha encontrado el jugador." });
    if (player.status !== "active" || !player.isActiveCurrentSeason) throw new TRPCError({ code: "BAD_REQUEST", message: "El jugador no está activo en la temporada actual." });
    const [charge] = await db.select().from(playerCharges).where(and(eq(playerCharges.id, input.chargeId), eq(playerCharges.playerId, input.playerId), eq(playerCharges.status, "open"))).limit(1);
    if (!charge) throw new TRPCError({ code: "BAD_REQUEST", message: "Selecciona un cargo abierto que corresponda al jugador." });
    const payments = await db.select().from(playerPayments).where(and(eq(playerPayments.chargeId, charge.id), eq(playerPayments.status, "confirmed")));
    const outstandingCents = calculateOutstandingCents(charge.amountCents, payments);
    if (!outstandingCents || input.amountCents > outstandingCents) throw new TRPCError({ code: "BAD_REQUEST", message: "El importe no puede superar la deuda pendiente de la cuota." });
    const result = await db.insert(playerPayments).values({ playerId: input.playerId, chargeId: charge.id, seasonId: charge.seasonId, accountId: input.accountId, amountCents: input.amountCents, paidAt: input.paidAt, method: input.method, concept: charge.concept, adminNote: input.adminNote ?? null, status: "confirmed", submittedByUserId: ctx.user.id, reviewedByUserId: ctx.user.id, reviewedAt: new Date() });
    await settleCharge(charge.id);
    return { id: Number(result[0].insertId), status: "confirmed" as const };
  }),

  ledger: adminProcedure.query(async () => {
    await materializeDueCharges();
    await ensureGuestTrainingTemplate();
    const db = await requireDb();
    const currentSeasonId = await getActiveSeasonId();
    const [transactions, charges, payments, categories, accounts, templates, plans, installments] = await Promise.all([
      db.select().from(teamTransactions).orderBy(desc(teamTransactions.occurredAt)),
      db.select({ charge: playerCharges, playerName: playerProfiles.fullName }).from(playerCharges).innerJoin(playerProfiles, eq(playerCharges.playerId, playerProfiles.id)).orderBy(desc(playerCharges.dueAt)),
      db.select({ payment: playerPayments, playerName: playerProfiles.fullName }).from(playerPayments).innerJoin(playerProfiles, eq(playerPayments.playerId, playerProfiles.id)).orderBy(desc(playerPayments.paidAt)),
      db.select().from(teamFinancialCategories).where(eq(teamFinancialCategories.isActive, true)).orderBy(asc(teamFinancialCategories.name)),
      db.select().from(teamAccounts).orderBy(asc(teamAccounts.name)),
      db.select().from(financeTemplates).where(eq(financeTemplates.isActive, true)).orderBy(asc(financeTemplates.name)),
      db.select().from(feePlans).orderBy(desc(feePlans.createdAt)),
      db.select().from(feeInstallments).orderBy(asc(feeInstallments.dueAt)),
    ]);
    const accountSummaries = accounts.map(account => ({ account, balanceCents: calculateAccountBalance(account.openingBalanceCents, transactions.filter(row => row.accountId === account.id), payments.filter(row => row.payment.accountId === account.id).map(row => row.payment)) }));
    const generalBalanceCents = accountSummaries.reduce((sum, row) => sum + row.balanceCents, 0) + payments.filter(row => row.payment.status === "confirmed" && row.payment.accountId === null).reduce((sum, row) => sum + row.payment.amountCents, 0) + transactions.filter(row => row.accountId === null).reduce((sum, row) => sum + (row.direction === "income" ? row.amountCents : -row.amountCents), 0);
    const currentPlans = currentSeasonId ? plans.filter(plan => plan.seasonId === currentSeasonId) : plans;
    const currentPlanIds = new Set(currentPlans.map(plan => plan.id));
    return { transactions, charges, payments, categories, accounts: accountSummaries, templates, feePlans: currentPlans, feeInstallments: installments.filter(installment => currentPlanIds.has(installment.feePlanId)), generalBalanceCents };
  }),

  accountHistory: adminProcedure.input(z.object({ accountId: z.number().int().positive().nullable().optional(), seasonId: z.number().int().positive().nullable().optional(), direction: z.enum(["all", "income", "expense"]).default("all") }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    const [transactions, confirmedPayments] = await Promise.all([
      db.select().from(teamTransactions).orderBy(desc(teamTransactions.occurredAt)),
      db.select({ payment: playerPayments, playerName: playerProfiles.fullName }).from(playerPayments).innerJoin(playerProfiles, eq(playerPayments.playerId, playerProfiles.id)).where(eq(playerPayments.status, "confirmed")).orderBy(desc(playerPayments.paidAt)),
    ]);
    const accountId = input?.accountId ?? null;
    const seasonId = input?.seasonId ?? null;
    const direction = input?.direction ?? "all";
    const entries = [
      ...transactions.map(row => ({ id: `transaction-${row.id}`, source: "movement" as const, accountId: row.accountId, seasonId: row.seasonId, direction: row.direction, amountCents: row.amountCents, concept: row.concept, occurredAt: row.occurredAt, notes: row.notes, transferKey: row.transferKey, playerName: null })),
      ...confirmedPayments.map(({ payment, playerName }) => ({ id: `payment-${payment.id}`, source: "payment" as const, accountId: payment.accountId, seasonId: payment.seasonId, direction: "income" as const, amountCents: payment.amountCents, concept: payment.concept ?? "Pago de jugador", occurredAt: payment.paidAt, notes: paymentComment(payment.adminNote, payment.playerNote), transferKey: null, playerName })),
    ].filter(entry => (accountId ? entry.accountId === accountId : true) && (seasonId ? entry.seasonId === seasonId : true) && (direction === "all" ? true : entry.direction === direction)).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    return entries;
  }),

  createTransaction: adminProcedure.input(z.object({ seasonId: optionalId, categoryId: optionalId, accountId: optionalId, templateId: optionalId, direction: z.enum(["income", "expense"]), concept: z.string().trim().min(2).max(180), amountCents: moneyCents, occurredAt: z.date(), notes: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(teamTransactions).values({ ...input, seasonId: input.seasonId ?? await getActiveSeasonId(), categoryId: input.categoryId ?? null, accountId: input.accountId ?? null, templateId: input.templateId ?? null, notes: input.notes ?? null, createdByUserId: ctx.user.id });
    return { id: Number(result[0].insertId) };
  }),

  quickTransaction: adminProcedure.input(z.object({ templateId: z.number().int().positive(), accountId: optionalId, amountCents: moneyCents.nullable().optional(), occurredAt: z.date(), notes: z.string().trim().max(4000).nullable().optional(), seasonId: optionalId })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [template] = await db.select().from(financeTemplates).where(and(eq(financeTemplates.id, input.templateId), eq(financeTemplates.isActive, true))).limit(1);
    if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "El concepto predefinido no está disponible." });
    const amountCents = input.amountCents ?? template.defaultAmountCents;
    if (!amountCents) throw new TRPCError({ code: "BAD_REQUEST", message: "Indica el importe para este concepto." });
    const result = await db.insert(teamTransactions).values({ seasonId: input.seasonId ?? await getActiveSeasonId(), categoryId: template.categoryId, accountId: input.accountId ?? template.defaultAccountId, templateId: template.id, direction: template.direction, concept: template.defaultConcept, amountCents, occurredAt: input.occurredAt, notes: input.notes ?? null, createdByUserId: ctx.user.id });
    return { id: Number(result[0].insertId) };
  }),

  transferBetweenAccounts: adminProcedure.input(z.object({ sourceAccountId: z.number().int().positive(), destinationAccountId: z.number().int().positive(), amountCents: moneyCents, occurredAt: z.date(), concept: z.string().trim().min(2).max(180).default("Transferencia entre cajas"), notes: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    if (input.sourceAccountId === input.destinationAccountId) throw new TRPCError({ code: "BAD_REQUEST", message: "Las cajas de origen y destino deben ser distintas." });
    const db = await requireDb(); const transferKey = nanoid(18);
    await db.insert(teamTransactions).values([
      { accountId: input.sourceAccountId, direction: "expense", concept: input.concept, amountCents: input.amountCents, occurredAt: input.occurredAt, notes: input.notes ?? null, transferKey, createdByUserId: ctx.user.id },
      { accountId: input.destinationAccountId, direction: "income", concept: input.concept, amountCents: input.amountCents, occurredAt: input.occurredAt, notes: input.notes ?? null, transferKey, createdByUserId: ctx.user.id },
    ]);
    return { success: true, transferKey };
  }),

  createCategory: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), direction: z.enum(["income", "expense"]), defaultAmountCents: moneyCents.nullable().optional() })).mutation(async ({ input }) => {
    const db = await requireDb(); const result = await db.insert(teamFinancialCategories).values({ ...input, defaultAmountCents: input.defaultAmountCents ?? null }); return { id: Number(result[0].insertId) };
  }),
  createAccount: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), holderName: z.string().trim().max(160).nullable().optional(), type: z.enum(["cash", "bank", "digital"]), openingBalanceCents: z.number().int().min(-10_000_000).max(10_000_000).default(0), notes: z.string().trim().max(2000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb(); const result = await db.insert(teamAccounts).values({ ...input, holderName: input.holderName ?? null, notes: input.notes ?? null, createdByUserId: ctx.user.id }); return { id: Number(result[0].insertId) };
  }),
  createTemplate: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), direction: z.enum(["income", "expense"]), categoryId: optionalId, defaultAccountId: optionalId, defaultConcept: z.string().trim().min(2).max(180), defaultAmountCents: moneyCents.nullable().optional(), notes: z.string().trim().max(2000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb(); const result = await db.insert(financeTemplates).values({ ...input, categoryId: input.categoryId ?? null, defaultAccountId: input.defaultAccountId ?? null, defaultAmountCents: input.defaultAmountCents ?? null, notes: input.notes ?? null, createdByUserId: ctx.user.id }); return { id: Number(result[0].insertId) };
  }),

  createFeePlan: adminProcedure.input(z.object({ seasonId: z.number().int().positive(), name: z.string().trim().min(2).max(140), concept: z.string().trim().min(2).max(180), notes: z.string().trim().max(2000).nullable().optional(), installments: z.array(installmentInput).min(1).max(24) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(feePlans).values({ seasonId: input.seasonId, name: input.name, concept: input.concept, notes: input.notes ?? null, createdByUserId: ctx.user.id });
    const feePlanId = Number(result[0].insertId);
    await db.insert(feeInstallments).values(input.installments.map(item => ({ ...item, feePlanId })));
    const createdCharges = await materializeDueCharges();
    return { id: feePlanId, createdCharges };
  }),
  materializeDueCharges: adminProcedure.mutation(async () => ({ created: await materializeDueCharges() })),

  seasonClosePreview: adminProcedure.query(async () => {
    const db = await requireDb();
    const currentSeasonId = await getActiveSeasonId();
    if (!currentSeasonId) throw new TRPCError({ code: "NOT_FOUND", message: "No hay una temporada activa para cerrar." });
    const [season, accounts, transactions, payments, openCharges] = await Promise.all([
      db.select().from(seasons).where(eq(seasons.id, currentSeasonId)).limit(1),
      db.select().from(teamAccounts).orderBy(asc(teamAccounts.name)),
      db.select().from(teamTransactions),
      db.select().from(playerPayments).where(eq(playerPayments.status, "confirmed")),
      db.select().from(playerCharges).where(and(eq(playerCharges.seasonId, currentSeasonId), eq(playerCharges.status, "open"))),
    ]);
    return { season: season[0] ?? null, accountBalances: accounts.map(account => ({ account, balanceCents: calculateAccountBalance(account.openingBalanceCents, transactions.filter(row => row.accountId === account.id), payments.filter(row => row.accountId === account.id)) })), openCharges: openCharges.length };
  }),

  closeSeason: adminProcedure.input(nextSeasonInput).mutation(async ({ input }) => {
    if (input.startsAt >= input.endsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "El final de la nueva temporada debe ser posterior al inicio." });
    const db = await requireDb();
    const currentSeasonId = await getActiveSeasonId();
    if (!currentSeasonId) throw new TRPCError({ code: "NOT_FOUND", message: "No hay una temporada activa para cerrar." });
    const [existing] = await db.select({ id: seasons.id }).from(seasons).where(eq(seasons.name, input.name)).limit(1);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una temporada con ese nombre." });
    await db.update(seasons).set({ isCurrent: false, updatedAt: new Date() }).where(eq(seasons.id, currentSeasonId));
    const result = await db.insert(seasons).values({ name: input.name, startsAt: input.startsAt, endsAt: input.endsAt, isCurrent: true, description: input.description ?? null });
    const seasonId = Number(result[0].insertId);
    if (input.feePlan) {
      const planResult = await db.insert(feePlans).values({ seasonId, name: input.feePlan.name, concept: input.feePlan.concept, isActive: true });
      await db.insert(feeInstallments).values(input.feePlan.installments.map(installment => ({ ...installment, feePlanId: Number(planResult[0].insertId) })));
    }
    return { seasonId };
  }),

  createCharges: adminProcedure.input(z.object({ playerIds: z.array(z.number().int().positive()).min(1), seasonId: optionalId, concept: z.string().trim().min(2).max(180), amountCents: moneyCents, dueAt: z.date().nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb(); const players = await db.select({ id: playerProfiles.id }).from(playerProfiles).where(inArray(playerProfiles.id, input.playerIds));
    if (players.length !== input.playerIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Uno o más jugadores no existen." });
    await db.insert(playerCharges).values(input.playerIds.map(playerId => ({ playerId, seasonId: input.seasonId ?? null, concept: input.concept, amountCents: input.amountCents, dueAt: input.dueAt ?? null, notes: input.notes ?? null, createdByUserId: ctx.user.id })));
    return { created: input.playerIds.length };
  }),
  cancelCharge: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await requireDb(); await db.update(playerCharges).set({ status: "cancelled", updatedAt: new Date() }).where(eq(playerCharges.id, input.id)); return { success: true }; }),
  playerBalances: adminProcedure.query(async () => {
    await materializeDueCharges(); const db = await requireDb(); const seasonId = await getActiveSeasonId(); const [players, charges, payments] = await Promise.all([db.select().from(playerProfiles).where(and(eq(playerProfiles.status, "active"), eq(playerProfiles.isActiveCurrentSeason, true))).orderBy(asc(playerProfiles.fullName)), seasonId ? db.select().from(playerCharges).where(eq(playerCharges.seasonId, seasonId)) : db.select().from(playerCharges), seasonId ? db.select().from(playerPayments).where(eq(playerPayments.seasonId, seasonId)) : db.select().from(playerPayments)]);
    return players.map(player => ({ player, summary: calculateStatement(charges.filter(charge => charge.playerId === player.id), payments.filter(payment => payment.playerId === player.id)) }));
  }),
});
