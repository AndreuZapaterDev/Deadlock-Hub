// Builds de la comunidad: tipos, filtros, orden y utilidades. Puro (sin red) para poder probarlo.

export type BuildMod = { ability_id: number; annotation?: string | null };
export type BuildCategory = { name?: string | null; description?: string | null; mods?: BuildMod[] | null };
export type OrderStep = { ability_id: number; currency_type: number; delta: number; annotation?: string | null };
export type BuildEntry = {
  hero_build: {
    hero_id: number;
    hero_build_id: number;
    author_account_id: number;
    last_updated_timestamp: number;
    publish_timestamp?: number | null;
    name: string;
    description?: string | null;
    language: number;
    version: number;
    tags?: number[] | null;
    details?: { mod_categories?: BuildCategory[] | null; ability_order?: { currency_changes?: OrderStep[] | null } | null } | null;
  };
  num_favorites?: number | null;
  num_weekly_favorites?: number | null;
};

/** `language` es el índice del enum `build_language` del OpenAPI (0 = inglés). */
export const BUILD_LANGUAGES = [
  "Inglés", "Alemán", "Francés", "Italiano", "Coreano", "Español (España)", "Chino simplificado", "Ruso", "Tailandés", "Japonés",
  "Portugués (Portugal)", "Polaco", "Checo", "Turco", "Portugués (Brasil)", "Ucraniano", "Español (Latinoamérica)", "Vietnamita",
];

export type BuildSort = "favorites" | "updated";
export type BuildQuery = { q?: string; hero?: number; tag?: number; lang?: number; author?: number; sort: BuildSort; page: number };

type Raw = Record<string, string | undefined>;
const int = (v?: string) => (v && /^\d{1,12}$/.test(v) ? Number(v) : undefined);

/** Lee y valida los filtros de la URL. Lo inválido se ignora; héroes y etiquetas se validan contra el catálogo. */
export function parseBuildQuery(sp: Raw, heroIds: Set<number>, tagIds: Set<number>): BuildQuery {
  const hero = int(sp.hero);
  const tag = int(sp.tag);
  const lang = int(sp.lang);
  const q = sp.q?.trim().slice(0, 80);
  return {
    q: q || undefined,
    hero: hero !== undefined && heroIds.has(hero) ? hero : undefined,
    tag: tag !== undefined && tagIds.has(tag) ? tag : undefined,
    lang: lang !== undefined && lang < BUILD_LANGUAGES.length ? lang : undefined,
    author: int(sp.author) && int(sp.author)! <= 4294967295 ? int(sp.author) : undefined,
    sort: sp.sort === "updated" ? "updated" : "favorites",
    page: Math.max(1, int(sp.page) ?? 1),
  };
}

export const hasBuildFilters = (q: BuildQuery) => q.q !== undefined || q.hero !== undefined || q.tag !== undefined || q.lang !== undefined || q.author !== undefined;

/** Parámetros del endpoint `/v1/builds` (nombres del OpenAPI). */
export function toApiParams(q: BuildQuery, pageSize: number): Record<string, string | number> {
  const p: Record<string, string | number> = {
    sort_by: q.sort === "updated" ? "updated_at" : "favorites",
    sort_direction: "desc",
    start: (q.page - 1) * pageSize,
    limit: pageSize + 1, // uno de más para saber si hay página siguiente sin conocer el total
    only_latest: "true",
  };
  if (q.q) p.search_name = q.q;
  if (q.hero !== undefined) p.hero_id = q.hero;
  if (q.tag !== undefined) p.tag = q.tag;
  if (q.lang !== undefined) p.language = q.lang;
  if (q.author !== undefined) p.author_id = q.author;
  return p;
}

/** Categorías de una build, tolerando `mods: null` y categorías sin nombre (ambas existen en los datos). */
export function categoriesOf(b: BuildEntry): { name: string; description: string; mods: { ability_id: number; annotation: string }[] }[] {
  return (b.hero_build.details?.mod_categories ?? []).map((c, i) => ({
    name: c.name?.trim() || `Grupo ${i + 1}`,
    description: c.description?.trim() ?? "",
    mods: (c.mods ?? []).map((m) => ({ ability_id: m.ability_id, annotation: m.annotation?.trim() ?? "" })),
  }));
}

export const itemCount = (b: BuildEntry) => categoriesOf(b).reduce((a, c) => a + c.mods.length, 0);

export type Piece = { type: "text"; value: string } | { type: "link"; href: string; value: string };

/**
 * Convierte las URLs de un texto en enlaces. Solo `http` y `https` (ni `javascript:` ni `data:`); una URL sin protocolo
 * (`steamcommunity.com/id/x`) no se enlaza. El resto del texto se devuelve tal cual para que React lo escape.
 */
export function linkify(text: string): Piece[] {
  const out: Piece[] = [];
  const re = /https?:\/\/[^\s<>"']+/gi;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ type: "text", value: text.slice(last, i) });
    const url = m[0].replace(/[.,;:!?)\]]+$/, ""); // la puntuación final no es parte del enlace
    out.push({ type: "link", href: url, value: url });
    last = i + url.length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/** Pasos de la subida de habilidades. Interpretación: `currency_type` 2 = desbloquear, 1 = mejorar. */
export function orderSteps(b: BuildEntry): OrderStep[] {
  return (b.hero_build.details?.ability_order?.currency_changes ?? []).filter((s) => s.delta !== 0);
}
