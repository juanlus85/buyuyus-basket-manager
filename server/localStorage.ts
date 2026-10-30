import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

export function localStorageRoot() {
  const configured = process.env.FILE_STORAGE_DIR?.trim();
  return resolve(configured || resolve(process.cwd(), "storage", "uploads"));
}

export function resolveLocalStoragePath(root: string, key: string) {
  if (!key || key.includes("\0")) throw new Error("Invalid storage key");
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  if (segments.some(segment => !segment || segment === "." || segment === "..")) {
    throw new Error("Invalid storage key");
  }

  const base = resolve(root);
  const target = resolve(base, ...segments);
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    throw new Error("Storage path escapes the configured root");
  }
  return target;
}

export async function writeLocalStorageFile(key: string, data: Buffer | Uint8Array | string) {
  const root = localStorageRoot();
  const path = resolveLocalStoragePath(root, key);
  await mkdir(dirname(path), { recursive: true, mode: 0o750 });
  await writeFile(path, data, { mode: 0o640, flag: "wx" });
  return path;
}
