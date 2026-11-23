import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const forgeEnv = { forgeApiUrl: "", forgeApiKey: "" };

async function loadLlm(forge = forgeEnv) {
  vi.resetModules();
  vi.doMock("./env", () => ({ ENV: forge }));
  return import("./llm");
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.doUnmock("./env");
});

describe("server LLM provider routing", () => {
  it("lists OpenAI models using the server-side OpenAI key", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ object: "list", data: [{ id: "vision-model", object: "model", created: 1, owned_by: "openai" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const { listLLMModels } = await loadLlm();

    const result = await listLLMModels();

    expect(result.data[0]?.id).toBe("vision-model");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/models");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: { authorization: "Bearer test-openai-key" } });
  });

  it("sends local screenshots as data URLs and adapts a local PDF to the OpenAI file part", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "completion", created: 1, model: "vision-model",
      choices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "stop" }],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { invokeLLM } = await loadLlm();

    await invokeLLM({
      model: "vision-model",
      messages: [{ role: "user", content: [
        { type: "text", text: "Read this document." },
        { type: "image_url", image_url: { url: "data:image/png;base64,aW1hZ2U=", detail: "high" } },
        { type: "file_url", file_url: { url: "data:application/pdf;base64,cGRm", mime_type: "application/pdf" } },
      ] }],
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.openai.com/v1/chat/completions");
    expect(request.messages[0].content).toContainEqual({ type: "image_url", image_url: { url: "data:image/png;base64,aW1hZ2U=", detail: "high" } });
    expect(request.messages[0].content).toContainEqual({ type: "file", file: { filename: "document.pdf", file_data: "data:application/pdf;base64,cGRm" } });
    expect(JSON.stringify(request)).not.toContain("file_url");
  });

  it("preserves Forge routing and its existing remote file_url message shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      id: "completion", created: 1, model: "gemini-3-flash-preview",
      choices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "stop" }],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { invokeLLM } = await loadLlm({ forgeApiUrl: "https://forge.example", forgeApiKey: "forge-test-key" });

    await invokeLLM({
      model: "gemini-3-flash-preview",
      messages: [{ role: "user", content: [{ type: "file_url", file_url: { url: "https://storage.example/document.pdf", mime_type: "application/pdf" } }] }],
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://forge.example/v1/chat/completions");
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: "Bearer forge-test-key" });
    expect(request.messages[0].content[0]).toEqual({ type: "file_url", file_url: { url: "https://storage.example/document.pdf", mime_type: "application/pdf" } });
  });

  it("fails without configured credentials and does not make a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { listLLMModels } = await loadLlm();

    await expect(listLLMModels()).rejects.toThrow("BUILT_IN_FORGE_API_KEY o OPENAI_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not retry permanent authentication errors", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response("invalid API key", { status: 401, statusText: "Unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);
    const { listLLMModels } = await loadLlm();

    await expect(listLLMModels()).rejects.toThrow("401 Unauthorized");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not retry a 429 response that reports an exhausted quota", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "You exceeded your current quota" } }), { status: 429, statusText: "Too Many Requests" }));
    vi.stubGlobal("fetch", fetchMock);
    const { listLLMModels } = await loadLlm();

    await expect(listLLMModels()).rejects.toThrow("429 Too Many Requests");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
