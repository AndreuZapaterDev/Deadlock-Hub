// Utilidades puras del mapa (sin dependencias de servidor, para poder testearlas y usarlas en cliente).

export type KillDeathPoint = { position_x: number; position_y: number; killer_team?: number; kills: number; deaths: number };
export type HeatCell = { col: number; row: number; kills: number; deaths: number };

/** Coordenadas del mundo → posición relativa (0..1) sobre el minimapa. `radius` viene de `/v1/assets/map` (la mitad del lado). */
export function worldToRel(x: number, y: number, radius: number) {
  return { left: (x + radius) / (2 * radius), top: (radius - y) / (2 * radius) };
}

/**
 * Agrupa los puntos de kills/muertes (raster de 256 unidades) en una rejilla `grid`×`grid` del mapa.
 * Descarta los puntos fuera del mapa (la API incluye valores centinela como -32768).
 */
export function buildHeat(points: KillDeathPoint[], radius: number, grid = 48): HeatCell[] {
  const cells = new Map<number, HeatCell>();
  for (const p of points) {
    const { left, top } = worldToRel(p.position_x, p.position_y, radius);
    if (left < 0 || left >= 1 || top < 0 || top >= 1) continue;
    const col = Math.floor(left * grid);
    const row = Math.floor(top * grid);
    const key = row * grid + col;
    const c = cells.get(key) ?? { col, row, kills: 0, deaths: 0 };
    c.kills += p.kills;
    c.deaths += p.deaths;
    cells.set(key, c);
  }
  return [...cells.values()];
}

/**
 * Rango de color del heatmap por percentiles: por debajo del `lo` (percentil 25 de las celdas con datos) no se pinta y por encima
 * del `hi` (percentil 97) todo es igual de caliente. Normalizar por el máximo dejaba el mapa entero teñido y solo unas pocas celdas
 * extremas destacaban.
 */
export function heatRange(values: number[]): { lo: number; hi: number } {
  const v = values.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return { lo: 0, hi: 1 };
  const at = (p: number) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  const lo = at(0.25);
  const hi = Math.max(at(0.97), lo + 1);
  return { lo, hi };
}

/** Intensidad 0..1 de una celda dentro del rango `heatRange`. */
export function intensity(value: number, lo: number, hi: number) {
  return value <= lo ? 0 : Math.min(1, (value - lo) / (hi - lo));
}

export type ObjectiveKind = "core" | "titan" | "tier1" | "tier2";
export type ParsedObjective = { team: 0 | 1; kind: ObjectiveKind; lane?: number };

/** `team0_tier2_3` → { team: 0, kind: "tier2", lane: 3 }. Devuelve null si no es un objetivo conocido. */
export function parseObjective(key: string): ParsedObjective | null {
  const m = /^team([01])_(core|titan|tier1|tier2)(?:_(\d+))?$/.exec(key);
  return m ? { team: Number(m[1]) as 0 | 1, kind: m[2] as ObjectiveKind, lane: m[3] ? Number(m[3]) : undefined } : null;
}

/** Clase de NPC (`npc-units`) que corresponde a cada tipo de objetivo, para mostrar su ficha. */
export const OBJECTIVE_NPC: Record<ObjectiveKind, string | null> = {
  core: null,
  titan: "npc_boss_tier3",
  tier1: "npc_boss_tier1",
  tier2: "npc_boss_tier2",
};

export const OBJECTIVE_LABEL: Record<ObjectiveKind, string> = { core: "Núcleo", titan: "Patrón", tier1: "Guardián", tier2: "Walker" };
export const CAMP_LABEL: Record<string, string> = { vault: "Cámara", strong: "Campamento fuerte", medium: "Campamento medio", weak: "Campamento débil" };
export const teamName = (t: number) => (t === 0 ? "Equipo A" : "Equipo B");

/** Franjas de minuto para filtrar el heatmap → parámetros `min_game_time_s`/`max_game_time_s` de la API. */
export const MINUTE_BUCKETS = [
  { value: "0-10", label: "Minutos 0–10", min: 0, max: 600 },
  { value: "10-20", label: "Minutos 10–20", min: 600, max: 1200 },
  { value: "20-30", label: "Minutos 20–30", min: 1200, max: 1800 },
  { value: "30+", label: "Minuto 30 en adelante", min: 1800, max: undefined },
] as const;

// ---------- Capas del mapa ----------

export type Shape = "dot" | "ring" | "square" | "diamond" | "triangle" | "cross" | "star";
export type EntityGroup = "Estructuras" | "Movilidad" | "Botín";
export type EntityKind = {
  /** Clave en `entities` de `/v1/assets/map`. */
  key: string;
  label: string;
  group: EntityGroup;
  shape: Shape;
  color: string;
  /** Visible al abrir el mapa. Lo muy abundante (cajas, estatuas…) empieza apagado para no saturar. */
  on?: boolean;
  /** Descripción de la ficha. */
  text: string;
};

