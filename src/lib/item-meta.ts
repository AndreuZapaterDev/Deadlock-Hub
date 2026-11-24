// Estadísticas de uso de objetos a partir de `/v1/analytics/item-stats`. Funciones puras.
export type UsageRow = { item_id: number; wins: number; matches: number };
export type ItemUsage = { winRate: number; matches: number };

/** Con menos partidas que esto el win rate de un objeto no es fiable y no se muestra. */
export const MIN_ITEM_MATCHES = 500;

/** Win rate y partidas por objeto (solo los que tienen muestra suficiente). */
export function usageMap(rows: UsageRow[]): Map<number, ItemUsage> {
  const m = new Map<number, ItemUsage>();
  for (const r of rows) if (r.matches >= MIN_ITEM_MATCHES) m.set(r.item_id, { winRate: r.wins / r.matches, matches: r.matches });
  return m;
}

/** Posición (1 = mejor) de `id` entre `peers` por win rate, y cuántos hay con datos. null si `id` no tiene datos. */
export function winRank(usage: Map<number, ItemUsage>, peers: number[], id: number): { pos: number; of: number } | null {
  const mine = usage.get(id);
  if (!mine) return null;
  const rated = peers.filter((p) => usage.has(p));
  return { pos: rated.filter((p) => usage.get(p)!.winRate > mine.winRate).length + 1, of: rated.length };
}

/** Win rate medio (ponderado por partidas) de un grupo de objetos; null si ninguno tiene datos. */
export function groupWinRate(usage: Map<number, ItemUsage>, ids: number[]): number | null {
  let w = 0;
  let n = 0;
  for (const id of ids) {
    const u = usage.get(id);
    if (u) {
      w += u.winRate * u.matches;
      n += u.matches;
    }
  }
  return n ? w / n : null;
}
