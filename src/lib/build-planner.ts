// Cálculos del build planner. Funciones puras (sin red ni servidor) para poder probarlas y usarlas en el cliente.
//
// APROXIMADO: solo se suman las bonificaciones FIJAS de cada objeto (las de su sección "innate" en `tooltip_sections`).
// Los efectos activos y pasivos condicionales (p. ej. "daño extra a corta distancia"), las mejoras de habilidades y el
// escalado por nivel NO entran. Es una orientación para comparar builds, no una copia exacta del cálculo del juego.

import type { Item } from "@/lib/types";

export type Category = "weapon" | "vitality" | "spirit";

/**
 * Máximo de objetos por categoría. Sale de `hero.item_slot_info[cat].max_purchases_for_tier` (6 en todos los héroes de los datos).
 * El significado exacto de ese campo no está documentado: puede no coincidir con los huecos reales del juego.
 */
export const MAX_PER_CATEGORY = 6;

export type EffectKey =
  | "health" | "healthPct" | "regen" | "weaponDmg" | "fireRate" | "clip" | "bulletLifesteal" | "melee"
  | "spirit" | "bulletResist" | "spiritResist" | "meleeResist" | "sprint" | "move" | "stamina"
  | "abilityRange" | "abilityDuration" | "cdr" | "spiritLifesteal" | "debuffResist";
export type Effects = Partial<Record<EffectKey, number>>;

/** Clave de propiedad de la API → efecto que se suma. Las que no están aquí se cuentan como "sin interpretar". */
export const PROPERTY_EFFECT: Record<string, EffectKey> = {
  BonusHealth: "health",
  MaxHealthLossPercent: "healthPct",
  OutOfCombatHealthRegen: "regen",
  BonusHealthRegen: "regen",
  BaseAttackDamagePercent: "weaponDmg",
  BonusFireRate: "fireRate",
  BonusClipSizePercent: "clip",
  BulletLifestealPercent: "bulletLifesteal",
  BonusMeleeDamagePercent: "melee",
  TechPower: "spirit",
  SpiritPower: "spirit",
  SpiritPowerInnate: "spirit",
  BulletResist: "bulletResist",
  TechResist: "spiritResist",
  MeleeResistPercent: "meleeResist",
  BonusSprintSpeed: "sprint",
  BonusMoveSpeed: "move",
  Stamina: "stamina",
  TechRangeMultiplier: "abilityRange",
  BonusAbilityDurationPercent: "abilityDuration",
  CooldownReduction: "cdr",
  AbilityLifestealPercentHero: "spiritLifesteal",
  AbilityLifestealPercentHeroPassive: "spiritLifesteal",
  StatusResistancePercent: "debuffResist",
  InnateStatusResistancePercent: "debuffResist",
};

