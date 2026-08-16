import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP configuration", () => {
  it("verifica la conexión con el servidor SMTP configurado", async () => {
    expect(process.env.SMTP_HOST).toBeTruthy();
    expect(process.env.SMTP_PORT).toBeTruthy();
    expect(process.env.SMTP_USER).toBeTruthy();
    expect(process.env.SMTP_PASS).toBeTruthy();
    expect(process.env.SMTP_FROM).toBeTruthy();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await expect(transporter.verify()).resolves.toBe(true);
  }, 20_000);
});
