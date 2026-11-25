import { adjustedWinRate, winRate } from "@/lib/analytics";

// Cálculos de la página de meta. Funciones puras (sin red) para poder probarlas.

type Sample = { wins: number; matches: number };

/**
 * Mínimo de partidas para que una fila cuente: una fracción de la fila más jugada, con un suelo. Es relativo a propósito:
 * con filtros (un rango, un parche) todos los volúmenes bajan y un mínimo fijo dejaría las tablas vacías.
 */
export function sampleFloor(rows: { matches: number }[], share = 0.05, floor = 200): number {
  const max = rows.reduce((m, r) => Math.max(m, r.matches), 0);
  return Math.max(floor, Math.round(max * share));
}

/** Filas con muestra suficiente, con win rate bruto y ajustado, ordenadas por el ajustado (`strong` mayor primero, `weak` menor primero). */
export function rankSamples<T extends Sample>(rows: T[], mode: "strong" | "weak", n: number, minMatches: number, k?: number) {
  return rows
    .filter((r) => r.matches >= minMatches)
    .map((r) => ({ ...r, rate: winRate(r.wins, r.matches), adjusted: adjustedWinRate(r.wins, r.matches, k) }))
    .sort((a, b) => (mode === "strong" ? b.adjusted - a.adjusted : a.adjusted - b.adjusted))
    .slice(0, n);
}

/** Cuota de uso: partidas en las que aparece sobre el total de partidas. 0 si no hay total. */
export const usageShare = (matches: number, totalMatches: number) => (totalMatches > 0 ? Math.min(1, matches / totalMatches) : 0);
