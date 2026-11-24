// Cálculos de meta y estadísticas. Funciones puras (sin red ni servidor) para poder probarlas.

/** Peso del "prior" del win rate ajustado: equivale a añadir esta cantidad de partidas ficticias al 50 %. */
export const PRIOR_MATCHES = 1000;
export const PLAYERS_PER_MATCH = 12;

export const winRate = (wins: number, matches: number) => (matches > 0 ? wins / matches : 0);

/**
 * Win rate ajustado por tamaño de muestra: `(victorias + k·0,5) / (partidas + k)`.
 * Con pocas partidas se acerca al 50 % (un 3/3 no es un 100 %); con millones apenas cambia.
 */
export const adjustedWinRate = (wins: number, matches: number, k = PRIOR_MATCHES) => (wins + 0.5 * k) / (matches + k);

export const kda = (kills: number, deaths: number, assists: number) => (kills + assists) / Math.max(deaths, 1);

/**
 * `hero-stats` cuenta partidas-jugador (cada partida suma 12 filas). Pick rate = % de partidas en las que sale el héroe
 * = partidas del héroe / (total de partidas-jugador / 12).
 */
export const pickRate = (heroMatches: number, totalHeroMatches: number) =>
  totalHeroMatches > 0 ? heroMatches / (totalHeroMatches / PLAYERS_PER_MATCH) : 0;

export const banRate = (bans: number, matches: number) => (matches > 0 ? bans / matches : 0);

// ---------- Tiers ----------
export type Tier = "S" | "A" | "B" | "C" | "D";
export const TIERS: Tier[] = ["S", "A", "B", "C", "D"];
/** Cortes acumulados por posición en el ranking: S = 10 % mejor, A = siguiente 20 %, B = 40 %, C = 20 %, D = 10 % peor. */
export const TIER_CUTS = [0.1, 0.3, 0.7, 0.9] as const;

/** Ordena por `score` (mayor primero) y asigna tier por posición. Se reparte por percentil para que siempre haya de todo. */
export function assignTiers<T extends { score: number }>(rows: T[]): (T & { tier: Tier; rank: number })[] {
  const n = rows.length;
  const cuts = TIER_CUTS.map((p, i) => (i === 0 ? Math.max(1, Math.round(p * n)) : Math.round(p * n))); // siempre hay al menos un S
  return [...rows]
    .sort((a, b) => b.score - a.score)
    .map((r, i) => {
      const cut = cuts.findIndex((c) => i < c);
      return { ...r, rank: i + 1, tier: TIERS[cut === -1 ? 4 : cut] };
    });
}

// ---------- Counters y sinergias ----------
export type Counter = { hero_id: number; enemy_hero_id: number; wins: number; matches_played: number };
export type Synergy = { hero_id1: number; hero_id2: number; wins: number; matches_played: number };

export type Matchup = { wins: number; matches: number; rate: number };

/** Win rate de `a` cuando juega contra `b`. */
export function matchup(counters: Counter[], a: number, b: number): Matchup | null {
  const c = counters.find((x) => x.hero_id === a && x.enemy_hero_id === b);
  return c ? { wins: c.wins, matches: c.matches_played, rate: winRate(c.wins, c.matches_played) } : null;
}

/** Rivales de `heroId` ordenados por win rate (`strong`: contra quién gana más; `weak`: contra quién pierde más). */
export function rankMatchups(counters: Counter[], heroId: number, mode: "strong" | "weak", n = 5, minMatches = 1000) {
  const rows = counters
    .filter((c) => c.hero_id === heroId && c.matches_played >= minMatches)
    .map((c) => ({ id: c.enemy_hero_id, matches: c.matches_played, rate: winRate(c.wins, c.matches_played) }));
  return rows.sort((a, b) => (mode === "strong" ? b.rate - a.rate : a.rate - b.rate)).slice(0, n);
}

/** Compañeros de equipo de `heroId` con mejor win rate juntos (la tabla guarda cada pareja una sola vez, con id1 < id2). */
export function bestPartners(synergy: Synergy[], heroId: number, n = 5, minMatches = 1000) {
  return synergy
    .filter((s) => (s.hero_id1 === heroId || s.hero_id2 === heroId) && s.matches_played >= minMatches)
    .map((s) => ({ id: s.hero_id1 === heroId ? s.hero_id2 : s.hero_id1, matches: s.matches_played, rate: winRate(s.wins, s.matches_played) }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, n);
}

/** Win rate de la pareja `a`+`b` (simétrico). */
export function pairRate(synergy: Synergy[], a: number, b: number): Matchup | null {
  const [x, y] = a < b ? [a, b] : [b, a];
  const s = synergy.find((r) => r.hero_id1 === x && r.hero_id2 === y);
  return s ? { wins: s.wins, matches: s.matches_played, rate: winRate(s.wins, s.matches_played) } : null;
}

// ---------- Comparador: radar ----------
/** Escala min-max a 0-100 entre TODOS los héroes. Si todos valen lo mismo, 50. */
export function normalizeAxis(value: number, all: number[]): number {
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  return hi === lo ? 50 : Math.round(((value - lo) / (hi - lo)) * 100);
}
