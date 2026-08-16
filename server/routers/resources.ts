import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { sharedResources, users } from "../../drizzle/schema";
import { requireDb } from "../db";
import { storagePut } from "../storage";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const category = z.enum(["calendar", "rules", "document", "link", "other"]);
const base = z.object({ title: z.string().trim().min(2).max(180), description: z.string().trim().max(4000).nullable().optional(), category, isPinned: z.boolean().default(false), sortOrder: z.number().int().min(-9999).max(9999).default(0) });

export const resourceRouter = router({
  list: protectedProcedure.input(z.object({ includeArchived: z.boolean().default(false) }).optional()).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const includeArchived = ctx.user.role === "admin" && Boolean(input?.includeArchived);
    const query = db.select({ resource: sharedResources, authorName: users.name }).from(sharedResources).leftJoin(users, eq(sharedResources.createdByUserId, users.id)).orderBy(desc(sharedResources.isPinned), asc(sharedResources.sortOrder), desc(sharedResources.createdAt));
    return includeArchived ? query : query.where(eq(sharedResources.isArchived, false));
  }),
  createLink: adminProcedure.input(base.extend({ externalUrl: z.string().trim().url().max(2048) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const result = await db.insert(sharedResources).values({ ...input, description: input.description ?? null, kind: "link", externalUrl: input.externalUrl, createdByUserId: ctx.user.id });
    return { id: Number(result[0].insertId) };
  }),
  uploadDocument: adminProcedure.input(base.extend({ fileName: z.string().trim().min(1).max(255), contentType: z.string().trim().min(1).max(160), base64: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const allowed = new Set(["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
    if (!allowed.has(input.contentType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Formato no permitido. Usa PDF, PNG, JPG o DOCX." });
    const content = Buffer.from(input.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
    if (!content.length || content.length > 10 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "El archivo debe tener un máximo de 10 MB." });
    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const stored = await storagePut(`team-resources/${ctx.user.id}/${safeName}`, content, input.contentType);
    const db = await requireDb();
    const result = await db.insert(sharedResources).values({ title: input.title, description: input.description ?? null, category: input.category, kind: "document", fileName: input.fileName, fileKey: stored.key, fileUrl: stored.url, mimeType: input.contentType, isPinned: input.isPinned, sortOrder: input.sortOrder, createdByUserId: ctx.user.id });
    return { id: Number(result[0].insertId), url: stored.url };
  }),
  update: adminProcedure.input(base.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(sharedResources).set({ title: input.title, description: input.description ?? null, category: input.category, isPinned: input.isPinned, sortOrder: input.sortOrder, updatedAt: new Date() }).where(eq(sharedResources.id, input.id));
    return { success: true };
  }),
  setArchived: adminProcedure.input(z.object({ id: z.number().int().positive(), isArchived: z.boolean() })).mutation(async ({ input }) => {
    const db = await requireDb(); await db.update(sharedResources).set({ isArchived: input.isArchived, updatedAt: new Date() }).where(eq(sharedResources.id, input.id)); return { success: true };
  }),
});
