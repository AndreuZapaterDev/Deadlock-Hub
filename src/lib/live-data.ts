import "server-only";
import { getHeroImages, getHeroNames } from "@/lib/lookup";
import { fetchData } from "@/lib/meta-data";

export type LiveHero = { id: number; name: string; img?: string };
export type LiveMatch = {
  id: number;
  startTime: number;
  spectators: number;
  mode: string;
  /** Ids de héroe de cada equipo; el nombre y la imagen están una sola vez en `LiveData.heroes`. */
  teams: [number[], number[]];
  netWorth: [number, number];
  /** Enlace de retransmisión de Steam, si existe. */
  broadcast?: string;
};
export type LiveData = { ok: true; now: number; matches: LiveMatch[]; heroes: Record<number, LiveHero> } | { ok: false; status: number };

type RawActive = {
  match_id: number;
  start_time: number;
  spectators: number;
  match_mode_parsed?: string;
  game_mode_parsed?: string;
  net_worth_team_0: number;
  net_worth_team_1: number;
  players: { team: number; hero_id: number }[];
};

/** Clave del modo (la interfaz la traduce con «live.mode<Clave>»); si la API trae uno desconocido, se devuelve tal cual. */
const MODE: Record<string, string> = { Unranked: "Normal", Ranked: "Ranked", PrivateLobby: "Private", Casual: "Casual" };
export function modeLabel(r: Pick<RawActive, "match_mode_parsed" | "game_mode_parsed">) {
  if (r.game_mode_parsed?.includes("StreetBrawl")) return "StreetBrawl";
  return MODE[r.match_mode_parsed ?? ""] ?? r.match_mode_parsed ?? "Normal";
}

/** Partidas en curso, ya reducidas a lo que pinta la interfaz (el navegador nunca ve la respuesta cruda de la API). */
export async function loadLive(): Promise<LiveData> {
  const active = await fetchData<RawActive[]>("/v1/matches/active");
  if (!active.ok) return active;
  const [names, images, urls] = await Promise.all([
    getHeroNames(),
    getHeroImages(),
    fetchData<{ match_id: number; broadcast_url: string }[]>("/v1/matches/live/urls"),
  ]);
  const broadcast = new Map((urls.ok ? urls.data : []).map((u) => [u.match_id, u.broadcast_url]));
  // Un diccionario con cada héroe una sola vez: 150 partidas × 12 héroes con su URL de imagen repetida pesaban ~900 kB de HTML.
  const heroes: Record<number, LiveHero> = {};
  const hero = (id: number): number => {
    heroes[id] ??= { id, name: names.get(id) ?? `#${id}`, img: images.get(id)?.small };
    return id;
  };

  const matches = active.data.map<LiveMatch>((m) => ({
    id: m.match_id,
    startTime: m.start_time,
    spectators: m.spectators ?? 0,
    mode: modeLabel(m),
    teams: [m.players.filter((p) => p.team === 0).map((p) => hero(p.hero_id)), m.players.filter((p) => p.team === 1).map((p) => hero(p.hero_id))],
    netWorth: [m.net_worth_team_0 ?? 0, m.net_worth_team_1 ?? 0],
    broadcast: broadcast.get(m.match_id),
  }));
  return { ok: true, now: Math.floor(Date.now() / 1000), matches, heroes };
}
