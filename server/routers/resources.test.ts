import { describe, expect, it } from "vitest";
import { vi } from "vitest";
vi.mock("../db", () => ({ requireDb: vi.fn() }));
import { requireDb } from "../db";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

const playerContext = { user: { id: 4, openId: "resource-player", email: "player@example.com", name: "Jugador", loginMethod: "local", role: "user" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} }, res: { cookie: () => undefined, clearCookie: () => undefined } } as unknown as TrpcContext;

describe("recursos compartidos", () => {
  it("impide a un jugador publicar enlaces o archivar recursos", async () => {
    const caller = appRouter.createCaller(playerContext);
    await expect(caller.resources.createLink({ title: "Normas", description: null, category: "rules", externalUrl: "https://example.com/normas", isPinned: false, sortOrder: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.resources.setArchived({ id: 1, isArchived: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("oculta archivados a jugadores y permite a administración consultar el histórico", async () => {
    const active = [{ resource: { id: 1, isArchived: false }, authorName: "Admin" }];
    const all = [...active, { resource: { id: 2, isArchived: true }, authorName: "Admin" }];
    const query: any = { from: () => query, leftJoin: () => query, orderBy: () => query, where: async () => active, then: (resolve: (rows: typeof all) => unknown) => Promise.resolve(all).then(resolve) };
    vi.mocked(requireDb).mockResolvedValue({ select: vi.fn().mockReturnValue(query) } as never);
    await expect(appRouter.createCaller(playerContext).resources.list()).resolves.toEqual(active);
    const adminContext = { ...playerContext, user: { ...playerContext.user!, id: 1, role: "admin" as const } } as TrpcContext;
    await expect(appRouter.createCaller(adminContext).resources.list({ includeArchived: true })).resolves.toEqual(all);
  });
});
