import nodemailer from "nodemailer";

export type SmtpDeliveryResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
};

const ACCESS_URL = process.env.APP_PUBLIC_URL ?? "https://buyuyus.blancoguzman.es";

function smtpTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendAccountCredentials(input: { recipient: string; name: string; username: string; password: string; mustChangePassword?: boolean }): Promise<SmtpDeliveryResult> {
  const delivery = await smtpTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: input.recipient,
    subject: "Acceso a Buyuyus Basket Manager",
    text: `Hola ${input.name},\n\nTu cuenta de Buyuyus Basket Manager está lista.\n\nAccede a la aplicación: ${ACCESS_URL}\n\nUsuario: ${input.username}\nContraseña temporal: ${input.password}\n\nPor seguridad, cambia la contraseña después de tu primer acceso.\n\nEquipo Buyuyus Basket`,
  });

  return {
    messageId: delivery.messageId,
    accepted: delivery.accepted.map(String),
    rejected: delivery.rejected.map(String),
    response: delivery.response,
  };
}
