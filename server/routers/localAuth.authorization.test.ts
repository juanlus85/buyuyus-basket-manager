import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

const playerContext = { user: { id: 2, openId: "player", email: "player@example.com", name: "Jugador", loginMethod: "local", role: "user" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} }, res: { cookie: () => undefined, clearCookie: () => undefined } } as unknown as TrpcContext;

describe("permisos de altas y agenda", () => {
  it("impide a un jugador crear usuarios locales o programar entrenamientos", async () => {
    const caller = appRouter.createCaller(playerContext);
    await expect(caller.localUsers.create({ name: "Otro usuario", email: "otro@example.com", username: "otro.usuario", password: "Temporal-2026!", role: "user", playerId: null })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.sports.createEvent({ type: "training", title: "Entrenamiento", startsAt: new Date("2026-10-09T20:00:00") })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
