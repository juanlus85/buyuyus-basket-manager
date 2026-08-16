import { mkdir, readFile, writeFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const target = new URL("../client/src/build-info.ts", import.meta.url);
await mkdir(new URL("../client/src/", import.meta.url), { recursive: true });
await writeFile(target, `export const BUILD_INFO = { version: "v${pkg.version}", builtAt: "${new Date().toISOString()}" } as const;\n`);
