import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
const username = (process.env.LOCAL_ADMIN_USERNAME ?? "juanlu").trim().toLowerCase();
const password = process.env.LOCAL_ADMIN_PASSWORD;
const name = (process.env.LOCAL_ADMIN_NAME ?? "Juanlu").trim();
const email = (process.env.LOCAL_ADMIN_EMAIL ?? "").trim();

if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria.");
if (!/^[a-z0-9._-]{3,80}$/.test(username)) throw new Error("LOCAL_ADMIN_USERNAME no tiene un formato válido.");
if (!password || password.length < 10) throw new Error("LOCAL_ADMIN_PASSWORD debe tener al menos 10 caracteres.");

const connection = await mysql.createConnection(databaseUrl);
try {
  const [matches] = await connection.execute("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
  const passwordHash = await bcrypt.hash(password, 12);
  if (matches.length) {
    await connection.execute(
      "UPDATE users SET name = ?, email = ?, passwordHash = ?, role = 'admin', isActive = 1, mustChangePassword = 1, loginMethod = 'local', updatedAt = NOW() WHERE id = ?",
      [name, email || null, passwordHash, matches[0].id],
    );
    console.log(`Administrador local '${username}' actualizado.`);
  } else {
    await connection.execute(
      "INSERT INTO users (openId, name, email, username, passwordHash, mustChangePassword, loginMethod, role, isActive, createdAt, updatedAt, lastSignedIn) VALUES (?, ?, ?, ?, ?, 1, 'local', 'admin', 1, NOW(), NOW(), NOW())",
      [`local_bootstrap_${randomUUID().replaceAll("-", "")}`.slice(0, 64), name, email || null, username, passwordHash],
    );
    console.log(`Administrador local '${username}' creado.`);
  }
} finally {
  await connection.end();
}
