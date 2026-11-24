import "server-only";
import { cache } from "react";
import { getSource } from "@/lib/api";
import { classifyStatuses, summarize, type ProfileState, type Summary } from "@/lib/player-stats";
import type { MatchHistoryRow, PlayerBuild, PlayerHeroStat, PlayerRank, Relation, SearchResult, SteamProfile } from "@/lib/types";

// Todas las llamadas del tracker pasan por aquí (Server Components y route handlers): el navegador nunca llama a la API.

export type PlayerData =
  | {
      state: "ok";
      accountId: number;
      profile?: SteamProfile;
      rank?: PlayerRank;
      region?: string;
      history: MatchHistoryRow[];
      summary: Summary;
      heroes: PlayerHeroStat[];
      mates: Relation[];
      enemies: Relation[];
      builds: PlayerBuild[];
    }
  | { state: Exclude<ProfileState, "ok">; accountId: number };

/** Respuesta útil o `fallback` si la API devolvió un error (los datos opcionales no deben tumbar la página). */
async function optional<T>(path: string, fallback: T, query?: Record<string, string | number>) {
  try {
    const r = await getSource().get<T>(path, query);
    return r.status < 400 ? r.data : fallback;
  } catch {
    return fallback;
  }
}

async function loadPlayerUncached(accountId: number): Promise<PlayerData> {
  const api = getSource();
  const id = String(accountId);
  // Esenciales: historial y rango. Su estado decide si el perfil se puede mostrar.
  const [history, rank] = await Promise.all([
    api.get<MatchHistoryRow[]>(`/v1/players/${id}/match-history`).catch(() => ({ status: 500, data: [] as MatchHistoryRow[] })),
    api.get<PlayerRank>(`/v1/players/${id}/rank`).catch(() => ({ status: 500, data: undefined })),
  ]);
  const state = classifyStatuses([history.status, rank.status]);
  if (state !== "ok") return { state, accountId };

  const [steam, region, heroes, mates, enemies, builds] = await Promise.all([
    optional<SteamProfile[]>("/v1/players/steam", [], { account_ids: id }),
    optional<{ region?: string }>(`/v1/players/${id}/region`, {}),
    optional<PlayerHeroStat[]>("/v1/players/hero-stats", [], { account_ids: id }),
    optional<{ mate_id: number; wins: number; matches_played: number }[]>(`/v1/players/${id}/mate-stats`, []),
    optional<{ enemy_id: number; wins: number; matches_played: number }[]>(`/v1/players/${id}/enemy-stats`, []),
    optional<PlayerBuild[]>(`/v1/builds/by-author/${id}`, []),
  ]);

  return {
    state: "ok",
    accountId,
    profile: steam[0],
    rank: rank.data,
    region: region.region,
    history: history.data,
    summary: summarize(history.data),
    heroes,
    mates: mates.map((m) => ({ id: m.mate_id, wins: m.wins, matches: m.matches_played })),
    enemies: enemies.map((e) => ({ id: e.enemy_id, wins: e.wins, matches: e.matches_played })),
    builds,
  };
}

/** Nombres de Steam en lote (una sola llamada). Los ids sin perfil conocido simplemente no aparecen. */
export async function loadNames(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)].slice(0, 60);
  if (!unique.length) return new Map();
  const profiles = await optional<SteamProfile[]>("/v1/players/steam", [], { account_ids: unique.join(",") });
  return new Map(profiles.map((p) => [p.account_id, p.personaname]));
}

export async function searchPlayers(query: string): Promise<SearchResult[]> {
  const rows = await optional<SteamProfile[]>("/v1/players/steam-search", [], { search_query: query });
  return rows.map((p) => ({ id: p.account_id, name: p.personaname, matches30d: p.matches_played_last_30d ?? 0, url: p.profileurl }));
}

/** `steamcommunity.com/id/<vanity>`: se resuelve buscando y quedándose con el resultado cuya URL coincide exactamente. */
export async function resolveVanity(vanity: string): Promise<{ id: number | null; candidates: SearchResult[] }> {
  const candidates = await searchPlayers(vanity);
  const want = vanity.toLowerCase();
  const exact = candidates.find((c) => c.url.toLowerCase().replace(/\/$/, "").endsWith(`/id/${want}`));
  return { id: exact?.id ?? null, candidates };
}

/** Memoizado por petición: `generateMetadata` y la página comparten la misma carga sin repetir llamadas. */
export const loadPlayer = cache(loadPlayerUncached);