export const ENTITY_KINDS: EntityKind[] = [
  { key: "shops", label: "Tiendas", group: "Estructuras", shape: "square", color: "var(--brass)", on: true, text: "Aquí se compran objetos con las almas. Hay una por carril y equipo, y otras en zonas neutrales." },
  { key: "base_sentries", label: "Centinelas de base", group: "Estructuras", shape: "triangle", color: "var(--rose)", text: "Defensas automáticas que protegen la base de cada equipo." },
  { key: "teleporters", label: "Teletransportadores", group: "Movilidad", shape: "ring", color: "var(--teal)", on: true, text: "Llevan a los jugadores al otro extremo del mapa; la línea marca el destino." },
  { key: "bounce_pads", label: "Almohadillas de salto", group: "Movilidad", shape: "triangle", color: "var(--lilac)", text: "Lanzan al jugador por el aire hacia otra zona." },
  { key: "climb_ropes", label: "Cuerdas de escalada", group: "Movilidad", shape: "dot", color: "var(--cream)", text: "Permiten trepar a tejados y plataformas." },
  { key: "steam_vents", label: "Respiraderos de vapor", group: "Movilidad", shape: "dot", color: "var(--teal)", text: "Chorros de vapor que impulsan hacia arriba." },
  { key: "cosmic_veils", label: "Velos cósmicos", group: "Movilidad", shape: "dot", color: "var(--lilac)", text: "Portales cósmicos repartidos por el mapa." },
  { key: "unstable_rifts", label: "Grietas inestables", group: "Movilidad", shape: "star", color: "var(--lilac)", text: "Grietas que transportan a quien las cruza." },
  { key: "soul_urn_spawns", label: "Urna de almas", group: "Botín", shape: "star", color: "var(--brass)", on: true, text: "Aquí aparece la urna de almas: llevarla a la zona de entrega da almas a todo el equipo." },
  { key: "soul_urn_pads", label: "Entrega de la urna", group: "Botín", shape: "ring", color: "var(--brass)", on: true, text: "Zona donde se entrega la urna de almas." },
  { key: "bridge_buffs", label: "Mejora del puente", group: "Botín", shape: "diamond", color: "var(--apricot)", on: true, text: "Potenciador temporal que aparece en el puente central." },
  { key: "bells", label: "Campanas", group: "Botín", shape: "diamond", color: "var(--brass)", on: true, text: "Hacerlas sonar da una ventaja al equipo." },
  { key: "golden_statues", label: "Estatuas doradas", group: "Botín", shape: "dot", color: "var(--brass)", text: "Contenedores de botín repartidos por el mapa." },
  { key: "healing_snacks", label: "Comida curativa", group: "Botín", shape: "cross", color: "var(--sage)", text: "Recupera vida al recogerla." },
  { key: "tough_crates", label: "Cajas resistentes", group: "Botín", shape: "square", color: "var(--apricot)", text: "Cajas que necesitan más golpes y dan mejor botín." },
  { key: "crates", label: "Cajas de madera", group: "Botín", shape: "dot", color: "var(--apricot)", text: "Cajas que se rompen para conseguir almas." },
];

/** Capas que no son una entidad suelta. */
export const BASE_LAYERS = [
  { id: "objectives", label: "Objetivos", on: true },
  { id: "camps", label: "Campamentos neutrales", on: true },
  { id: "zip", label: "Tirolinas", on: true },
  { id: "heat", label: "Heatmap de kills y muertes", on: true },
  { id: "tunnels", label: "Túneles", on: false },
  { id: "rats", label: "Túneles de ratas", on: false },
] as const;

export const ALL_LAYER_IDS: string[] = [...BASE_LAYERS.map((l) => l.id), ...ENTITY_KINDS.map((e) => e.key)];
export const DEFAULT_LAYERS: string[] = [...BASE_LAYERS.filter((l) => l.on).map((l) => l.id), ...ENTITY_KINDS.filter((e) => e.on).map((e) => e.key)];

/** `?capas=a,b,c` → capas activas. Sin el parámetro, las de por defecto; los ids desconocidos se descartan. */
export function parseLayers(param: string | undefined): string[] {
  if (param === undefined) return DEFAULT_LAYERS;
  const known = new Set(ALL_LAYER_IDS);
  return [...new Set(param.split(",").map((s) => s.trim()).filter((s) => known.has(s)))];
}

/** Capas activas → valor de `?capas=` (cadena vacía si coincide con las de por defecto: no ensucia la URL). */
export function layersToParam(active: string[]): string | null {
  const a = [...new Set(active)].sort().join(",");
  return a === [...DEFAULT_LAYERS].sort().join(",") ? null : a;
}

