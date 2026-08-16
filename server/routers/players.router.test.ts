import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({ requireDb: vi.fn() }));

import { requireDb } from "../db";
import { appRouter } from "../routers";

const adminContext = {
  user: { id: 1, openId: "admin-user", email: "admin@example.com", name: "Admin", loginMethod: "manus", role: "admin" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} },
  res: { clearCookie: vi.fn() },
} as unknown as TrpcContext;

describe("players router federation fields", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda y actualiza fecha de nacimiento, DNI y talla de camiseta", async () => {
    const insertedValues = vi.fn().mockResolvedValue([{ insertId: 12 }]);
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    vi.mocked(requireDb).mockResolvedValue({ insert: vi.fn().mockReturnValue({ values: insertedValues }), update: vi.fn().mockReturnValue({ set: updateSet }) } as never);
    const caller = appRouter.createCaller(adminContext);
    const dateOfBirth = new Date("1996-02-14T12:00:00Z");

    await caller.players.create({ fullName: "Ana García", dateOfBirth, dni: "12345678A", jerseySize: "L", isActiveCurrentSeason: true });
    await caller.players.update({ id: 12, fullName: "Ana García", dateOfBirth, dni: "87654321B", jerseySize: "XL", isActiveCurrentSeason: false });

    expect(insertedValues).toHaveBeenCalledWith(expect.objectContaining({ dateOfBirth, dni: "12345678A", jerseySize: "L", isActiveCurrentSeason: true }));
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ dateOfBirth, dni: "87654321B", jerseySize: "XL", isActiveCurrentSeason: false }));
    expect(updateWhere).toHaveBeenCalledTimes(1);
  });
});
