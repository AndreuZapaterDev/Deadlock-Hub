// Comparador automático de parches: dos versiones de la lista de héroes u objetos → qué números han cambiado.
// Función pura (sin red ni disco) para poder testearla; la carga de datos está en patch-data.ts.

export type Direction = "buff" | "nerf" | "neutral";
export type Scalar = number | string | boolean;
export type FieldChange = {
  path: string;
  label: string;
  old?: Scalar;
  new?: Scalar;
  /** Variación en % (solo si los dos valores son números y el antiguo no es 0). */
  pct?: number;
  direction: Direction;
};
export type EntityRef = { id: number | string; name: string };
export type EntityChange = EntityRef & { changes: FieldChange[]; direction: Direction };
export type AssetDiff = { added: EntityRef[]; removed: EntityRef[]; changed: EntityChange[] };

/** Campos que cambian entre versiones sin ser un cambio de equilibrio: ids internos, rutas, imágenes, depuración. */
const IGNORED_KEYS = new Set([
  "id", "class_name", "subclass_name", "image", "image_webp", "shop_image", "shop_image_webp", "images", "models", "icon", "icons",
  "colors", "sounds", "css_class", "scale_function", "display_stat_name", "can_set_token_override", "disable_value", "shop_version",
  "development_state", "in_development", "needs_testing", "prerelease_only", "limited_testing", "search_name", "hideout_rich_presence",
  "skin", "item_draft_bucketing", "shop_stat_display", "stats_display", "hero_stats_ui", "display_stats", "hero_type", "gun_tag", "gender", "popular_items", "heroes", "tooltip_sections", "description", "loc_string", "item_slot_info",
]);

/** Si SUBE el valor y es mejor (daño, vida…) o si BAJAR es mejor (enfriamiento, coste…). Lo que no está aquí es "neutral". */
const LOWER_IS_BETTER = /cooldown|cost|spread|delay|cast_?time|channel_?time|recoil|reload|wind_?up|penalty|recovery|slow/i;
const HIGHER_IS_BETTER = /damage|health|heal|speed|range|radius|clip|ammo|regen|resist|bonus|power|crit|lifesteal|rate|armor|shield|accuracy|charges|duration|capacity|stamina|sprint/i;

export function directionFor(path: string, change: { old?: Scalar; new?: Scalar }): Direction {
  if (typeof change.old !== "number" || typeof change.new !== "number" || change.old === change.new) return "neutral";
  const key = path.split(".").filter((s) => s !== "value").pop() ?? path;
  const up = change.new > change.old;
  if (LOWER_IS_BETTER.test(key)) return up ? "nerf" : "buff";
  if (HIGHER_IS_BETTER.test(key)) return up ? "buff" : "nerf";
  return "neutral";
}

/** "AbilityCooldown" / "max_move_speed" → "Ability Cooldown" / "Max Move Speed". */
export function humanize(path: string): string {
  const parts = path.split(".").filter((s) => s !== "value" && !/^\d+$/.test(s));
  const last = parts.slice(-2).join(" · ") || path;
  return last.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase());
}


/** Aplana un objeto a `ruta → valor`. Los números escritos como texto ("0.5") se leen como número. */
export function flatten(value: unknown, prefix = "", out: Map<string, Scalar> = new Map()): Map<string, Scalar> {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, prefix ? `${prefix}.${i}` : String(i), out));
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (IGNORED_KEYS.has(k)) continue;
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (typeof value === "number" || typeof value === "boolean") {
    out.set(prefix, value);
  } else if (typeof value === "string") {
    // Solo números (también los escritos como texto): los textos traducidos y las listas de nombres de estadística cambian de orden o de idioma sin ser un cambio de equilibrio.
    if (value.trim() !== "" && Number.isFinite(Number(value))) out.set(prefix, Number(value));
  }
  return out;
}

const round = (n: number) => Math.round(n * 10) / 10;

export function diffEntity(oldE: unknown, newE: unknown): FieldChange[] {
  const a = flatten(oldE);
  const b = flatten(newE);
  const changes: FieldChange[] = [];
  for (const path of new Set([...a.keys(), ...b.keys()])) {
    const o = a.get(path);
    const n = b.get(path);
    if (o === n) continue;
    const change: FieldChange = { path, label: humanize(path), old: o, new: n, direction: "neutral" };
    if (typeof o === "number" && typeof n === "number") {
      if (o !== 0) change.pct = round(((n - o) / Math.abs(o)) * 100);
      change.direction = directionFor(path, change);
    }
    changes.push(change);
  }
  return changes;
}

/** Dirección global de una entidad: buff si todos sus cambios con dirección son buffs, nerf si todos nerfs y neutral si hay mezcla. */
export function overallDirection(changes: FieldChange[]): Direction {
  const dirs = new Set(changes.map((c) => c.direction).filter((d) => d !== "neutral"));
  return dirs.size === 1 ? [...dirs][0] : "neutral";
}

/**
 * Compara dos listas de entidades (héroes u objetos) por `id`. Devuelve las añadidas, las eliminadas y, de las que están
 * en las dos, los campos que cambian (ignorando ids internos, rutas y campos de depuración).
 */
export function diffAssets<T extends { id: number | string; name?: string }>(oldList: T[], newList: T[]): AssetDiff {
  const oldMap = new Map(oldList.map((e) => [e.id, e]));
  const newMap = new Map(newList.map((e) => [e.id, e]));
  const ref = (e: T): EntityRef => ({ id: e.id, name: e.name ?? String(e.id) });
  const changed: EntityChange[] = [];
  for (const [id, n] of newMap) {
    const o = oldMap.get(id);
    if (!o) continue;
    const changes = diffEntity(o, n);
    if (changes.length) changed.push({ ...ref(n), changes, direction: overallDirection(changes) });
  }
  return {
    added: newList.filter((e) => !oldMap.has(e.id)).map(ref),
    removed: oldList.filter((e) => !newMap.has(e.id)).map(ref),
    changed,
  };
}

export const emptyDiff = (): AssetDiff => ({ added: [], removed: [], changed: [] });
