import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { importJobs } from "../../drizzle/schema";
import { requireDb } from "../db";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { storageGetSignedUrl, storagePut } from "../storage";
import { adminProcedure, router } from "../_core/trpc";

const importType = z.enum(["calendar", "standing", "match_report", "financial", "other"]);
const sourceKind = z.enum(["image", "pdf"]);
const extractionSchema = {
  type: "object",
  properties: {
    documentSummary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          recordType: { type: "string", enum: ["event", "match", "standing", "financial_transaction", "other"] },
          summary: { type: "string" },
          rawFields: { type: "string" },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
        },
        required: ["recordType", "summary", "rawFields", "confidence"],
        additionalProperties: false,
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["documentSummary", "items", "warnings"],
  additionalProperties: false,
} as const;

const matchReportExtractionSchema = {
  type: "object",
  properties: {
    documentSummary: { type: "string" },
    match: {
      type: "object",
      properties: {
        opponent: { type: ["string", "null"] },
        ownScore: { type: ["integer", "null"] },
        opponentScore: { type: ["integer", "null"] },
      },
      required: ["opponent", "ownScore", "opponentScore"],
      additionalProperties: false,
    },
    playerStats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          playerName: { type: "string" },
          jerseyNumber: { type: ["integer", "null"] },
          played: { type: "boolean" },
          fouls: { type: "integer", minimum: 0, maximum: 10 },
          technicalFouls: { type: "integer", minimum: 0, maximum: 5 },
          unsportsmanlikeFouls: { type: "integer", minimum: 0, maximum: 5 },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
        },
        required: ["playerName", "jerseyNumber", "played", "fouls", "technicalFouls", "unsportsmanlikeFouls", "confidence"],
        additionalProperties: false,
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["documentSummary", "match", "playerStats", "warnings"],
  additionalProperties: false,
} as const;

export const matchReportExtractionInstructions = "Analiza este acta de baloncesto. Extrae solo el rival, marcador de Buyuyus, marcador rival y, por cada jugador realmente identificable, participación, faltas, técnicas y antideportivas. Regla oficial de Buyuyus: todo jugador que figure en la lista del acta cuenta como participante, aunque no tenga una marca de entrada visible. Interpreta P como falta personal, T como falta técnica y U como falta antideportiva. Cuenta solo marcas realmente visibles; si una marca, nombre o cifra no es legible, usa 0 para ese campo e inclúyelo en warnings en vez de inventarlo. El resultado será un borrador para que administración lo asocie al partido y lo confirme.";

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150) || "document";
}

export const importRouter = router({
  list: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(importJobs).orderBy(desc(importJobs.createdAt));
  }),

  uploadAndExtract: adminProcedure
    .input(z.object({ type: importType, sourceKind, originalFilename: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(3).max(100), base64: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const fileBytes = Buffer.from(input.base64, "base64");
      if (!fileBytes.length || fileBytes.length > 15 * 1024 * 1024) {
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "El documento debe ocupar como máximo 15 MB." });
      }
      if (input.sourceKind === "pdf" && input.mimeType !== "application/pdf") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo seleccionado no parece un PDF válido." });
      }
      if (input.sourceKind === "image" && !input.mimeType.startsWith("image/")) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo seleccionado no parece una imagen válida." });
      }

      const stored = await storagePut(`team-imports/${ctx.user.id}/${Date.now()}-${safeFilename(input.originalFilename)}`, fileBytes, input.mimeType);
      const db = await requireDb();
      const [insert] = await db.insert(importJobs).values({
        type: input.type,
        sourceKind: input.sourceKind,
        status: "extracting",
        originalFilename: input.originalFilename,
        fileKey: stored.key,
        fileUrl: stored.url,
        createdByUserId: ctx.user.id,
      });
      const id = Number(insert.insertId);

      try {
        const signedUrl = await storageGetSignedUrl(stored.key);
        const models = await listLLMModels();
        const model = models.data.find(item => item.id.startsWith("gemini-3-flash"))?.id ?? models.data.find(item => item.id.startsWith("gpt-5-mini"))?.id;
        const source = input.sourceKind === "image"
          ? [{ type: "image_url" as const, image_url: { url: signedUrl, detail: "high" as const } }]
          : [{ type: "file_url" as const, file_url: { url: signedUrl, mime_type: "application/pdf" as const } }];
        const response = await invokeLLM({
          model,
          messages: [
            {
              role: "system",
              content: "Extraes información de documentos de un equipo amateur de baloncesto. Devuelve únicamente datos realmente visibles; no inventes campos, equipos, fechas, importes ni resultados. Si una fecha o dato no es legible, indícalo en warnings. Convierte los datos a texto claro en español para que un administrador los revise antes de crear registros.",
            },
            {
              role: "user",
              content: [{ type: "text", text: input.type === "match_report" ? matchReportExtractionInstructions : `Analiza este documento para el destino ${input.type}. Extrae los posibles eventos, partidos, filas de clasificación o movimientos financieros. No guardes nada automáticamente: la respuesta será un borrador de revisión.` }, ...source],
            },
          ],
          response_format: { type: "json_schema", json_schema: { name: input.type === "match_report" ? "basketball_match_report" : "team_document_extraction", strict: true, schema: input.type === "match_report" ? matchReportExtractionSchema : extractionSchema } },
        });
        const content = response.choices[0]?.message?.content;
        if (typeof content !== "string") {
          throw new Error("La extracción no devolvió un resultado válido.");
        }
        const result = JSON.parse(content);
        await db.update(importJobs).set({ status: "ready_for_review", extractedData: result, extractionNote: result.documentSummary, updatedAt: new Date() }).where(eq(importJobs.id, id));
        return { id, fileUrl: stored.url, status: "ready_for_review" as const, result };
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo procesar el documento.";
        await db.update(importJobs).set({ status: "failed", extractionNote: message, updatedAt: new Date() }).where(eq(importJobs.id, id));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "El documento se ha guardado, pero la extracción no se ha podido completar." });
      }
    }),

  review: adminProcedure.input(z.object({ id: z.number().int().positive(), decision: z.enum(["approved", "discarded"]), note: z.string().trim().max(4000).nullable().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.update(importJobs).set({ status: input.decision, extractionNote: input.note ?? null, reviewedByUserId: ctx.user.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(importJobs.id, input.id));
    return { success: true };
  }),
});
