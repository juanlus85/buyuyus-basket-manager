import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({ requireDb: vi.fn() }));
import { requireDb } from "../db";
import { appRouter } from "../routers";

const adminContext = { user: { id: 1, openId: "admin", email: "admin@example.com", name: "Admin", loginMethod: "local", role: "admin" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} }, res: { cookie: () => undefined, clearCookie: () => undefined } } as unknown as TrpcContext;
const limited = (rows: unknown[]) => { const chain: any = { from: () => chain, where: () => chain, limit: async () => rows }; return chain; };
const listed = (rows: unknown[]) => { const chain: any = { from: () => chain, where: async () => rows }; return chain; };
const ordered = (rows: unknown[]) => { const chain: any = { from: () => chain, innerJoin: () => chain, where: () => chain, orderBy: async () => rows }; return chain; };

describe("finance.recordAdminPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registra el cobro contra la cuota del jugador, en la caja indicada y conserva el comentario", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 90 }]);
    const charge = { id: 15, playerId: 8, seasonId: 4, concept: "Liga · Primer pago", amountCents: 6000, status: "open" };
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(limited([{ id: 8, status: "active", isActiveCurrentSeason: true }]))
        .mockReturnValueOnce(limited([charge]))
        .mockReturnValueOnce(listed([]))
        .mockReturnValueOnce(limited([charge]))
        .mockReturnValueOnce(listed([])),
      insert: vi.fn().mockReturnValue({ values }),
    };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    const result = await appRouter.createCaller(adminContext).finance.recordAdminPayment({ playerId: 8, chargeId: 15, accountId: 3, amountCents: 3000, paidAt: new Date("2026-09-01T12:00:00"), method: "bizum", adminNote: "Primer pago en mano" });
    expect(result).toEqual({ id: 90, status: "confirmed" });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ playerId: 8, chargeId: 15, accountId: 3, seasonId: 4, concept: "Liga · Primer pago", amountCents: 3000, adminNote: "Primer pago en mano", status: "confirmed" }));
  });

  it("rechaza el cobro si falta jugador, cuota o caja", async () => {
    await expect(appRouter.createCaller(adminContext).finance.recordAdminPayment({ chargeId: 15, accountId: 3, amountCents: 3000, paidAt: new Date(), method: "bizum" } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(adminContext).finance.recordAdminPayment({ playerId: 8, accountId: 3, amountCents: 3000, paidAt: new Date(), method: "bizum" } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(adminContext).finance.recordAdminPayment({ playerId: 8, chargeId: 15, amountCents: 3000, paidAt: new Date(), method: "bizum" } as any)).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("crea una cuota individual para el jugador antes de registrar su cobro", async () => {
    const values = vi.fn().mockResolvedValueOnce([{ insertId: 15 }]).mockResolvedValueOnce([{ insertId: 90 }]);
    const charge = { id: 15, playerId: 8, seasonId: 4, concept: "Cuota de liga", amountCents: 6000, status: "open" };
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(limited([{ id: 8, status: "active", isActiveCurrentSeason: true }]))
        .mockReturnValueOnce(limited([{ id: 4 }]))
        .mockReturnValueOnce(limited([charge]))
        .mockReturnValueOnce(listed([]))
        .mockReturnValueOnce(limited([charge]))
        .mockReturnValueOnce(listed([])),
      insert: vi.fn().mockReturnValue({ values }),
    };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    const result = await appRouter.createCaller(adminContext).finance.recordAdminPayment({ playerId: 8, accountId: 3, amountCents: 6000, paidAt: new Date("2026-09-01T12:00:00"), method: "bizum", concept: "Cuota de liga" });
    expect(result).toEqual({ id: 90, status: "confirmed" });
    expect(values).toHaveBeenNthCalledWith(1, expect.objectContaining({ playerId: 8, seasonId: 4, concept: "Cuota de liga", amountCents: 6000 }));
    expect(values).toHaveBeenNthCalledWith(2, expect.objectContaining({ playerId: 8, chargeId: 15, accountId: 3, concept: "Cuota de liga", status: "confirmed" }));
  });
});

describe("finance.quickTransaction", () => {
  it("conserva el comentario contextual de un movimiento habitual", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 91 }]);
    const db = {
      select: vi.fn().mockReturnValue(limited([{ id: 14, categoryId: 2, defaultAccountId: null, direction: "expense", defaultConcept: "Arbitraje", defaultAmountCents: 1600, isActive: true }])),
      insert: vi.fn().mockReturnValue({ values }),
    };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    const result = await appRouter.createCaller(adminContext).finance.quickTransaction({ templateId: 14, accountId: 3, amountCents: null, seasonId: 4, occurredAt: new Date("2026-10-10T12:00:00"), notes: "Rival: CB Norte" });
    expect(result).toEqual({ id: 91 });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ accountId: 3, seasonId: 4, concept: "Arbitraje", amountCents: 1600, notes: "Rival: CB Norte" }));
  });

  it("exige el nombre del invitado y lo conserva en el ingreso Invitado Entreno", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 92 }]);
    const template = { id: 19, name: "Invitado Entreno", categoryId: 2, defaultAccountId: 3, direction: "income", defaultConcept: "Invitado Entreno", defaultAmountCents: 300, isActive: true };
    const db = { select: vi.fn().mockReturnValue(limited([template])), insert: vi.fn().mockReturnValue({ values }) };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    await expect(appRouter.createCaller(adminContext).finance.quickTransaction({ templateId: 19, accountId: 3, amountCents: null, seasonId: 4, occurredAt: new Date(), notes: null })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const result = await appRouter.createCaller(adminContext).finance.quickTransaction({ templateId: 19, accountId: 3, amountCents: null, seasonId: 4, occurredAt: new Date(), notes: "Invitado: Marta López" });
    expect(result).toEqual({ id: 92 });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ concept: "Invitado Entreno", amountCents: 300, notes: "Invitado: Marta López" }));
  });
});

