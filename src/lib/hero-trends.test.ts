import { describe, expect, it } from "vitest";
import { mergeSeries, MIN_SAMPLE, recentDelta, tierSeries, tightDomain, weeklySeries, type BucketRow } from "./hero-trends";

const row = (o: Partial<BucketRow>): BucketRow => ({ hero_id: 1, bucket: 11, wins: 50, matches: 100, matches_per_bucket: 1200, ...o });

describe("tierSeries", () => {
  it("agrupa los subrangos de cada tier, ignora el cubo 0 y calcula win y pick rate", () => {
    const rows = [
      row({ bucket: 0, wins: 999999, matches: 2000000, matches_per_bucket: 9e7 }), // «todos»: fuera
      row({ bucket: 21, wins: 150, matches: 300, matches_per_bucket: 3600 }),
      row({ bucket: 22, wins: 180, matches: 300, matches_per_bucket: 3600 }),
      row({ bucket: 31, wins: 400, matches: 800, matches_per_bucket: 9600 }),
      row({ bucket: 21, hero_id: 2, wins: 1, matches: 1 }), // otro héroe
    ];
    const s = tierSeries(rows, 1);
    expect(s.map((p) => p.tier)).toEqual([2, 3]);
    expect(s[0]).toMatchObject({ matches: 600, winRate: 0.55 });
    expect(s[0].pickRate).toBeCloseTo(600 / (7200 / 12), 6);
    expect(s[1].winRate).toBe(0.5);
  });
  it("descarta los tiers con menos partidas que el mínimo fiable", () => {
    expect(tierSeries([row({ bucket: 41, wins: 3, matches: MIN_SAMPLE - 1 })], 1)).toEqual([]);
  });
  it("sin filas del héroe, vacío", () => {
    expect(tierSeries([], 1)).toEqual([]);
  });
});

describe("weeklySeries", () => {
  const W = 7 * 86400;
  const rows = [
    row({ bucket: 0 * W, wins: 150, matches: 300, matches_per_bucket: 60000 }), // semana inicial incompleta (volumen total bajo)
    row({ bucket: 1 * W, wins: 600, matches: 1200, matches_per_bucket: 190000 }),
    row({ bucket: 2 * W, wins: 630, matches: 1200, matches_per_bucket: 200000 }),
    row({ bucket: 3 * W, wins: 590, matches: 1200, matches_per_bucket: 210000 }),
    row({ bucket: 4 * W, wins: 200, matches: 400, matches_per_bucket: 70000 }), // semana en curso, incompleta
  ];
  it("descarta la primera y la última semana si están incompletas y ordena por fecha", () => {
    const s = weeklySeries([...rows].reverse(), 1);
    expect(s.map((p) => p.ts)).toEqual([1 * W, 2 * W, 3 * W]);
    expect(s[1].winRate).toBe(0.525);
  });
  it("con pocas semanas no recorta (no deja la serie vacía)", () => {
    expect(weeklySeries(rows.slice(0, 2), 1)).toHaveLength(2);
  });
  it("sin datos, vacío", () => {
    expect(weeklySeries([], 1)).toEqual([]);
  });
});

describe("recentDelta", () => {
  const mk = (rates: number[]) => rates.map((winRate, i) => ({ ts: i, matches: 1000, winRate, pickRate: 0.1 }));
  it("media de las últimas semanas menos la de las anteriores, en puntos", () => {
    expect(recentDelta(mk([0.5, 0.5, 0.5, 0.5, 0.52, 0.52, 0.52]), 3)).toBe(2);
    expect(recentDelta(mk([0.52, 0.52, 0.52, 0.5]), 3)).toBeNull(); // muy pocas semanas
  });
});

describe("mergeSeries y tightDomain", () => {
  it("une series de varios héroes por el eje X", () => {
    const rows = mergeSeries(
      [{ name: "A", points: [{ x: 1, v: 10 }, { x: 2, v: 20 }] }, { name: "B", points: [{ x: 2, v: 5 }, { x: 3, v: 6 }] }],
      (p) => p.x,
      (p) => p.v,
    );
    expect(rows).toEqual([{ x: 1, A: 10 }, { x: 2, A: 20, B: 5 }, { x: 3, B: 6 }]);
  });
  it("el dominio se ajusta a los datos con margen", () => {
    expect(tightDomain([48.2, 51.4])).toEqual([47, 53]);
    expect(tightDomain([])).toEqual([0, 100]);
  });
});
