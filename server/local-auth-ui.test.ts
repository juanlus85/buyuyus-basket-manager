import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("acceso local exclusivo", () => {
  it("muestra el formulario local y no ofrece acceso mediante cuenta Manus", () => {
    const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");
    expect(layout).toContain("localAuth.login");
    expect(layout).not.toContain("Acceso con cuenta Manus");
    expect(layout).not.toContain("startLogin");
  });

  it("ofrece un reenvío confirmado de credenciales para cuentas locales", () => {
    const adminPage = readFileSync(new URL("../client/src/pages/AdminPage.tsx", import.meta.url), "utf8");
    expect(adminPage).toContain("Reenviar acceso");
    expect(adminPage).toContain("resetCredentials.mutateAsync");
    expect(adminPage).toContain("Contraseña temporal nueva");
    expect(adminPage).toContain("Restablecer y enviar");
  });

  it("permite verificar SMTP desde el proceso de la aplicación sin mostrar secretos", () => {
    const adminPage = readFileSync(new URL("../client/src/pages/AdminPage.tsx", import.meta.url), "utf8");
    expect(adminPage).toContain("localUsers.verifySmtp");
    expect(adminPage).toContain("Comprobar SMTP");
  });
});
