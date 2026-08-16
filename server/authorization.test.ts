import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function playerContext(isActive = true): TrpcContext {
  return {
    user: {
      id: 91,
      openId: "player-only",
      name: "Jugador de prueba",
      email: "player@example.com",
      loginMethod: "manus",
      role: "user",
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("autorización administrativa", () => {
  it("impide que un jugador cree una ficha de otro jugador", async () => {
    const caller = appRouter.createCaller(playerContext());

    await expect(caller.players.create({ fullName: "Persona no autorizada" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("impide que un jugador cree un gasto o ingreso del equipo", async () => {
    const caller = appRouter.createCaller(playerContext());

    await expect(
      caller.finance.createTransaction({
        concept: "Gasto no autorizado",
        direction: "expense",
        amountCents: 1000,
        occurredAt: new Date(),
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("protege colas, usuarios e importaciones frente a otros jugadores", async () => {
    const caller = appRouter.createCaller(playerContext());

    await expect(caller.players.adminRoster()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.finance.paymentQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.userManagement.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.imports.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.invites.create({ email: "new.player@example.com", origin: "https://buyuyus.blancoguzman.es" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bloquea cualquier procedimiento protegido cuando la cuenta está de baja", async () => {
    const caller = appRouter.createCaller(playerContext(false));

    await expect(caller.players.roster()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
