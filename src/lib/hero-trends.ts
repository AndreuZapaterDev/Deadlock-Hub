// Rendimiento de un héroe por rango y por semana a partir de `/v1/analytics/hero-stats?bucket=…`. Funciones puras (sin red).
import { pickRate } from "@/lib/analytics";

/** Fila de `hero-stats` con cubos (`bucket=avg_badge` o `bucket=start_time_week`): solo los campos que se usan. */
export type BucketRow = { hero_id: number; bucket: number; wins: number; matches: number; matches_per_bucket: number };

/** Con menos partidas que esto, un punto no es fiable (un 3/8 no es un 37 %) y se descarta. */
export const MIN_SAMPLE = 300;

export type TierPoint = { tier: number; matches: number; winRate: number; pickRate: number };

/**
 * Rendimiento de un héroe en cada rango (tier 1-11). `bucket` = nivel de insignia medio de la partida: tier·10 + subrango; el cubo 0
 * es «todos los rangos» y se ignora. Agrupa los 6 subrangos de cada tier y descarta los tiers con pocas partidas.
 */
export function tierSeries(rows: BucketRow[], heroId: number): TierPoint[] {
  const by = new Map<number, { wins: number; matches: number; total: number }>();
  for (const r of rows) {
    if (r.hero_id !== heroId || r.bucket < 11) continue;
    const tier = Math.floor(r.bucket / 10);
    const t = by.get(tier) ?? { wins: 0, matches: 0, total: 0 };
    t.wins += r.wins;
    t.matches += r.matches;
    t.total += r.matches_per_bucket;
    by.set(tier, t);
  }
  return [...by]
    .filter(([, t]) => t.matches >= MIN_SAMPLE)
    .map(([tier, t]) => ({ tier, matches: t.matches, winRate: t.wins / t.matches, pickRate: pickRate(t.matches, t.total) }))
    .sort((a, b) => a.tier - b.tier);
}

export type WeekPoint = { ts: number; matches: number; winRate: number; pickRate: number };

/**
 * Evolución semanal de un héroe. `bucket` = inicio de la semana (segundos unix). La primera y la última semana suelen estar
 * incompletas (la consulta empieza a mitad de semana y la actual aún no ha acabado): se descartan si tienen mucho menos volumen
 * total que la semana típica (mediana).
 */
export function weeklySeries(rows: BucketRow[], heroId: number): WeekPoint[] {
  const mine = rows.filter((r) => r.hero_id === heroId && r.matches > 0).sort((a, b) => a.bucket - b.bucket);
  if (mine.length === 0) return [];
  const totals = mine.map((r) => r.matches_per_bucket).sort((a, b) => a - b);
  const median = totals[Math.floor(totals.length / 2)];
  const full = (r: BucketRow) => r.matches_per_bucket >= median * 0.7;
  let list = mine;
  if (list.length > 2 && !full(list[list.length - 1])) list = list.slice(0, -1);
  if (list.length > 2 && !full(list[0])) list = list.slice(1);
  return list.filter((r) => r.matches >= MIN_SAMPLE).map((r) => ({ ts: r.bucket, matches: r.matches, winRate: r.wins / r.matches, pickRate: pickRate(r.matches, r.matches_per_bucket) }));
}

/** Cambio del win rate en puntos porcentuales: media de las últimas `n` semanas menos la de las anteriores. null si no hay datos para comparar. */
export function recentDelta(series: WeekPoint[], n = 3): number | null {
  if (series.length < n + 2) return null;
  const avg = (xs: WeekPoint[]) => xs.reduce((a, p) => a + p.winRate, 0) / xs.length;
  return Math.round((avg(series.slice(-n)) - avg(series.slice(0, -n))) * 1000) / 10;
}

/** Une varias series (una por héroe) en filas `{ x, [héroe]: valor }` para una gráfica de líneas con varias líneas. */
export function mergeSeries<T>(perHero: { name: string; points: T[] }[], x: (p: T) => string | number, y: (p: T) => number): { x: string | number; [name: string]: number | string }[] {
  const rows = new Map<string | number, { x: string | number; [name: string]: number | string }>();
  for (const h of perHero) {
    for (const p of h.points) {
      const key = x(p);
      const row = rows.get(key) ?? { x: key };
      row[h.name] = y(p);
      rows.set(key, row);
    }
  }
  return [...rows.values()].sort((a, b) => Number(a.x) - Number(b.x));
}

/** Dominio del eje Y ajustado a los datos (en puntos porcentuales), con un margen: así las diferencias de 1-2 puntos se ven. */
export function tightDomain(values: number[], pad = 1): [number, number] {
  if (values.length === 0) return [0, 100];
  return [Math.floor(Math.min(...values) - pad), Math.ceil(Math.max(...values) + pad)];
}
