import { describe, expect, it } from "vitest";
import { lopsidedDuels, rankDuos, toDuels, toDuos, type DuoRow } from "./lanes";

const row = (hero_ids: number[], enemy_hero_ids: number[], wins: number, matches_played: number, net_worth_diff = 0): DuoRow => ({ hero_ids, enemy_hero_ids, wins, matches_played, net_worth_diff });

describe("dúos de carril", () => {
  const duos = toDuos([row([1, 2], [], 600, 1000), row([3, 4], [], 400, 1000), row([5, 6], [], 9, 10), row([7], [], 5, 10)]);

  it("ignora filas que no son un dúo", () => {
    expect(duos.map((d) => d.ids)).toEqual([[1, 2], [3, 4], [5, 6]]);
  });
  it("respeta el mínimo de partidas", () => {
    expect(toDuos([row([1, 2], [], 5, 5)], 100)).toEqual([]);
  });
  it("ordena mejores y peores por win rate ajustado (un 9/10 no gana a un 600/1000)", () => {
    expect(rankDuos(duos, "strong", 3).map((d) => d.ids[0])).toEqual([1, 5, 3]);
    expect(rankDuos(duos, "weak", 1)[0].ids).toEqual([3, 4]);
  });
});

describe("duelos de carril", () => {
  // Cada duelo viene dos veces (uno por bando)
  const rows = [row([1, 2], [3, 4], 700, 1000, 300), row([3, 4], [1, 2], 300, 1000, -300), row([1, 2], [5, 6], 450, 1000, -50), row([5, 6], [1, 2], 550, 1000, 50)];

  it("deduplica los dos bandos", () => {
    expect(toDuels(rows)).toHaveLength(2);
  });
  it("lopsidedDuels pone al ganador primero", () => {
    const [top] = lopsidedDuels(toDuels(rows));
    expect(top.winner).toEqual([1, 2]);
    expect(top.loser).toEqual([3, 4]);
    expect(top.rate).toBeCloseTo(0.7);
    expect(top.soulDiff).toBe(300);
  });
});
