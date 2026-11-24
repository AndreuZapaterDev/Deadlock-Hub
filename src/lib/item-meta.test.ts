import { describe, expect, it } from "vitest";
import { groupWinRate, MIN_ITEM_MATCHES, usageMap, winRank } from "./item-meta";

const rows = [
  { item_id: 1, wins: 600, matches: 1000 },
  { item_id: 2, wins: 500, matches: 1000 },
  { item_id: 3, wins: 400, matches: 1000 },
  { item_id: 4, wins: 5, matches: MIN_ITEM_MATCHES - 1 },
];

describe("item-meta", () => {
  const u = usageMap(rows);
  it("descarta objetos con poca muestra", () => {
    expect(u.has(4)).toBe(false);
    expect(u.get(1)).toEqual({ winRate: 0.6, matches: 1000 });
  });
  it("posición por win rate entre iguales", () => {
    expect(winRank(u, [1, 2, 3, 4], 2)).toEqual({ pos: 2, of: 3 });
    expect(winRank(u, [1, 2, 3, 4], 4)).toBeNull();
  });
  it("win rate de grupo ponderado", () => {
    expect(groupWinRate(u, [1, 3, 4])).toBe(0.5);
    expect(groupWinRate(u, [4])).toBeNull();
  });
});
