import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("panel de usuario", () => {
  it("separa y alinea las tarjetas de cuenta y agenda", () => {
    const page = readFileSync(new URL("../client/src/pages/DashboardPage.tsx", import.meta.url), "utf8");
    expect(page).toContain('className="mt-5 grid items-stretch gap-5 lg:grid-cols-2"');
    expect(page).toContain("min-h-[208px]");
  });
});
