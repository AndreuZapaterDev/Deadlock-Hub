import type { MatchHistoryRow } from "@/lib/types";

// Todo lo que sale del historial se calcula SOLO con lo que devuelve la API (no hay base de datos propia).

/** Gana quien tiene `player_team === match_result` (equipo ganador). `player_match_outcome` NO es victoria/derrota: toma valores 0-5. */
export const isWin = (m: Pick<MatchHistoryRow, "match_result" | "player_team">) => m.match_result === m.player_team;

export type Summary = { matches: number; wins: number; winRate: number; kda: number; soulsPerMin: number; avgDuration: number };

export function summarize(history: MatchHistoryRow[]): Summary {
  const n = history.length;
  if (!n) return { matches: 0, wins: 0, winRate: 0, kda: 0, soulsPerMin: 0, avgDuration: 0 };
  let wins = 0, k = 0, d = 0, a = 0, souls = 0, secs = 0;
  for (const m of history) {
    if (isWin(m)) wins++;
    k += m.player_kills; d += m.player_deaths; a += m.player_assists; souls += m.net_worth; secs += m.match_duration_s;
  }
  return { matches: n, wins, winRate: wins / n, kda: (k + a) / Math.max(d, 1), soulsPerMin: secs ? souls / (secs / 60) : 0, avgDuration: secs / n };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const dayLabel = (unix: number) => {
  const d = new Date(unix * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};
const monthLabel = (unix: number) => {
  const d = new Date(unix * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
};
const chronological = (h: MatchHistoryRow[]) => [...h].sort((x, y) => x.start_time - y.start_time);

/** Win rate acumulado (en %) partida a partida, muestreado en `points` puntos. */
export function cumulativeWinRate(history: MatchHistoryRow[], points = 80, minMatches = 30): { label: string; value: number }[] {
  const c = chronological(history);
  if (!c.length) return [];
  const out: { label: string; value: number }[] = [];
  let wins = 0;
  const step = Math.max(1, Math.floor(c.length / points));
  // las primeras partidas dan un % que salta de 0 a 100: no se dibujan hasta tener una muestra mínima (si el historial es corto, todas)
  const from = c.length < minMatches * 2 ? 1 : minMatches;
  c.forEach((m, i) => {
    if (isWin(m)) wins++;
    if (i + 1 >= from && (i % step === 0 || i === c.length - 1)) out.push({ label: monthLabel(m.start_time), value: Number(((wins / (i + 1)) * 100).toFixed(1)) });
  });
  return out;
}

/** Partidas por día en los últimos `days` días contando desde la partida más reciente (UTC). */
export function matchesPerDay(history: MatchHistoryRow[], days = 30): { name: string; value: number }[] {
  if (!history.length) return [];
  const DAY = 86400;
  const last = Math.floor(Math.max(...history.map((m) => m.start_time)) / DAY);
  const counts = new Map<number, number>();
  for (const m of history) {
    const day = Math.floor(m.start_time / DAY);
    if (day > last - days) counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = last - days + 1 + i;
    const dt = new Date(day * DAY * 1000);
    return { name: `${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}`, value: counts.get(day) ?? 0 };
  });
}

/** `badge = tier*10 + subrango` (ver DATA_REPORT.md). */
export const badgeToRank = (badge: number) => ({ tier: Math.floor(badge / 10), sub: badge % 10 });

/**
 * Evolución del rango SOLO con las partidas que traen `ranked_display_badge` (no es todo el historial).
 * y = tier + (subrango-1)/6, para que cada rango ocupe una unidad entera.
 */
export function rankSeries(history: MatchHistoryRow[]): { label: string; value: number }[] {
  return chronological(history)
    .filter((m) => m.ranked_display_badge)
    .map((m) => {
      const { tier, sub } = badgeToRank(m.ranked_display_badge!);
      return { label: dayLabel(m.start_time), value: Number((tier + (Math.max(sub, 1) - 1) / 6).toFixed(2)) };
    });
}

export type ProfileState = "ok" | "private" | "notfound" | "busy" | "error";

/**
 * Estado del perfil a partir de los códigos HTTP de las llamadas esenciales.
 * 403 → privado o protegido; 429/503/504 → API ocupada (se avisa, no se rompe); 404 → no existe.
 */
export function classifyStatuses(statuses: number[]): ProfileState {
  if (statuses.some((s) => s === 403)) return "private";
  if (statuses.some((s) => s === 429 || s === 503 || s === 504)) return "busy";
  if (statuses.some((s) => s === 404)) return "notfound";
  if (statuses.some((s) => s >= 400)) return "error";
  return "ok";
}

// Los modos vienen como enteros: son el índice de los enums `ActiveMatchMode` y `ActiveMatchGameMode` del OpenAPI.
export const MATCH_MODE: Record<number, string> = {
  1: "Partida normal", 2: "Sala privada", 3: "Contra bots", 4: "Ranked", 5: "Prueba de servidor", 6: "Tutorial", 7: "Laboratorio de héroes", 8: "Colocación",
};
export const GAME_MODE: Record<number, string> = { 1: "Normal", 3: "Sandbox", 4: "Street Brawl", 5: "Explorar Nueva York" };
export const matchModeLabel = (n?: number | null) => (n != null ? MATCH_MODE[n] ?? `Modo ${n}` : "—");
export const gameModeLabel = (n?: number | null) => (n != null ? GAME_MODE[n] ?? `Modo ${n}` : "—");