export type ZipLine = { color: string; paths: [number, number][][] };

/** Una tirolina de la API (origen + 3 trazados en coordenadas relativas al origen) → trazados en posición relativa del mapa. */
export function ziplineToRel(z: { origin: number[]; color: string; P0_points?: number[][]; P1_points?: number[][]; P2_points?: number[][] }, radius: number): ZipLine {
  const [ox, oy] = z.origin;
  const paths = [z.P0_points, z.P1_points, z.P2_points]
    .filter((p): p is number[][] => Array.isArray(p) && p.length > 1)
    .map((pts) => pts.map(([x, y]) => {
      const { left, top } = worldToRel(ox + x, oy + y, radius);
      return [Math.round(left * 10000) / 10000, Math.round(top * 10000) / 10000] as [number, number];
    }));
  return { color: z.color, paths };
}

/** Heatmap: total, máximo por modo y tamaño de la celda. */
export function heatStats(cells: HeatCell[]) {
  let kills = 0, deaths = 0, maxKills = 0, maxDeaths = 0;
  for (const c of cells) {
    kills += c.kills; deaths += c.deaths;
    maxKills = Math.max(maxKills, c.kills); maxDeaths = Math.max(maxDeaths, c.deaths);
  }
  return { kills, deaths, maxKills, maxDeaths };
}

// ---------- Escena del mapa (lo que llega al navegador) ----------

export type MapObjective = { key: string; team: 0 | 1; kind: ObjectiveKind; lane?: number; left: number; top: number; npcName?: string; maxHealth?: number };
export type MapCamp = { name: string; kind: string; left: number; top: number; world: [number, number] };
export type SceneEntity = { id: string; kind: string; left: number; top: number; world: [number, number]; team?: number; shopKind?: string; target?: { left: number; top: number } };
export type MapScene = {
  objectives: MapObjective[];
  camps: MapCamp[];
  entities: SceneEntity[];
  zips: ZipLine[];
  /** Solo con imágenes remotas activas. */
  images: { minimap?: string; tunnels?: string; rats?: string };
};

/** Respuesta de `/v1/assets/map` (solo los campos que usa la web). */
export type MapAssetData = {
  radius: number;
  images?: Record<string, string>;
  objective_positions: Record<string, { left_relative: number; top_relative: number }>;
  neutral_camps: { name: string; kind: string; position: number[]; left_relative: number; top_relative: number }[];
  zipline_paths?: Parameters<typeof ziplineToRel>[0][];
  entities?: Record<string, { position: number[]; left_relative: number; top_relative: number; team?: number; kind?: string; target?: number[] }[]>;
};

const r4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Convierte la respuesta de la API en una escena compacta para el cliente (posiciones redondeadas, sin imágenes ni campos de
 * depuración). `npcs` da el nombre y la vida de los objetivos.
 */
export function buildScene(map: MapAssetData, npcs: { class_name: string; name?: string; max_health?: number }[], remoteImages: boolean): MapScene {
  const npcByClass = new Map(npcs.map((n) => [n.class_name, n]));
  const objectives = Object.entries(map.objective_positions).flatMap<MapObjective>(([key, pos]) => {
    const p = parseObjective(key);
    if (!p) return [];
    const cls = OBJECTIVE_NPC[p.kind];
    const npc = cls ? npcByClass.get(cls) : undefined;
    return [{ key, ...p, left: pos.left_relative, top: pos.top_relative, npcName: npc?.name, maxHealth: npc?.max_health }];
  });
  const camps = map.neutral_camps.map<MapCamp>((c) => ({ name: c.name, kind: c.kind, left: r4(c.left_relative), top: r4(c.top_relative), world: [Math.round(c.position[0]), Math.round(c.position[1])] }));
  const known = new Set(ENTITY_KINDS.map((e) => e.key));
  const entities = Object.entries(map.entities ?? {}).flatMap(([kind, list]) =>
    known.has(kind)
      ? list.map<SceneEntity>((e, i) => ({
          id: `${kind}-${i}`,
          kind,
          left: r4(e.left_relative),
          top: r4(e.top_relative),
          world: [Math.round(e.position[0]), Math.round(e.position[1])],
          team: e.team,
          shopKind: kind === "shops" ? e.kind : undefined,
          target: e.target ? (({ left, top }) => ({ left: r4(left), top: r4(top) }))(worldToRel(e.target[0], e.target[1], map.radius)) : undefined,
        }))
      : [],
  );
  const zips = (map.zipline_paths ?? []).map((z) => ziplineToRel(z, map.radius)).filter((z) => z.paths.length > 0);
  const img = map.images ?? {};
  return {
    objectives, camps, entities, zips,
    images: remoteImages ? { minimap: img.minimap, tunnels: img.mid_tunnels, rats: img.rat_tunnels } : {},
  };
}
