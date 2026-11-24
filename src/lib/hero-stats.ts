// Lógica pura de la ficha de héroe (sin servidor ni red): lore, nivel, posición frente a los demás héroes, curva de daño y color.
import { normalizeAxis } from "@/lib/analytics";
import { unitsToMeters } from "@/lib/labels";
import type { Hero } from "@/lib/types";

/** El lore de la API trae `<br>` entre párrafos: se parte en párrafos de texto plano (sin etiquetas). */
export function splitLore(html: string | undefined): string[] {
  if (!html) return [];
  return html
    .split(/(?:<br\s*\/?>\s*){2,}|\n{2,}/i)
    .map((p) => p.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

// ---------- Niveles ----------

export const MAX_LEVEL = 36;
export type LevelStats = { level: number; souls: number; health: number; bulletDamage: number; dps: number; melee: number; spiritPower: number };

type LevelHero = Pick<Hero, "starting_stats" | "level_info" | "standard_level_up_upgrades">;
const UP = {
  health: "MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL",
  bullet: "MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL",
  melee: "MODIFIER_VALUE_BASE_MELEE_DAMAGE_FROM_LEVEL",
  spirit: "MODIFIER_VALUE_TECH_POWER",
} as const;

/** Número de niveles que trae la API para este héroe (36 en todos). */
export const levelCount = (h: Pick<Hero, "level_info">) => Math.max(1, Object.keys(h.level_info ?? {}).length || MAX_LEVEL);

/**
 * Estadísticas de un héroe en un nivel. APROXIMADO: suma de forma lineal la mejora por nivel de `standard_level_up_upgrades`
 * (nivel − 1 veces) a la estadística base; no incluye objetos ni mejoras de habilidades. `weapon` = datos del arma principal.
 */
export function statsAtLevel(h: LevelHero, weapon: { bullet_damage?: number; shots_per_second?: number; bullets?: number } | undefined, level: number): LevelStats {
  const n = Math.min(Math.max(1, Math.round(level)), levelCount(h));
  const up = h.standard_level_up_upgrades ?? {};
  const steps = n - 1;
  const bullet = (weapon?.bullet_damage ?? 0) + (up[UP.bullet] ?? 0) * steps;
  return {
    level: n,
    souls: h.level_info?.[String(n)]?.required_gold ?? 0,
    health: (h.starting_stats.max_health?.value ?? 0) + (up[UP.health] ?? 0) * steps,
    bulletDamage: bullet,
    dps: bullet * (weapon?.bullets ?? 1) * (weapon?.shots_per_second ?? 0),
    melee: (h.starting_stats.light_melee_damage?.value ?? 0) + (up[UP.melee] ?? 0) * steps,
    spiritPower: (up[UP.spirit] ?? 0) * steps,
  };
}

// ---------- Posición frente a los demás héroes ----------

export type StatPosition = {
  /** 1 = el valor más alto de todos los héroes. */
  rank: number;
  of: number;
  min: number;
  max: number;
  avg: number;
  /** 0..100 dentro del rango [mín, máx] (para la barra). */
  pct: number;
  /** Diferencia con la media, en %. */
  vsAvg: number;
};

/** Dónde queda `value` entre los valores de todos los héroes (`all` incluye el suyo). */
export function statPosition(value: number, all: number[]): StatPosition {
  const vals = all.filter((v) => Number.isFinite(v));
  const avg = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
  return {
    rank: 1 + vals.filter((v) => v > value).length,
    of: vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg,
    pct: normalizeAxis(value, vals),
    vsAvg: avg === 0 ? 0 : Math.round(((value - avg) / avg) * 1000) / 10,
  };
}

// ---------- Curva de daño del arma ----------

export type FalloffPoint = { m: number; scale: number };
type Weapon = { damage_falloff_start_range?: number; damage_falloff_end_range?: number; damage_falloff_start_scale?: number; damage_falloff_end_scale?: number; range?: number };

/**
 * Multiplicador de daño según la distancia (en metros). APROXIMADO: lineal entre el inicio y el fin de la caída (`start`→`end`) y
 * constante fuera de ese tramo, sin la curva exacta del motor (`damage_falloff_bias`).
 */
export function falloffCurve(w: Weapon | undefined, maxMeters = 40): FalloffPoint[] | null {
  if (!w || w.damage_falloff_start_range === undefined || w.damage_falloff_end_range === undefined) return null;
  const s = unitsToMeters(w.damage_falloff_start_range);
  const e = unitsToMeters(w.damage_falloff_end_range);
  const s0 = w.damage_falloff_start_scale ?? 1;
  const s1 = w.damage_falloff_end_scale ?? 1;
  const limit = Math.min(maxMeters, w.range ? unitsToMeters(w.range) : maxMeters);
  const at = (m: number) => (m <= s ? s0 : m >= e ? s1 : s0 + ((s1 - s0) * (m - s)) / Math.max(e - s, 1e-9));
  const marks = [...new Set([0, s, e, limit].filter((m) => m >= 0 && m <= limit))].sort((a, b) => a - b);
  return marks.map((m) => ({ m: Math.round(m * 100) / 100, scale: Math.round(at(m) * 1000) / 1000 }));
}

// ---------- Color propio ----------

/** Color `#RRGGBB` del héroe si es válido (viene de la API: se valida antes de pintarlo en estilos). */
export const heroAccent = (h: Pick<Hero, "colors">): string | undefined => (h.colors?.style_hex && /^#[0-9a-f]{6}$/i.test(h.colors.style_hex) ? h.colors.style_hex : undefined);
