import "server-only";
import { cache } from "react";
import { getSource } from "@/lib/api";
import type { AnalyticsFilters } from "@/lib/analytics-filters";
import { toApiQuery } from "@/lib/analytics-filters";
import { adjustedWinRate, banRate, kda, pickRate, winRate, type Counter, type Synergy } from "@/lib/analytics";
import type {
  AbilityOrderRow, BanRow, BuildStatRow, BuildSummary, CombRow, FlowData, GameStatRow, HeroStatRow, ItemStatRow,
  LaneRow, LeaderboardEntry, MaxFirstRow, PermRow, BuffRow,
} from "@/lib/types";

// Todas las llamadas de estadísticas pasan por aquí (solo servidor). El navegador nunca llama a la API.

export type Fetched<T> = { ok: true; data: T } | { ok: false; status: number };

export async function fetchData<T>(path: string, query?: Record<string, string | number>): Promise<Fetched<T>> {
  try {
    const r = await getSource().get<T>(path, query);
    return r.status < 400 ? { ok: true, data: r.data } : { ok: false, status: r.status };
  } catch {
    return { ok: false, status: 500 };
  }
}

/** Valor útil o `fallback` si la API falló (para secciones opcionales que no deben tumbar la página). */
export async function orElse<T>(path: string, fallback: T, query?: Record<string, string | number>): Promise<T> {
  const r = await fetchData<T>(path, query);
  return r.ok ? r.data : fallback;
}

export const isMock = () => process.env.DATA_SOURCE !== "api";

/**
 * Los fixtures de `ability-order`, `hero-build-stats/{id}` e `item-flow` son SOLO de Infernus (id 1) y el mock devuelve ese
 * mismo ejemplo para cualquier héroe. En modo demo, estas secciones solo se muestran para él; con la API real, para todos.
 */
export const MOCK_HERO_SPECIFIC_ID = 1;
export const hasHeroSpecificData = (heroId: number) => !isMock() || heroId === MOCK_HERO_SPECIFIC_ID;

// ---------- Meta de héroes (tier list, fichas, comparador) ----------
export type HeroMeta = {
  id: number;
  matches: number;
  wins: number;
  winRate: number;
  /** Win rate ajustado por tamaño de muestra: es el que ordena la tier list. */
  adjusted: number;
  pickRate: number;
  banRate: number | null;
  kda: number;
  soulsPerMatch: number;
};

export type MetaResult = { rows: HeroMeta[]; totalMatches: number };

export const loadHeroMeta = cache(async (filters: AnalyticsFilters): Promise<Fetched<MetaResult>> => {
  const q = toApiQuery(filters);
  const [stats, bans] = await Promise.all([fetchData<HeroStatRow[]>("/v1/analytics/hero-stats", q), fetchData<BanRow[]>("/v1/analytics/hero-ban-stats", q)]);
  if (!stats.ok) return stats;

  const total = stats.data.reduce((a, r) => a + r.matches, 0);
  const banBy = new Map(bans.ok ? bans.data.map((b) => [b.hero_id, b]) : []);
  const rows = stats.data
    .filter((r) => r.matches > 0)
    .map<HeroMeta>((r) => ({
      id: r.hero_id,
      matches: r.matches,
      wins: r.wins,
      winRate: winRate(r.wins, r.matches),
      adjusted: adjustedWinRate(r.wins, r.matches),
      pickRate: pickRate(r.matches, total),
      banRate: banBy.has(r.hero_id) ? banRate(banBy.get(r.hero_id)!.bans, banBy.get(r.hero_id)!.matches) : null,
      kda: kda(r.total_kills, r.total_deaths, r.total_assists),
      soulsPerMatch: r.total_net_worth / r.matches,
    }));
  return { ok: true, data: { rows, totalMatches: total / 12 } };
});

export const loadCounters = cache((f: AnalyticsFilters) => fetchData<Counter[]>("/v1/analytics/hero-counter-stats", toApiQuery(f)));
export const loadSynergy = cache((f: AnalyticsFilters) => fetchData<Synergy[]>("/v1/analytics/hero-synergy-stats", toApiQuery(f)));

export const loadBigDays = cache(() => orElse<string[]>("/v1/patches/big-days", []));

// ---------- Objetos y meta ----------
export const loadItemStats = cache((f: AnalyticsFilters) => fetchData<ItemStatRow[]>("/v1/analytics/item-stats", toApiQuery(f)));
export const loadPermutations = (f: AnalyticsFilters) => fetchData<PermRow[]>("/v1/analytics/item-permutation-stats", toApiQuery(f));
export const loadCombs = (f: AnalyticsFilters) => fetchData<CombRow[]>("/v1/analytics/hero-comb-stats", { comb_size: 2, ...toApiQuery(f) });
export const loadBuffs = (f: AnalyticsFilters) => fetchData<BuffRow[]>("/v1/analytics/buff-stats", toApiQuery(f));
export const loadGameStats = (f: AnalyticsFilters) => fetchData<GameStatRow[]>("/v1/analytics/game-stats", toApiQuery(f));
export const loadLane = (f: AnalyticsFilters) => fetchData<LaneRow[]>("/v1/analytics/lane-matchup-stats", toApiQuery(f));
export const loadFlow = (heroId: number, f: AnalyticsFilters) => fetchData<FlowData>("/v1/analytics/item-flow-stats", { hero_ids: heroId, min_matches: 500, ...toApiQuery(f) });

// ---------- Datos específicos de un héroe ----------
export type HeroDeep = {
  abilityOrder: AbilityOrderRow[];
  maxFirst: MaxFirstRow[];
  builds: BuildStatRow[];
  buildNames: Map<number, string>;
};

export async function loadHeroDeep(heroId: number): Promise<HeroDeep> {
  const [abilityOrder, maxFirst, builds, published] = await Promise.all([
    orElse<AbilityOrderRow[]>("/v1/analytics/ability-order-stats", [], { hero_id: heroId, min_matches: 500 }),
    orElse<MaxFirstRow[]>("/v1/analytics/ability-max-first-stats", [], { hero_id: heroId }),
    orElse<BuildStatRow[]>(`/v1/analytics/hero-build-stats/${heroId}`, []),
    orElse<BuildSummary[]>("/v1/builds", [], { hero_id: heroId }),
  ]);
  // Solo se conoce el nombre de las builds publicadas; el resto se muestra como "Build #id"
  return { abilityOrder, maxFirst, builds, buildNames: new Map(published.map((b) => [b.hero_build.hero_build_id, b.hero_build.name])) };
}

// ---------- Leaderboard ----------
export const REGIONS = [
  ["Europe", "Europa"], ["Asia", "Asia"], ["NAmerica", "Norteamérica"], ["SAmerica", "Sudamérica"], ["Oceania", "Oceanía"],
] as const;
export type Region = (typeof REGIONS)[number][0];
export const isRegion = (v: string | undefined): v is Region => REGIONS.some(([r]) => r === v);

export const loadLeaderboard = cache(async (region: Region, heroId?: number) => {
  const path = heroId ? `/v1/leaderboard/${region}/${heroId}` : `/v1/leaderboard/${region}`;
  const r = await fetchData<{ entries: LeaderboardEntry[] }>(path);
  return r.ok ? ({ ok: true, data: r.data.entries } as Fetched<LeaderboardEntry[]>) : r;
});
