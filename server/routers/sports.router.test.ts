import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({ requireDb: vi.fn() }));
import { requireDb } from "../db";
import { appRouter } from "../routers";

const admin = { user: { id: 8, openId: "sports-admin", email: "admin@example.com", name: "Admin", loginMethod: "local", role: "admin" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} }, res: { cookie: () => undefined, clearCookie: () => undefined } } as unknown as TrpcContext;
const player = { ...admin, user: { ...admin.user!, id: 14, openId: "sports-player", role: "user" as const } } as TrpcContext;

function upcomingQuery(rows: unknown[]) {
  const chain: any = { from: () => chain, leftJoin: () => chain, where: () => chain, orderBy: () => chain, limit: () => rows };
  return chain;
}

describe("sports router agenda", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve en nextSummary rival, fecha, lugar y hora de convocatoria del próximo partido", async () => {
    const event = { id: 40, type: "match", startsAt: new Date("2026-10-10T18:00:00Z"), location: "Pabellón Hytasa", callAt: new Date("2026-10-10T17:15:00Z") };
    const row = { event, match: { opponent: "CB Norte" }, competitionName: "Liga" };
    const attendance = { from: () => ({ where: async () => [] }) };
    vi.mocked(requireDb).mockResolvedValue({ select: vi.fn().mockReturnValueOnce(upcomingQuery([row])).mockReturnValueOnce(attendance) } as never);
    const result = await appRouter.createCaller(admin).sports.nextSummary();
    expect(result.nextMatch).toMatchObject({ event: { startsAt: event.startsAt, location: "Pabellón Hytasa", callAt: event.callAt }, match: { opponent: "CB Norte" } });
  });

  it("crea un entrenamiento con asistencia y lo devuelve en la consulta compartida de Calendario", async () => {
    const inserted = vi.fn().mockResolvedValue([{ insertId: 55 }]);
    const training = { event: { id: 55, type: "training", title: "Entrenamiento", startsAt: new Date("2026-10-09T20:00:00Z"), attendanceEnabled: true } };
    const attendance = { from: () => ({ where: async () => [] }) };
    vi.mocked(requireDb).mockResolvedValue({ insert: vi.fn().mockReturnValue({ values: inserted }), select: vi.fn().mockReturnValueOnce(upcomingQuery([training])).mockReturnValueOnce(attendance) } as never);
    const caller = appRouter.createCaller(admin);
    await caller.sports.createEvent({ type: "training", title: "Entrenamiento", startsAt: new Date("2026-10-09T20:00:00Z"), location: "Pista 2" });
    const calendarEvents = await caller.sports.events();
    expect(inserted).toHaveBeenCalledWith(expect.objectContaining({ type: "training", attendanceEnabled: true, location: "Pista 2" }));
    expect(calendarEvents[0]).toMatchObject({ event: { id: 55, type: "training", attendanceEnabled: true } });
  });

  it("registra la respuesta de asistencia con el usuario autenticado", async () => {
    const values = vi.fn().mockReturnValue({ onDuplicateKeyUpdate: async () => undefined });
    const inserted = vi.fn().mockReturnValue({ values });
    const eventQuery = { from: () => ({ where: () => ({ limit: async () => [{ id: 77, attendanceEnabled: true }] }) }) };
    vi.mocked(requireDb).mockResolvedValue({ select: vi.fn().mockReturnValue(eventQuery), insert: inserted } as never);
    await appRouter.createCaller(player).sports.respondAttendance({ eventId: 77, status: "going", note: "Llego puntual" });
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ eventId: 77, userId: 14, status: "going", note: "Llego puntual" }));
  });

  it("rechaza la asistencia cuando la actividad no admite confirmación", async () => {
    const eventQuery = { from: () => ({ where: () => ({ limit: async () => [{ id: 78, attendanceEnabled: false }] }) }) };
    const insert = vi.fn();
    vi.mocked(requireDb).mockResolvedValue({ select: vi.fn().mockReturnValue(eventQuery), insert } as never);
    await expect(appRouter.createCaller(player).sports.respondAttendance({ eventId: 78, status: "going" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rechaza un acta con el mismo jugador duplicado para prevenir estadísticas repetidas", async () => {
    await expect(appRouter.createCaller(admin).sports.applyMatchReport({ matchId: 12, ownScore: 63, opponentScore: 57, playerStats: [
      { playerId: 3, played: true, fouls: 2, technicalFouls: 0, unsportsmanlikeFouls: 0 },
      { playerId: 3, played: true, fouls: 1, technicalFouls: 0, unsportsmanlikeFouls: 0 },
    ] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("confirma un acta actualizando marcador y estadísticas individuales", async () => {
    const updateSet = vi.fn().mockReturnValue({ where: async () => undefined });
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const statValues = vi.fn().mockResolvedValue(undefined);
    const matchQuery = { from: () => ({ where: () => ({ limit: async () => [{ id: 22, competitionId: null }] }) }) };
    const playerQuery = { from: () => ({ where: async () => [{ id: 3 }] }) };
    vi.mocked(requireDb).mockResolvedValue({
      select: vi.fn().mockReturnValueOnce(matchQuery).mockReturnValueOnce(playerQuery),
      update: vi.fn().mockReturnValue({ set: updateSet }),
      delete: vi.fn().mockReturnValue({ where: deleteWhere }),
      insert: vi.fn().mockReturnValue({ values: statValues }),
    } as never);

    const result = await appRouter.createCaller(admin).sports.applyMatchReport({ matchId: 22, ownScore: 68, opponentScore: 55, notes: "Acta revisada", playerStats: [{ playerId: 3, played: true, fouls: 3, technicalFouls: 1, unsportsmanlikeFouls: 0 }] });
    expect(result).toEqual({ success: true, playersUpdated: 1 });
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ ownScore: 68, opponentScore: 55, status: "completed" }));
    expect(deleteWhere).toHaveBeenCalled();
    expect(statValues).toHaveBeenCalledWith([expect.objectContaining({ matchId: 22, playerId: 3, played: true, fouls: 3, technicalFouls: 1, unsportsmanlikeFouls: 0, confirmedByUserId: 8 })]);
  });
});
