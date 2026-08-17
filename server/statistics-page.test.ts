import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("página de estadísticas", () => {
  it("incluye temporada, gráficos y la tabla de disciplina por jugador", () => {
    const page = readFileSync(new URL("../client/src/pages/StatisticsPage.tsx", import.meta.url), "utf8");
    expect(page).toContain("trpc.sports.teamStatistics.useQuery");
    expect(page).toContain("Partidos jugados");
    expect(page).toContain("Antideportivas");
    expect(page).toContain("BarChart");
  });
});
