import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { localStorageRoot, resolveLocalStoragePath, writeLocalStorageFile } from "./localStorage";

const originalDirectory = process.env.FILE_STORAGE_DIR;
const originalForgeUrl = process.env.BUILT_IN_FORGE_API_URL;
const originalForgeKey = process.env.BUILT_IN_FORGE_API_KEY;
const temporaryDirectories: string[] = [];

function restoreEnvironment() {
  if (originalDirectory === undefined) delete process.env.FILE_STORAGE_DIR;
  else process.env.FILE_STORAGE_DIR = originalDirectory;
  if (originalForgeUrl === undefined) delete process.env.BUILT_IN_FORGE_API_URL;
  else process.env.BUILT_IN_FORGE_API_URL = originalForgeUrl;
  if (originalForgeKey === undefined) delete process.env.BUILT_IN_FORGE_API_KEY;
  else process.env.BUILT_IN_FORGE_API_KEY = originalForgeKey;
}

afterEach(async () => {
  restoreEnvironment();
  vi.restoreAllMocks();
  await Promise.all(temporaryDirectories.splice(0).map(directory => rm(directory, { recursive: true, force: true })));
});

describe("local file storage", () => {
  it("writes nested files under the configured private directory with restrictive permissions", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "buyuyus-storage-test-"));
    temporaryDirectories.push(directory);
    process.env.FILE_STORAGE_DIR = directory;
    const filePath = await writeLocalStorageFile("player-photos/12/portrait.jpg", Buffer.from("image-bytes"));

    expect(filePath).toBe(resolveLocalStoragePath(directory, "player-photos/12/portrait.jpg"));
    await expect(readFile(filePath, "utf8")).resolves.toBe("image-bytes");
    expect((await stat(filePath)).mode & 0o777).toBe(0o640);
  });

  it("rejects traversal, empty segments and NUL bytes before writing", () => {
    const root = localStorageRoot();
    for (const key of ["../outside.txt", "folder/../../outside.txt", "folder//item.pdf", "folder/\0item"]) {
      expect(() => resolveLocalStoragePath(root, key)).toThrow();
    }
  });

  it("falls back to disk for Plesk uploads without calling external services", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "buyuyus-storage-test-"));
    temporaryDirectories.push(directory);
    process.env.FILE_STORAGE_DIR = directory;
    process.env.BUILT_IN_FORGE_API_URL = "";
    process.env.BUILT_IN_FORGE_API_KEY = "";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.resetModules();
    const { storagePut } = await import("./storage");

    const stored = await storagePut("team-imports/12/calendar.pdf", Buffer.from("pdf-bytes"), "application/pdf");
    const localPath = resolveLocalStoragePath(directory, stored.key);
    expect(stored.url).toBe(`/manus-storage/${stored.key}`);
    await expect(readFile(localPath, "utf8")).resolves.toBe("pdf-bytes");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
