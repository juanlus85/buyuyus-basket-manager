import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({ requireDb: vi.fn() }));
vi.mock("../storage", () => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));
vi.mock("../pdfText", () => ({ extractPdfText: vi.fn() }));
vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn(), listLLMModels: vi.fn() }));
vi.mock("../_core/env", () => ({
  ENV: {
    appId: "",
    cookieSecret: "",
    databaseUrl: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    isProduction: false,
    forgeApiUrl: "",
    forgeApiKey: "",
  },
}));

import { importJobs } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { requireDb } from "../db";
import { extractPdfText } from "../pdfText";
import { importRouter } from "./imports";
import { storageGetSignedUrl, storagePut } from "../storage";

const admin = {
  user: {
    id: 8,
    openId: "imports-admin",
    email: "admin@example.com",
    name: "Admin",
    loginMethod: "local",
    role: "admin" as const,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: { protocol: "https", headers: {} },
  res: { cookie: () => undefined, clearCookie: () => undefined },
} as unknown as TrpcContext;

const regularUser = {
  ...admin,
  user: { ...admin.user!, id: 14, openId: "imports-player", role: "user" as const },
} as TrpcContext;

const matchReportText = [
  "Fecha 12/11/2026",
  "Hora 18:30",
  "Terreno Pabellón Municipal Fase Liga Distrito Sevilla Grupo 1 Jornada 3",
  "Equipo A C.B. BUYUYUS 42",
  "123A C ANA GARCIA 7 P T U P",
  "234B LUIS PEREZ 12",
  "Equipo B C.B. RIVAL 38",
  "RESULTADO FINAL",
  "42 38",
].join("\n");

function makeDb() {
  const insertValues = vi.fn().mockResolvedValue([{ insertId: 731 }]);
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const insert = vi.fn().mockReturnValue({ values: insertValues });
  const update = vi.fn().mockReturnValue({ set: updateSet });
  const deleteRows = vi.fn();
  const db = { insert, update, delete: deleteRows };
  return { db, insert, insertValues, update, updateSet, updateWhere, deleteRows };
}

const pdfInput = {
  type: "match_report" as const,
  sourceKind: "pdf" as const,
  originalFilename: "acta-ficticia.pdf",
  mimeType: "application/pdf",
  // extractPdfText está sustituido; estos bytes no representan un PDF real.
  base64: Buffer.from("bytes ficticios para la prueba").toString("base64"),
};

const imageInput = {
  ...pdfInput,
  sourceKind: "image" as const,
  originalFilename: "captura-ficticia.png",
  mimeType: "image/png",
};

describe("imports.uploadAndExtract para actas de partido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(extractPdfText).mockResolvedValue(matchReportText);
    vi.mocked(storagePut).mockResolvedValue({ key: "team-imports/8/fake.pdf", url: "https://storage.invalid/fake.pdf" });
  });

  it("crea solo un importJob listo para revisión con rival, marcador, faltas P/T/U y todos los jugadores participando", async () => {
    const { db, insert, insertValues, update, updateSet, deleteRows } = makeDb();
    vi.mocked(requireDb).mockResolvedValue(db as never);

    const result = await importRouter.createCaller(admin).uploadAndExtract(pdfInput);

    expect(result.status).toBe("ready_for_review");
    expect(result.id).toBe(731);
    expect(result.result.match).toEqual({ opponent: "C.B. RIVAL", ownScore: 42, opponentScore: 38 });
    expect(result.result.playerStats).toEqual([
      expect.objectContaining({
        playerName: "ANA GARCIA",
        jerseyNumber: 7,
        played: true,
        fouls: 2,
        technicalFouls: 1,
        unsportsmanlikeFouls: 1,
      }),
      expect.objectContaining({
        playerName: "LUIS PEREZ",
        jerseyNumber: 12,
        played: true,
        fouls: 0,
        technicalFouls: 0,
        unsportsmanlikeFouls: 0,
      }),
    ]);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(importJobs);
    expect(insertValues).toHaveBeenCalledWith(expect.objectContaining({
      type: "match_report",
      sourceKind: "pdf",
      status: "extracting",
      originalFilename: pdfInput.originalFilename,
      createdByUserId: admin.user!.id,
    }));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(importJobs);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: "ready_for_review",
      extractedData: result.result,
    }));
    expect(deleteRows).not.toHaveBeenCalled();

    expect(vi.mocked(extractPdfText)).toHaveBeenCalledTimes(1);
    expect(storagePut).toHaveBeenCalledTimes(1);
    expect(storageGetSignedUrl).not.toHaveBeenCalled();
    expect(listLLMModels).not.toHaveBeenCalled();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("rechaza una captura sin IA Forge, conserva el importJob fallido y no llama al LLM", async () => {
    const { db, insert, update, updateSet, deleteRows } = makeDb();
    vi.mocked(requireDb).mockResolvedValue(db as never);

    expect(ENV.forgeApiUrl).toBe("");
    expect(ENV.forgeApiKey).toBe("");
    await expect(importRouter.createCaller(admin).uploadAndExtract(imageInput)).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(importJobs);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(importJobs);
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
    expect(deleteRows).not.toHaveBeenCalled();
    expect(storagePut).toHaveBeenCalledTimes(1);
    expect(storageGetSignedUrl).not.toHaveBeenCalled();
    expect(extractPdfText).not.toHaveBeenCalled();
    expect(listLLMModels).not.toHaveBeenCalled();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("deniega uploadAndExtract a un usuario que no es administrador antes de acceder a DB o storage", async () => {
    await expect(importRouter.createCaller(regularUser).uploadAndExtract(pdfInput)).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(requireDb).not.toHaveBeenCalled();
    expect(storagePut).not.toHaveBeenCalled();
    expect(storageGetSignedUrl).not.toHaveBeenCalled();
    expect(extractPdfText).not.toHaveBeenCalled();
    expect(listLLMModels).not.toHaveBeenCalled();
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("rechaza imágenes no admitidas antes de guardarlas", async () => {
    const unsupportedImage = { ...imageInput, mimeType: "image/bmp" };

    await expect(importRouter.createCaller(admin).uploadAndExtract(unsupportedImage)).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(requireDb).not.toHaveBeenCalled();
    expect(storagePut).not.toHaveBeenCalled();
    expect(listLLMModels).not.toHaveBeenCalled();
    expect(invokeLLM).not.toHaveBeenCalled();
  });
});
