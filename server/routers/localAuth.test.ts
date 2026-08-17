import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({ requireDb: vi.fn(), getDb: vi.fn() }));
vi.mock("../mailer", () => ({ sendAccountCredentials: vi.fn(), verifySmtpConfiguration: vi.fn() }));

import { requireDb } from "../db";
import { sendAccountCredentials, verifySmtpConfiguration } from "../mailer";
import { appRouter } from "../routers";

const adminContext = { user: { id: 1, openId: "admin", email: "admin@example.com", name: "Admin", loginMethod: "manus", role: "admin" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} }, res: { cookie: vi.fn(), clearCookie: vi.fn() } } as unknown as TrpcContext;

describe("localUsers.create", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda una contraseña hasheada y envía las credenciales al correo indicado", async () => {
    const insertedValues = vi.fn().mockResolvedValue([{ insertId: 8 }]);
    const db = { select: vi.fn().mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) }), insert: vi.fn().mockReturnValue({ values: insertedValues }) };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    vi.mocked(sendAccountCredentials).mockResolvedValue({ messageId: "message-123", accepted: ["laura@example.com"], rejected: [], response: "250 Accepted" });

    const result = await appRouter.createCaller(adminContext).localUsers.create({ name: "Laura Prado", email: "laura@example.com", username: "laura.prado", password: "Temporal-2026!", role: "user", playerId: null });

    const record = insertedValues.mock.calls[0]?.[0];
    expect(record.username).toBe("laura.prado");
    expect(record.passwordHash).not.toBe("Temporal-2026!");
    await expect(bcrypt.compare("Temporal-2026!", record.passwordHash)).resolves.toBe(true);
    expect(sendAccountCredentials).toHaveBeenCalledWith(expect.objectContaining({ recipient: "laura@example.com", username: "laura.prado", password: "Temporal-2026!" }));
    expect(result).toMatchObject({ id: 8, emailSent: true, delivery: { messageId: "message-123", accepted: ["laura@example.com"] } });
  });

  it("conserva el usuario y comunica que no hubo confirmación cuando SMTP falla", async () => {
    const insertedValues = vi.fn().mockResolvedValue([{ insertId: 9 }]);
    const db = { select: vi.fn().mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) }), insert: vi.fn().mockReturnValue({ values: insertedValues }) };
    vi.mocked(requireDb).mockResolvedValue(db as never);
    vi.mocked(sendAccountCredentials).mockRejectedValue(new Error("SMTP rejected recipient"));

    const result = await appRouter.createCaller(adminContext).localUsers.create({ name: "Mario Rey", email: "mario@example.com", username: "mario.rey", password: "Temporal-2026!", role: "user", playerId: null });

    expect(result).toEqual({ id: 9, emailSent: false, delivery: null });
    expect(insertedValues).toHaveBeenCalledTimes(1);
  });
});

describe("localUsers.verifySmtp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve únicamente el estado seguro de SMTP sin exponer valores", async () => {
    vi.mocked(verifySmtpConfiguration).mockResolvedValue({ configured: false, verified: false, missing: ["SMTP_PASS"] });

    await expect(appRouter.createCaller(adminContext).localUsers.verifySmtp()).resolves.toEqual({ configured: false, verified: false, missing: ["SMTP_PASS"] });
  });
});
