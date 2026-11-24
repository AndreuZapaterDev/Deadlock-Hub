// Textos de la interfaz en español. Los textos del propio juego (nombres, descripciones) se muestran tal cual vienen de la API.

export const HERO_TYPE: Record<string, string> = {
  mystic: "Místico", marksman: "Tirador", brawler: "Luchador", healer: "Sanador", assassin: "Asesino",
};
export const heroTypeLabel = (t: string) => HERO_TYPE[t] ?? t;

export const DIFFICULTY: Record<number, string> = { 1: "Fácil", 2: "Media", 3: "Difícil", 4: "Muy difícil" };
export const difficultyLabel = (n: number) => DIFFICULTY[n] ?? String(n);

/** Estadísticas base de un héroe (claves de `starting_stats`) con su etiqueta, unidad y decimales. */
export const HERO_STATS: { key: string; label: string; unit?: string; digits?: number }[] = [
  { key: "max_health", label: "Vida" },
  { key: "base_health_regen", label: "Regeneración de vida", unit: "/s", digits: 1 },
  { key: "max_move_speed", label: "Velocidad de movimiento", unit: " m/s", digits: 1 },
  { key: "sprint_speed", label: "Bonus de carrera", unit: " m/s", digits: 1 },
  { key: "crouch_speed", label: "Velocidad agachado", unit: " m/s", digits: 1 },
  { key: "stamina", label: "Resistencia (cargas)" },
  { key: "stamina_regen_per_second", label: "Recarga de resistencia", unit: "/s", digits: 2 },
  { key: "light_melee_damage", label: "Daño cuerpo a cuerpo ligero" },
  { key: "heavy_melee_damage", label: "Daño cuerpo a cuerpo pesado" },
  { key: "reload_speed", label: "Velocidad de recarga", unit: "×", digits: 2 },
  { key: "ground_dash_distance_in_meters", label: "Impulso en suelo", unit: " m", digits: 0 },
  { key: "air_dash_distance_in_meters", label: "Impulso en el aire", unit: " m", digits: 0 },
];

/** 1 m = 39,37 unidades del motor. Los alcances de armas vienen en unidades. */
export const unitsToMeters = (u: number) => u / 39.37;

/** "AbilityCastRange" → "Ability Cast Range" (solo si la API no trae etiqueta). */
export const humanize = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");

export const SECTION_LABEL: Record<string, string> = { innate: "Bonificaciones", active: "Activa", passive: "Pasiva" };
