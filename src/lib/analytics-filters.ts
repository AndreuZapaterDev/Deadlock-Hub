// Filtros comunes de las analytics. Viven en la URL (se pueden compartir) y se traducen a los parámetros del OpenAPI.

export type AnalyticsFilters = {
  /** Tier mínimo/máximo del rango medio de la partida (1-11). */
  rankMin?: number;
  rankMax?: number;
  /** Fecha ISO (YYYY-MM-DD): solo partidas desde ese día, normalmente la de un parche. */
  since?: string;
  dur?: "short" | "mid" | "long";
};

/** `key` = texto en los mensajes («analytics.<key>»). `label` (español) lo usa todavía el mapa. */
export const DURATIONS: Record<NonNullable<AnalyticsFilters["dur"]>, { key: string; label: string; min?: number; max?: number }> = {
  short: { key: "durShort", label: "Cortas (menos de 20 min)", max: 1200 },
  mid: { key: "durMid", label: "Medias (20 a 40 min)", min: 1200, max: 2400 },
  long: { key: "durLong", label: "Largas (más de 40 min)", min: 2400 },
};

type Raw = Record<string, string | undefined>;

const tier = (v?: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 11 ? n : undefined;
};

/** Lee y valida los filtros de la URL. Todo lo inválido se ignora (nunca rompe la página). */
export function parseFilters(sp: Raw): AnalyticsFilters {
  const f: AnalyticsFilters = {};
  const min = tier(sp.rank_min);
  let max = tier(sp.rank_max);
  if (min !== undefined && max !== undefined && min > max) max = undefined; // un rango imposible (mín > máx) descarta el máximo
  if (min !== undefined) f.rankMin = min;
  if (max !== undefined) f.rankMax = max;
  if (sp.since && /^\d{4}-\d{2}-\d{2}/.test(sp.since) && !Number.isNaN(Date.parse(sp.since))) f.since = sp.since.slice(0, 10);
  if (sp.dur && sp.dur in DURATIONS) f.dur = sp.dur as AnalyticsFilters["dur"];
  return f;
}

/**
 * Traduce a los parámetros reales de la API (nombres sacados del OpenAPI).
 * `average_badge`: decenas = tier, unidad = subrango; el tier t va de t·10+1 a t·10+6 (máximo 116).
 */
export function toApiQuery(f: AnalyticsFilters): Record<string, number> {
  const q: Record<string, number> = {};
  if (f.rankMin !== undefined) q.min_average_badge = f.rankMin * 10 + 1;
  if (f.rankMax !== undefined) q.max_average_badge = Math.min(f.rankMax * 10 + 6, 116);
  if (f.since) q.min_unix_timestamp = Math.floor(Date.parse(f.since + "T00:00:00Z") / 1000);
  if (f.dur) {
    const d = DURATIONS[f.dur];
    if (d.min !== undefined) q.min_duration_s = d.min;
    if (d.max !== undefined) q.max_duration_s = d.max;
  }
  return q;
}

export const hasFilters = (f: AnalyticsFilters) => Object.keys(f).length > 0;

/** Texto corto de los filtros activos, para mostrarlos encima de los datos. */
/** `t` = traductor del namespace «analytics». */
export function describeFilters(f: AnalyticsFilters, tierName: (t: number) => string, t: (key: string, values?: Record<string, string | number>) => string): string[] {
  const out: string[] = [];
  if (f.rankMin !== undefined || f.rankMax !== undefined) {
    out.push(t("fRank", { from: f.rankMin !== undefined ? tierName(f.rankMin) : t("any").toLowerCase(), to: f.rankMax !== undefined ? tierName(f.rankMax) : t("any").toLowerCase() }));
  }
  if (f.since) out.push(t("fSince", { date: f.since }));
  if (f.dur) out.push(t(DURATIONS[f.dur].key));
  return out;
}
