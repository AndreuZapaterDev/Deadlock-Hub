import { describe, expect, it } from "vitest";
import { adjustedWinRate, assignTiers, banRate, bestPartners, kda, matchup, normalizeAxis, pairRate, pickRate, rankMatchups, winRate, type Counter, type Synergy } from "./analytics";

describe("win rate", () => {
  it("sin partidas es 0, no NaN", () => expect(winRate(0, 0)).toBe(0));
  it("el ajustado tira hacia el 50 % con pocas partidas", () => {
    expect(adjustedWinRate(3, 3)).toBeCloseTo(0.5015, 3); // un 3/3 no es un 100 %
    expect(adjustedWinRate(60, 100, 100)).toBe(0.55);
  });
  it("con millones de partidas casi no cambia", () => {
    expect(adjustedWinRate(1_221_499, 2_502_422)).toBeCloseTo(0.488, 3);
    expect(Math.abs(adjustedWinRate(1_221_499, 2_502_422) - winRate(1_221_499, 2_502_422))).toBeLessThan(0.0005);
  });
});

describe("kda, pick rate y ban rate", () => {
  it("KDA = (K + A) / D y no divide entre 0", () => {
    expect(kda(10, 5, 10)).toBe(4);
    expect(kda(7, 0, 3)).toBe(10);
  });
  it("pick rate: partidas del héroe entre (partidas-jugador / 12)", () => {
    // 12 filas por partida: 120 filas = 10 partidas; un héroe con 5 filas aparece en el 50 % de las partidas
    expect(pickRate(5, 120)).toBe(0.5);
    expect(pickRate(1, 0)).toBe(0);
  });
  it("con los datos reales sale ~36,6 % para Infernus", () => {
    expect(pickRate(2_502_422, 82_034_091)).toBeCloseTo(0.366, 3);
  });
  it("ban rate", () => {
    expect(banRate(155_753, 4_642_908)).toBeCloseTo(0.0335, 4);
    expect(banRate(1, 0)).toBe(0);
  });
});

describe("assignTiers", () => {
  const rows = Array.from({ length: 44 }, (_, i) => ({ id: i, score: 0.6 - i * 0.002 }));
  it("reparte 44 héroes por percentil: 4 S, 9 A, 18 B, 9 C, 4 D", () => {
    const t = assignTiers(rows);
    const count = (x: string) => t.filter((r) => r.tier === x).length;
    expect([count("S"), count("A"), count("B"), count("C"), count("D")]).toEqual([4, 9, 18, 9, 4]);
  });
  it("ordena por score y numera el ranking desde 1", () => {
    const t = assignTiers([{ score: 0.4 }, { score: 0.6 }, { score: 0.5 }]);
    expect(t.map((r) => r.score)).toEqual([0.6, 0.5, 0.4]);
    expect(t.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
  it("con pocos elementos no falla y el mejor es S", () => {
    expect(assignTiers([{ score: 1 }])[0].tier).toBe("S");
    expect(assignTiers([])).toEqual([]);
  });
  it("el último nunca se queda sin tier", () => {
    const t = assignTiers(rows);
    expect(t.at(-1)!.tier).toBe("D");
  });
});

const counters: Counter[] = [
  { hero_id: 1, enemy_hero_id: 2, wins: 60, matches_played: 100 },
  { hero_id: 2, enemy_hero_id: 1, wins: 40, matches_played: 100 },
  { hero_id: 1, enemy_hero_id: 3, wins: 30, matches_played: 100 },
  { hero_id: 1, enemy_hero_id: 4, wins: 9, matches_played: 10 },
];
describe("counters", () => {
  it("matchup directo", () => {
    expect(matchup(counters, 1, 2)).toEqual({ wins: 60, matches: 100, rate: 0.6 });
    expect(matchup(counters, 2, 1)?.rate).toBe(0.4);
    expect(matchup(counters, 1, 9)).toBeNull();
  });
  it("ranking fuerte/débil con mínimo de partidas (un 9/10 no cuenta)", () => {
    expect(rankMatchups(counters, 1, "strong", 5, 50).map((r) => r.id)).toEqual([2, 3]);
    expect(rankMatchups(counters, 1, "weak", 5, 50).map((r) => r.id)).toEqual([3, 2]);
    expect(rankMatchups(counters, 1, "strong", 5, 1).map((r) => r.id)[0]).toBe(4);
  });
});

const syn: Synergy[] = [
  { hero_id1: 1, hero_id2: 2, wins: 55, matches_played: 100 },
  { hero_id1: 1, hero_id2: 5, wins: 70, matches_played: 100 },
  { hero_id1: 3, hero_id2: 5, wins: 50, matches_played: 100 },
];
describe("sinergias", () => {
  it("la pareja se guarda una vez (id1 < id2) y se consulta desde cualquiera de los dos", () => {
    expect(bestPartners(syn, 5, 5, 1).map((r) => r.id)).toEqual([1, 3]);
    expect(bestPartners(syn, 1, 5, 1).map((r) => r.id)).toEqual([5, 2]);
  });
  it("pairRate es simétrico", () => {
    expect(pairRate(syn, 2, 1)).toEqual(pairRate(syn, 1, 2));
    expect(pairRate(syn, 1, 2)?.rate).toBe(0.55);
    expect(pairRate(syn, 2, 3)).toBeNull();
  });
});

describe("normalizeAxis", () => {
  it("min-max a 0-100", () => {
    const all = [100, 200, 300];
    expect([normalizeAxis(100, all), normalizeAxis(200, all), normalizeAxis(300, all)]).toEqual([0, 50, 100]);
  });
  it("todos iguales → 50", () => expect(normalizeAxis(5, [5, 5])).toBe(50));
});
