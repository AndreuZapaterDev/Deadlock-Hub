// Filtros del heatmap del mapa. Función pura (sin red ni servidor): la usan la página, el route handler y el navegador.
// Los nombres de los parámetros salen de `/v1/analytics/kill-death-stats` en el OpenAPI.

import { DURATIONS, toApiQuery, type AnalyticsFilters } from "@/lib/analytics-filters";

export type MatchMode = "ranked" | "unranked";
export const MATCH_MODES: Record<MatchMode, string> = { ranked: "Ranked", unranked: "Partidas normales" };

export type MapFilters = AnalyticsFilters & {
  /** Id del héroe (la URL de la página usa su slug; el route handler, `hero_id`). */
  hero?: number;
  /** Minuto de la partida desde el que se cuentan kills y muertes (0-120). */
  fromMin?: number;
  /** Minuto hasta el que se cuentan. */
  toMin?: number;
  mode?: MatchMode;
};

export const MAX_MINUTE = 120;
type Raw = Record<string, string | undefined | null>;

const int = (v: string | undefined | null, min: number, max: number) => {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
};

/**
 * Lee y valida los filtros (de la URL o del route handler). Todo lo inválido se ignora y nunca rompe nada. `hero` debe venir ya
 * como id numérico (`hero_id`); la página convierte el slug antes.
 */
export function parseMapFilters(sp: Raw): MapFilters {
  const f: MapFilters = {};
  const rankMin = int(sp.rank_min, 1, 11);
  let rankMax = int(sp.rank_max, 1, 11);
  if (rankMin !== undefined && rankMax !== undefined && rankMin > rankMax) rankMax = undefined;
  if (rankMin !== undefined) f.rankMin = rankMin;
  if (rankMax !== undefined) f.rankMax = rankMax;
  if (sp.since && /^\d{4}-\d{2}-\d{2}/.test(sp.since) && !Number.isNaN(Date.parse(sp.since))) f.since = sp.since.slice(0, 10);
  if (sp.dur && sp.dur in DURATIONS) f.dur = sp.dur as AnalyticsFilters["dur"];
  const hero = int(sp.hero_id, 1, 1_000_000);
  if (hero !== undefined) f.hero = hero;
  const from = int(sp.from, 0, MAX_MINUTE);
  let to = int(sp.to, 1, MAX_MINUTE);
  if (from !== undefined && to !== undefined && to <= from) to = undefined; // un tramo vacío (hasta ≤ desde) descarta el final
  if (from) f.fromMin = from; // 0 = desde el principio: no es un filtro
  if (to !== undefined) f.toMin = to;
  if (sp.mode === "ranked" || sp.mode === "unranked") f.mode = sp.mode;
  return f;
}

/** Parámetros reales de la API. */
export function toHeatQuery(f: MapFilters): Record<string, string | number> {
  const q: Record<string, string | number> = { ...toApiQuery(f) };
  if (f.hero !== undefined) q.hero_ids = f.hero;
  if (f.fromMin) q.min_game_time_s = f.fromMin * 60;
  if (f.toMin !== undefined) q.max_game_time_s = f.toMin * 60;
  if (f.mode) q.match_mode = f.mode;
  return q;
}

/** Filtros → parámetros del route handler `/api/map/heat` (claves ordenadas: sirve de clave de caché). */
export function toHeatSearch(f: MapFilters): string {
  const p = new URLSearchParams();
  if (f.dur) p.set("dur", f.dur);
  if (f.fromMin) p.set("from", String(f.fromMin));
  if (f.hero !== undefined) p.set("hero_id", String(f.hero));
  if (f.mode) p.set("mode", f.mode);
  if (f.rankMax !== undefined) p.set("rank_max", String(f.rankMax));
  if (f.rankMin !== undefined) p.set("rank_min", String(f.rankMin));
  if (f.since) p.set("since", f.since);
  if (f.toMin !== undefined) p.set("to", String(f.toMin));
  return p.toString();
}

export const hasMapFilters = (f: MapFilters) => Object.keys(f).length > 0;

/** Los minutos de «desde» y «hasta» que ofrece el selector. */
export const FROM_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, … 55
export const TO_MINUTES = Array.from({ length: 12 }, (_, i) => (i + 1) * 5); // 5, 10, … 60

/** Texto corto de los filtros activos (chips encima del mapa). */
export function describeMapFilters(f: MapFilters, names: { hero?: string; tier: (t: number) => string }): string[] {
  const out: string[] = [];
  if (f.hero !== undefined) out.push(names.hero ?? `Héroe #${f.hero}`);
  if (f.fromMin || f.toMin !== undefined) out.push(`Minutos ${f.fromMin ?? 0}–${f.toMin ?? "fin"}`);
  if (f.rankMin !== undefined || f.rankMax !== undefined) {
    out.push(f.rankMin !== undefined && f.rankMax !== undefined ? `${names.tier(f.rankMin)} → ${names.tier(f.rankMax)}` : f.rankMin !== undefined ? `Desde ${names.tier(f.rankMin)}` : `Hasta ${names.tier(f.rankMax!)}`);
  }
  if (f.since) out.push(`Desde el ${f.since}`);
  if (f.dur) out.push(DURATIONS[f.dur].label);
  if (f.mode) out.push(MATCH_MODES[f.mode]);
  return out;
}

// ---------- Estado de los selectores (cadenas, como llegan del DOM y de la URL) ----------

export const FILTER_KEYS = ["hero", "from", "to", "rank_min", "rank_max", "since", "dur", "mode"] as const;
export type FilterState = Record<(typeof FILTER_KEYS)[number], string>;
export const EMPTY_FILTERS: FilterState = { hero: "", from: "", to: "", rank_min: "", rank_max: "", since: "", dur: "", mode: "" };

/** Lee del `searchParams` de la página (o de la URL) solo las claves de filtro, como cadenas. */
export const pickFilterState = (sp: Record<string, string | undefined | null>): FilterState =>
  Object.fromEntries(FILTER_KEYS.map((k) => [k, sp[k] ?? ""])) as FilterState;

/** Estado de los selectores → filtros validados. `heroId` traduce el slug del héroe (la URL) a su id (la API). */
export function stateToFilters(state: FilterState, heroId: (slug: string) => number | undefined): MapFilters {
  const id = state.hero ? heroId(state.hero) : undefined;
  return parseMapFilters({ ...state, hero_id: id === undefined ? undefined : String(id) });
}
