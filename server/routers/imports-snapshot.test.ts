import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({ requireDb: vi.fn() }));
vi.mock("../storage", () => ({ storagePut: vi.fn(), storageGetSignedUrl: vi.fn() }));
vi.mock("../pdfText", () => ({ extractPdfText: vi.fn() }));
vi.mock("../_core/llm", () => ({ invokeLLM: vi.fn(), listLLMModels: vi.fn() }));
vi.mock("../_core/env", async importOriginal => {
  const actual = await importOriginal<typeof import("../_core/env")>();
  return { ...actual, ENV: { ...actual.ENV, forgeApiUrl: "", forgeApiKey: "" } };
});
import { requireDb } from "../db";
import { storageGetSignedUrl, storagePut } from "../storage";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { appRouter } from "../routers";

const admin = {
  user: { id: 8, openId: "snapshot-admin", email: "admin@example.com", name: "Admin", loginMethod: "local", role: "admin" as const, isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} },
  res: { cookie: () => undefined, clearCookie: () => undefined },
} as unknown as TrpcContext;
const regularUser = { ...admin, user: { ...admin.user!, id: 9, openId: "snapshot-user", role: "user" as const } } as TrpcContext;

const standing = {
  teamName: "Buyuyus",
  position: 1,
  played: 8,
  won: 7,
  drawn: 0,
  lost: 1,
  forfeits: 0,
  pointsFor: 531,
  pointsAgainst: 410,
  points: 15,
};
const input = {
  id: 41,
  competitionId: 5,
  standings: [standing],
  results: [{ matchId: 72, ownScore: 68, opponentScore: 61 }],
};

function resolvedQuery(result: unknown) {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: async () => result,
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

function createTransactionDb(options?: { job?: unknown; competition?: unknown; matches?: unknown[] }) {
  const insertValues = vi.fn().mockReturnValue({ onDuplicateKeyUpdate: vi.fn().mockResolvedValue(undefined) });
  const updateSets: unknown[] = [];
  const updateSet = vi.fn((values: unknown) => {
    updateSets.push(values);
    return { where: vi.fn().mockResolvedValue(undefined) };
  });
  const selectResults = [
    [options?.job ?? { id: 41, type: "standing", status: "ready_for_review", extractedData: { documentSummary: "Jornada 8", standings: [standing], results: [], warnings: [] }, extractionNote: "Jornada 8" }],
    [options?.competition ?? { id: 5 }],
    options?.matches ?? [{ id: 72, competitionId: 5 }],
  ];
  const tx = {
    select: vi.fn(() => resolvedQuery(selectResults.shift() ?? [])),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
  };
  const transaction = vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
  vi.mocked(requireDb).mockResolvedValue({ transaction } as never);
  return { tx, transaction, insertValues, updateSet, updateSets };
}

describe("imports.applySportsSnapshot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deniega la operación a un usuario normal antes de acceder a DB", async () => {
    await expect(appRouter.createCaller(regularUser).imports.applySportsSnapshot(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(requireDb).not.toHaveBeenCalled();
  });

  it("rechaza filas incompletas sin abrir una transacción", async () => {
    const incomplete = {
      ...input,
      standings: [{ teamName: "Buyuyus", position: 1, played: 8 }],
    } as never;
    await expect(appRouter.createCaller(admin).imports.applySportsSnapshot(incomplete)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(requireDb).not.toHaveBeenCalled();
  });

  it("confirma standings, resultados y aprobación como un batch transaccional", async () => {
    const db = createTransactionDb();
    const result = await appRouter.createCaller(admin).imports.applySportsSnapshot(input);

    expect(result).toEqual({ success: true, standingsApplied: 1, resultsApplied: 1 });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.insertValues).toHaveBeenCalledWith(expect.objectContaining({ competitionId: 5, teamName: "Buyuyus", points: 15 }));
    expect(db.updateSets).toEqual(expect.arrayContaining([
      expect.objectContaining({ ownScore: 68, opponentScore: 61, status: "completed" }),
      expect.objectContaining({ status: "approved", reviewedByUserId: 8, extractedData: expect.objectContaining({ appliedCompetitionId: 5, appliedSelection: expect.any(Object) }) }),
    ]));
  });

  it("rechaza un partido de otra competición sin aplicar el snapshot", async () => {
    const db = createTransactionDb({ matches: [{ id: 72, competitionId: 6 }] });
    await expect(appRouter.createCaller(admin).imports.applySportsSnapshot(input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(db.insertValues).not.toHaveBeenCalled();
    expect(db.updateSet).not.toHaveBeenCalled();
  });

  it("extrae una captura con OPENAI_API_KEY y OPENAI_MODEL usando data URL inline y deja ready_for_review", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-sent-to-client");
    vi.stubEnv("OPENAI_MODEL", "vision-json-model-test");
    vi.mocked(storagePut).mockResolvedValue({ key: "team-imports/8/week.png", url: "https://storage.invalid/week.png" });
    vi.mocked(listLLMModels).mockResolvedValue({ object: "list", data: [{ id: "vision-json-model-test", object: "model", created: 0, owned_by: "test" }] });
    const draft = { documentSummary: "Jornada 8", standings: [standing], results: [], warnings: [] };
    vi.mocked(invokeLLM).mockResolvedValue({
      id: "mock-response", created: 0, model: "vision-json-model-test",
      choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(draft) }, finish_reason: "stop" }],
    });
    const insertValues = vi.fn().mockResolvedValue([{ insertId: 91 }]);
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    vi.mocked(requireDb).mockResolvedValue({
      insert: vi.fn().mockReturnValue({ values: insertValues }),
      update: vi.fn().mockReturnValue({ set: updateSet }),
    } as never);

    try {
      const bytes = Buffer.from("mock-image");
      const result = await appRouter.createCaller(admin).imports.uploadAndExtract({
        type: "standing", sourceKind: "image", originalFilename: "week.png", mimeType: "image/png", base64: bytes.toString("base64"),
      });

      expect(result.status).toBe("ready_for_review");
      expect(result.result).toEqual(draft);
      expect(listLLMModels).toHaveBeenCalledOnce();
      expect(invokeLLM).toHaveBeenCalledWith(expect.objectContaining({
        model: "vision-json-model-test",
        messages: expect.arrayContaining([expect.objectContaining({
          role: "user",
          content: expect.arrayContaining([expect.objectContaining({
            type: "image_url",
            image_url: { url: `data:image/png;base64,${bytes.toString("base64")}`, detail: "high" },
          })]),
        })]),
      }));
      expect(storageGetSignedUrl).not.toHaveBeenCalled();
      expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "ready_for_review", extractedData: draft }));
      expect(updateSet).not.toHaveBeenCalledWith(expect.objectContaining({ status: "approved" }));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
