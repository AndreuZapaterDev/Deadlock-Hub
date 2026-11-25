import { adjustedWinRate, winRate } from "@/lib/analytics";

// Análisis de carriles: dúos (dos héroes que comparten carril) y duelos (dúo contra dúo). Funciones puras para poder probarlas.

/** Partidas ficticias al 50 % para ordenar dúos: un carril tiene muchas menos partidas que un héroe entero, así que el prior es menor. */
export const LANE_PRIOR = 200;

export type DuoRow = { hero_ids: number[]; enemy_hero_ids: number[]; wins: number; matches_played: number; net_worth_diff: number };

export type DuoStat = { ids: [number, number]; matches: number; rate: number; adjusted: number; soulDiff: number };
export type DuelStat = { a: [number, number]; b: [number, number]; matches: number; rate: number; adjusted: number; soulDiff: number };

const asPair = (ids: number[]): [number, number] | null => (ids.length === 2 ? [ids[0], ids[1]] : null);

/** Récord de cada dúo contra cualquier rival (filas agrupadas solo por `hero_ids`). */
export function toDuos(rows: DuoRow[], minMatches = 1): DuoStat[] {
  const out: DuoStat[] = [];
  for (const r of rows) {
    const ids = asPair(r.hero_ids);
    if (!ids || r.matches_played < minMatches) continue;
    out.push({ ids, matches: r.matches_played, rate: winRate(r.wins, r.matches_played), adjusted: adjustedWinRate(r.wins, r.matches_played, LANE_PRIOR), soulDiff: r.net_worth_diff });
  }
  return out;
}

/** Los `n` mejores (`strong`) o peores (`weak`) dúos por win rate ajustado. */
export function rankDuos(duos: DuoStat[], mode: "strong" | "weak", n = 10): DuoStat[] {
  return [...duos].sort((a, b) => (mode === "strong" ? b.adjusted - a.adjusted : a.adjusted - b.adjusted)).slice(0, n);
}

/**
 * Duelos dúo contra dúo. La API devuelve cada duelo dos veces (uno por bando); aquí se queda solo el bando cuyo dúo va primero
 * por orden de ids, así que cada duelo sale una vez y `rate` es el win rate de `a` contra `b`.
 */
export function toDuels(rows: DuoRow[], minMatches = 1, dedupe = true): DuelStat[] {
  const out: DuelStat[] = [];
  for (const r of rows) {
    const a = asPair(r.hero_ids);
    const b = asPair(r.enemy_hero_ids);
    if (!a || !b || r.matches_played < minMatches) continue;
    // Con `dedupe: false` (filtrado por un héroe) se conservan los dos bandos: solo uno de ellos incluye al héroe pedido.
    if (dedupe && (a[0] > b[0] || (a[0] === b[0] && a[1] >= b[1]))) continue;
    out.push({ a, b, matches: r.matches_played, rate: winRate(r.wins, r.matches_played), adjusted: adjustedWinRate(r.wins, r.matches_played, LANE_PRIOR), soulDiff: r.net_worth_diff });
  }
  return out;
}

/** Duelos más desequilibrados: los `n` con mayor distancia al 50 %, con el dúo ganador siempre en `winner`. */
export function lopsidedDuels(duels: DuelStat[], n = 8) {
  return duels
    .map((d) => (d.adjusted >= 0.5 ? { winner: d.a, loser: d.b, rate: d.rate, adjusted: d.adjusted, matches: d.matches, soulDiff: d.soulDiff } : { winner: d.b, loser: d.a, rate: 1 - d.rate, adjusted: 1 - d.adjusted, matches: d.matches, soulDiff: -d.soulDiff }))
    .sort((x, y) => y.adjusted - x.adjusted)
    .slice(0, n);
}
