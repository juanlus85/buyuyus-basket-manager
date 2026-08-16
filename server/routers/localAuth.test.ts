import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({ requireDb: vi.fn(), getDb: vi.fn() }));
vi.mock("../mailer", () => ({ sendAccountCredentials: vi.fn() }));

import { requireDb } from "../db";
import { sendAccountCredentials } from "../mailer";
import { appRouter } from "../routers";

const adminContext = { user: { id: 1, openId: "admin", email: "admin@example.com", name: "Admin", loginMethod: "manus", role: "admin" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} }, res: { cookie: vi.fn(), clearCookie: vi.fn() } } as unknown as TrpcContext;

describe("localUsers.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda una contraseña hasheada y envía las credenciales al correo indicado", async () => {
    const insertedValues = vi.fn().mockResolvedValue([{ insertId: 8 }]);
    const db = { select: vi.fn().mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) }), insert: vi.fn().mockReturnValue({ values: insertedValues }) };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    vi.mocked(sendAccountCredentials).mockResolvedValue(undefined);

    await appRouter.createCaller(adminContext).localUsers.create({ name: "Laura Prado", email: "laura@example.com", username: "laura.prado", password: "Temporal-2026!", role: "user", playerId: null });

    const record = insertedValues.mock.calls[0]?.[0];
    expect(record.username).toBe("laura.prado");
    expect(record.passwordHash).not.toBe("Temporal-2026!");
    await expect(bcrypt.compare("Temporal-2026!", record.passwordHash)).resolves.toBe(true);
    expect(sendAccountCredentials).toHaveBeenCalledWith(expect.objectContaining({ recipient: "laura@example.com", username: "laura.prado", password: "Temporal-2026!" }));
  });
});