describe("finance.accountHistory", () => {
  it("muestra el nombre del invitado guardado en el historial de Cuentas", async () => {
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(ordered([{ id: 31, accountId: 3, seasonId: 4, direction: "income", amountCents: 300, concept: "Invitado Entreno", occurredAt: new Date("2026-09-10T12:00:00"), notes: "Invitado: Marta López", transferKey: null }]))
        .mockReturnValueOnce(ordered([])),
    };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    const entries = await appRouter.createCaller(adminContext).finance.accountHistory({ accountId: 3, seasonId: 4, direction: "all" });
    expect(entries).toEqual([expect.objectContaining({ source: "movement", concept: "Invitado Entreno", notes: "Invitado: Marta López" })]);
  });
});

describe("finance.adminPlayerStatement", () => {
  it("devuelve cuotas, pagos y saldo para la ficha administrativa del jugador", async () => {
    const dueEmpty: any = { from: () => dueEmpty, innerJoin: () => dueEmpty, where: async () => [] };
    const player = { id: 8, fullName: "Jugador Uno", status: "active", isActiveCurrentSeason: true };
    const charge = { id: 15, playerId: 8, seasonId: 4, concept: "Cuota de liga", amountCents: 6000, status: "open", dueAt: new Date("2026-09-01") };
    const payment = { id: 90, playerId: 8, seasonId: 4, amountCents: 2000, status: "confirmed", paidAt: new Date("2026-09-02"), concept: "Cuota de liga" };
    const db = { select: vi.fn().mockReturnValueOnce(dueEmpty).mockReturnValueOnce(limited([player])).mockReturnValueOnce(ordered([charge])).mockReturnValueOnce(ordered([payment])) };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    const result = await appRouter.createCaller(adminContext).finance.adminPlayerStatement({ playerId: 8, seasonId: 4 });
    expect(result).toMatchObject({ player: { id: 8 }, charges: [expect.objectContaining({ id: 15 })], payments: [expect.objectContaining({ id: 90 })], summary: { chargedCents: 6000, confirmedCents: 2000, balanceCents: 4000 } });
  });
});
