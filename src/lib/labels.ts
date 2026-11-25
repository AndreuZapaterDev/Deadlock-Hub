// Etiquetas de la interfaz: viven en los mensajes (namespace «labels»). Los textos del propio juego se muestran tal cual vienen de la API.

/** Traductor con el namespace «labels» ya aplicado (`getTranslations("labels")` o `useTranslations("labels")`). */
export type Tr = (key: string, values?: Record<string, string | number>) => string;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const HERO_TYPES = ["mystic", "marksman", "brawler", "healer", "assassin"] as const;
export const heroTypeLabel = (t: Tr, type: string) => ((HERO_TYPES as readonly string[]).includes(type) ? t(`type${cap(type)}`) : type);

export const DIFFICULTIES = [1, 2, 3, 4] as const;
export const difficultyLabel = (t: Tr, n: number) => ((DIFFICULTIES as readonly number[]).includes(n) ? t(`diff${n}`) : String(n));

/** Estadísticas base de un héroe (claves de `starting_stats`) con su unidad y decimales; la etiqueta es `labels.stat_<key>`. */
export const HERO_STATS: { key: string; unit?: string; digits?: number }[] = [
  { key: "max_health" },
  { key: "base_health_regen", unit: "/s", digits: 1 },
  { key: "max_move_speed", unit: " m/s", digits: 1 },
  { key: "sprint_speed", unit: " m/s", digits: 1 },
  { key: "crouch_speed", unit: " m/s", digits: 1 },
  { key: "stamina" },
  { key: "stamina_regen_per_second", unit: "/s", digits: 2 },
  { key: "light_melee_damage" },
  { key: "heavy_melee_damage" },
  { key: "reload_speed", unit: "×", digits: 2 },
  { key: "ground_dash_distance_in_meters", unit: " m", digits: 0 },
  { key: "air_dash_distance_in_meters", unit: " m", digits: 0 },
];

/** 1 m = 39,37 unidades del motor. Los alcances de armas vienen en unidades. */
export const unitsToMeters = (u: number) => u / 39.37;

/** "AbilityCastRange" → "Ability Cast Range" (solo si la API no trae etiqueta). */
export const humanize = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");

export const sectionLabel = (t: Tr, key: string) => (["innate", "active", "passive"].includes(key) ? t(`section${cap(key)}`) : key);
