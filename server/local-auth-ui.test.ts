import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("acceso local exclusivo", () => {
  it("muestra el formulario local y no ofrece acceso mediante cuenta Manus", () => {
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(layout).toContain("localAuth.login");
    expect(layout).not.toContain("Acceso con cuenta Manus");
    expect(layout).not.toContain("startLogin");
  });
});
