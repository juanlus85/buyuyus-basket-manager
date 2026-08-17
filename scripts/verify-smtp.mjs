import nodemailer from "nodemailer";

const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`SMTP no configurado. Variables ausentes: ${missing.join(", ")}`);
  process.exit(1);
}

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

try {
  await transport.verify();
  console.log("SMTP verificado: conexión y autenticación correctas. No se ha enviado ningún correo.");
  await transport.close();
} catch (error) {
  console.error("SMTP no verificado:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}
