import { describe, expect, it } from "vitest";
import { rankSamples, sampleFloor, usageShare } from "./meta-insights";

describe("sampleFloor", () => {
  it("es una fracción de la fila más jugada", () => expect(sampleFloor([{ matches: 100_000 }, { matches: 10 }])).toBe(5000));
  it("tiene suelo, para que con filtros no se quede en 0", () => expect(sampleFloor([{ matches: 100 }])).toBe(200));
  it("sin filas devuelve el suelo", () => expect(sampleFloor([])).toBe(200));
});

describe("rankSamples", () => {
  const rows = [
    { id: "a", wins: 600, matches: 1000 },
    { id: "b", wins: 9, matches: 10 },
    { id: "c", wins: 400, matches: 1000 },
    { id: "d", wins: 2000, matches: 5000 },
  ];
  it("descarta muestras pequeñas", () => expect(rankSamples(rows, "strong", 10, 500).map((r) => r.id)).not.toContain("b"));
  it("ordena mejores y peores por win rate ajustado", () => {
    expect(rankSamples(rows, "strong", 2, 500).map((r) => r.id)).toEqual(["a", "d"]);
    expect(rankSamples(rows, "weak", 1, 500)[0].id).toBe("c");
  });
  it("incluye win rate bruto y ajustado", () => {
    const [top] = rankSamples(rows, "strong", 1, 500);
    expect(top.rate).toBe(0.6);
    expect(top.adjusted).toBeLessThan(0.6);
  });
});

describe("usageShare", () => {
  it("proporción de partidas", () => expect(usageShare(25, 100)).toBe(0.25));
  it("sin total es 0 y nunca pasa de 1", () => {
    expect(usageShare(5, 0)).toBe(0);
    expect(usageShare(200, 100)).toBe(1);
  });
});
