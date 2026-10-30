import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { importJobs, playerPayments, playerProfiles, sharedResources } from "../../drizzle/schema";
import { requireDb } from "../db";
import { canReadLocalAsset, type LocalAssetReference } from "../localStorageAccess";
import { localStorageRoot, resolveLocalStoragePath } from "../localStorage";
import { ENV } from "./env";
import { sdk } from "./sdk";

const SAFE_INLINE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"]);

function safeHeaderFilename(value: string) {
  return value.replace(/[\\"\r\n]/g, "_").slice(0, 180) || "archivo";
}

function allowedContentType(value: string | null | undefined, filename: string) {
  if (value && SAFE_INLINE_TYPES.has(value.toLowerCase())) return value.toLowerCase();
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

async function resolveLocalAsset(db: Awaited<ReturnType<typeof requireDb>>, key: string) {
  const [resource] = await db.select().from(sharedResources).where(eq(sharedResources.fileKey, key)).limit(1);
  if (resource) {
    return { reference: { kind: "shared_document", isArchived: resource.isArchived } as const, filename: resource.fileName ?? path.basename(key), contentType: allowedContentType(resource.mimeType, resource.fileName ?? key) };
  }

  const [importJob] = await db.select().from(importJobs).where(eq(importJobs.fileKey, key)).limit(1);
  if (importJob) {
    const filename = importJob.originalFilename;
    const contentType = importJob.sourceKind === "pdf" ? "application/pdf" : allowedContentType(null, filename);
    return { reference: { kind: "import_document" } as const, filename, contentType };
  }

  const [player] = await db.select().from(playerProfiles).where(eq(playerProfiles.photoKey, key)).limit(1);
  if (player) {
    return { reference: { kind: "player_photo", playerIsCurrent: player.status === "active" && player.isActiveCurrentSeason } as const, filename: path.basename(key), contentType: allowedContentType(null, key) };
  }

  const [payment] = await db.select({ payment: playerPayments, player: playerProfiles }).from(playerPayments).innerJoin(playerProfiles, eq(playerPayments.playerId, playerProfiles.id)).where(eq(playerPayments.proofKey, key)).limit(1);
  if (payment) {
    return { reference: { kind: "payment_proof", ownerUserId: payment.player.userId } as const, filename: path.basename(key), contentType: allowedContentType(null, key) };
  }

  return null;
}

async function serveLocalFile(req: Request, res: Response, key: string) {
  let actor;
  try {
    actor = await sdk.authenticateRequest(req);
  } catch {
    res.status(401).send("Autenticación requerida");
    return;
  }
  if (!actor.isActive || actor.isCron) {
    res.status(403).send("Acceso denegado");
    return;
  }

  let db;
  try {
    db = await requireDb();
  } catch {
    res.status(503).send("Base de datos no disponible");
    return;
  }
  const asset = await resolveLocalAsset(db, key);
  if (!asset || !canReadLocalAsset({ id: actor.id, role: actor.role, isActive: actor.isActive }, asset.reference)) {
    res.status(404).send("Archivo no encontrado");
    return;
  }

  let filePath: string;
  try {
    filePath = resolveLocalStoragePath(localStorageRoot(), key);
  } catch {
    res.status(400).send("Ruta de archivo no válida");
    return;
  }

  try {
    const fileInfo = await fs.stat(filePath);
    if (!fileInfo.isFile()) {
      res.status(404).send("Archivo no encontrado");
      return;
    }
    const contentType = allowedContentType(asset.contentType, asset.filename);
    const disposition = SAFE_INLINE_TYPES.has(contentType) ? "inline" : "attachment";
    res.set({
      "Cache-Control": "private, no-store",
      "Content-Length": String(fileInfo.size),
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${safeHeaderFilename(asset.filename)}"`,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    const stream = createReadStream(filePath);
    stream.on("error", error => {
      console.error("[StorageProxy] local file read failed", error);
      if (!res.headersSent) res.status(404).end("Archivo no encontrado");
      else res.destroy();
    });
    stream.pipe(res);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") res.status(404).send("Archivo no encontrado");
    else {
      console.error("[StorageProxy] local file stat failed", error);
      res.status(500).send("No se pudo leer el archivo");
    }
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Falta la referencia del archivo");
      return;
    }

    // VPS/Plesk deployment: serve only DB-referenced local files to authorized users.
    if (!ENV.forgeApiUrl && !ENV.forgeApiKey) {
      await serveLocalFile(req, res, key);
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("El almacenamiento requiere configurar ambas credenciales Forge.");
      return;
    }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Error del servicio de almacenamiento");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("El servicio no devolvió una URL válida");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (error) {
      console.error("[StorageProxy] failed:", error);
      res.status(502).send("No se pudo conectar con el servicio de almacenamiento");
    }
  });
}