/** La API a veces trae la unidad dentro del valor ("0.75m", "8%"): `parseFloat` se queda con el número. */
const num = (v: unknown) => {
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

/** Bonificaciones fijas de un objeto, ya traducidas a efectos. `unknown` cuenta las propiedades fijas sin interpretar. */
export function itemEffects(item: Item): { effects: Effects; unknown: number; hasInnate: boolean } {
  const effects: Effects = {};
  let unknown = 0;
  const innate = (item.tooltip_sections ?? []).filter((s) => s.section_type === "innate");
  for (const s of innate) {
    for (const a of s.section_attributes) {
      for (const key of new Set([...(a.elevated_properties ?? []), ...(a.properties ?? [])])) {
        const value = num(item.properties?.[key]?.value);
        if (value === 0) continue;
        const effect = PROPERTY_EFFECT[key];
        if (!effect) { unknown++; continue; }
        effects[effect] = (effects[effect] ?? 0) + value;
      }
    }
  }
  return { effects, unknown, hasInnate: innate.length > 0 };
}

export type BaseStats = {
  health: number;
  regen: number;
  move: number;
  sprint: number;
  stamina: number;
  dps: number;
  bulletDamage: number;
  shotsPerSecond: number;
  clip: number;
};

export type StatRow = { key: string; label: string; base: number; total: number; unit: string; digits: number };

const sum = (list: Effects[], k: EffectKey) => list.reduce((a, e) => a + (e[k] ?? 0), 0);
/** Las resistencias se combinan multiplicando lo que NO bloquean: 1 − Π(1 − r/100). Dos de 20 % dan 36 %, no 40 %. */
const stackResist = (list: Effects[], k: EffectKey) => (1 - list.reduce((a, e) => a * (1 - (e[k] ?? 0) / 100), 1)) * 100;

/**
 * Estadísticas resultantes de un héroe con una lista de objetos.
 * - Vida = (base + fija) × (1 + % de vida).
 * - Daño por bala = base × (1 + % daño de arma); disparos/s = base × (1 + % cadencia); DPS = producto de ambos.
 * - Las resistencias se apilan multiplicando (ver `stackResist`).
 * - El resto se suma.
 */
export function computeBuild(base: BaseStats, list: Effects[]): StatRow[] {
  const dmg = 1 + sum(list, "weaponDmg") / 100;
  const rate = 1 + sum(list, "fireRate") / 100;
  const hp = (base.health + sum(list, "health")) * (1 + sum(list, "healthPct") / 100);
  const rows: StatRow[] = [
    { key: "health", label: "Vida", base: base.health, total: hp, unit: "", digits: 0 },
    { key: "regen", label: "Regeneración de vida", base: base.regen, total: base.regen + sum(list, "regen"), unit: "/s", digits: 1 },
    { key: "dps", label: "Daño por segundo del arma", base: base.dps, total: base.dps * dmg * rate, unit: "", digits: 1 },
    { key: "bullet", label: "Daño por bala", base: base.bulletDamage, total: base.bulletDamage * dmg, unit: "", digits: 1 },
    { key: "sps", label: "Disparos por segundo", base: base.shotsPerSecond, total: base.shotsPerSecond * rate, unit: "", digits: 2 },
    { key: "clip", label: "Cargador", base: base.clip, total: Math.round(base.clip * (1 + sum(list, "clip") / 100)), unit: "", digits: 0 },
    { key: "spirit", label: "Poder espiritual", base: 0, total: sum(list, "spirit"), unit: "", digits: 0 },
    { key: "bulletResist", label: "Resistencia a balas", base: 0, total: stackResist(list, "bulletResist"), unit: " %", digits: 1 },
    { key: "spiritResist", label: "Resistencia espiritual", base: 0, total: stackResist(list, "spiritResist"), unit: " %", digits: 1 },
    { key: "meleeResist", label: "Resistencia cuerpo a cuerpo", base: 0, total: stackResist(list, "meleeResist"), unit: " %", digits: 1 },
    { key: "move", label: "Velocidad de movimiento", base: base.move, total: base.move + sum(list, "move"), unit: " m/s", digits: 2 },
    { key: "sprint", label: "Bonus de carrera", base: base.sprint, total: base.sprint + sum(list, "sprint"), unit: " m/s", digits: 2 },
    { key: "stamina", label: "Resistencia (cargas)", base: base.stamina, total: base.stamina + sum(list, "stamina"), unit: "", digits: 0 },
    { key: "melee", label: "Daño cuerpo a cuerpo", base: 0, total: sum(list, "melee"), unit: " %", digits: 0 },
    { key: "bulletLifesteal", label: "Robo de vida con balas", base: 0, total: sum(list, "bulletLifesteal"), unit: " %", digits: 0 },
    { key: "spiritLifesteal", label: "Robo de vida espiritual", base: 0, total: sum(list, "spiritLifesteal"), unit: " %", digits: 0 },
    { key: "abilityRange", label: "Alcance de habilidades", base: 0, total: sum(list, "abilityRange"), unit: " %", digits: 0 },
    { key: "abilityDuration", label: "Duración de habilidades", base: 0, total: sum(list, "abilityDuration"), unit: " %", digits: 0 },
    { key: "cdr", label: "Reducción de enfriamiento", base: 0, total: sum(list, "cdr"), unit: " %", digits: 0 },
    { key: "debuffResist", label: "Resistencia a debilitadores", base: 0, total: sum(list, "debuffResist"), unit: " %", digits: 0 },
  ];
  return rows;
}

/** Filas que se muestran siempre aunque no cambien (las demás solo si algún objeto las modifica). */
export const CORE_ROWS = new Set(["health", "dps", "spirit", "bulletResist", "spiritResist"]);

export type Cost = { total: number; byCategory: Record<Category, number>; steps: number[] };

/** Coste total, por categoría y acumulado tras cada compra (en orden de compra). */
export function costSummary(items: { cat: Category; cost: number }[]): Cost {
  const byCategory: Record<Category, number> = { weapon: 0, vitality: 0, spirit: 0 };
  const steps: number[] = [];
  let acc = 0;
  for (const i of items) {
    byCategory[i.cat] += i.cost;
    acc += i.cost;
    steps.push(acc);
  }
  return { total: acc, byCategory, steps };
}

// ---------- Estado compartible por URL ----------

/** `?h=infernus&i=upgrade_a,upgrade_b` (el orden de `i` es el orden de compra). */
export function encodeBuild(hero: string | undefined, items: string[]): string {
  const q = new URLSearchParams();
  if (hero) q.set("h", hero);
  if (items.length) q.set("i", items.join(","));
  return q.toString();
}

/**
 * Lee el estado de la URL y lo valida contra el catálogo: los objetos desconocidos, los repetidos y los que pasan del máximo
 * por categoría se descartan en vez de romper. Un enlace viejo o manipulado siempre produce un estado válido.
 */
export function decodeBuild(sp: { h?: string; i?: string }, catalog: Map<string, { cat: Category }>, heroes: Set<string>): { hero?: string; items: string[] } {
  const hero = sp.h && heroes.has(sp.h) ? sp.h : undefined;
  const counts: Record<Category, number> = { weapon: 0, vitality: 0, spirit: 0 };
  const items: string[] = [];
  for (const c of (sp.i ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const entry = catalog.get(c);
    if (!entry || items.includes(c) || counts[entry.cat] >= MAX_PER_CATEGORY) continue;
    counts[entry.cat]++;
    items.push(c);
  }
  return { hero, items };
}

/** Quita un objeto, o lo mueve una posición (−1 hacia arriba, +1 hacia abajo). Devuelve una lista nueva. */
export function moveItem(items: string[], index: number, dir: -1 | 1): string[] {
  const to = index + dir;
  if (index < 0 || index >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}

// ---------- Datos compactos que el servidor pasa al planner (cliente) ----------
export type PlannerItem = { c: string; n: string; cat: Category; tier: number; cost: number; active: boolean; fx: Effects; unknown: number; innate: boolean };
export type PlannerHero = { slug: string; name: string; base: BaseStats };

export const EFFECT_LABEL: Record<EffectKey, { label: string; unit: string }> = {
  health: { label: "vida", unit: "" }, healthPct: { label: "vida máxima", unit: " %" }, regen: { label: "regeneración", unit: "/s" },
  weaponDmg: { label: "daño de arma", unit: " %" }, fireRate: { label: "cadencia", unit: " %" }, clip: { label: "cargador", unit: " %" },
  bulletLifesteal: { label: "robo de vida (balas)", unit: " %" }, melee: { label: "daño cuerpo a cuerpo", unit: " %" },
  spirit: { label: "poder espiritual", unit: "" }, bulletResist: { label: "resist. balas", unit: " %" }, spiritResist: { label: "resist. espiritual", unit: " %" },
  meleeResist: { label: "resist. cuerpo a cuerpo", unit: " %" }, sprint: { label: "carrera", unit: " m/s" }, move: { label: "movimiento", unit: " m/s" },
  stamina: { label: "resistencia", unit: "" }, abilityRange: { label: "alcance de habilidades", unit: " %" }, abilityDuration: { label: "duración de habilidades", unit: " %" },
  cdr: { label: "reducción de enfriamiento", unit: " %" }, spiritLifesteal: { label: "robo de vida (espiritual)", unit: " %" }, debuffResist: { label: "resist. a debilitadores", unit: " %" },
};

/** "+125 vida · +8 % daño de arma": los `max` efectos más grandes de un objeto, para la lista del selector. */
export function describeEffects(fx: Effects, max = 3): string {
  return (Object.entries(fx) as [EffectKey, number][])
    .filter(([, v]) => v !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, max)
    .map(([k, v]) => `${v > 0 ? "+" : "−"}${Math.abs(Math.round(v * 100) / 100)}${EFFECT_LABEL[k].unit} ${EFFECT_LABEL[k].label}`)
    .join(" · ");
}
