import "server-only";
import { cache } from "react";
import sanitizeHtml from "sanitize-html";
import { getHeroes, getItems } from "@/lib/lookup";
import { fetchData, loadBigDays, orElse, type Fetched } from "@/lib/meta-data";
import { diffAssets, emptyDiff, type AssetDiff } from "@/lib/patch-diff";
import { linkEntities, patchId, type Patch } from "@/lib/patches";
import { getSource } from "@/lib/api";
import { getLanguage } from "@/lib/language";
import { slugify } from "@/lib/slug";

// ---------- Notas de parche (/v2/patches) ----------

type RawPatch = { source: string; title: string; pub_date: string; link: string; guid: { text: string }; content?: string; content_encoded?: string };

/** Sanitiza el HTML de las notas (vienen del foro y de Steam). Sin estilos ni scripts; solo imágenes https. */
export function sanitizePatchHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "hr", "div", "span", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "h4", "a", "blockquote", "code", "img"],
    allowedAttributes: { a: ["href"], img: ["src", "alt"] },
    allowedSchemes: ["https", "http", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }) },
    // Los bloques "unfurl" del foro repiten el enlace a Steam con imagen y título: ruido.
    exclusiveFilter: (frame) => frame.tag === "div" && !frame.text.trim() && !frame.mediaChildren.length,
  });
}

export const loadPatches = cache(async (): Promise<Fetched<Patch[]>> => {
  const r = await fetchData<RawPatch[]>("/v2/patches");
  if (!r.ok) return r;
  const list = r.data
    .map<Patch>((p) => ({
      id: patchId(p.guid?.text ?? p.link),
      source: p.source === "forum" ? "forum" : "steam",
      title: p.title.trim(),
      date: p.pub_date,
      link: p.link,
      html: p.content ?? p.content_encoded ?? "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
  return { ok: true, data: list };
});

/** HTML ya sanitizado y con los nombres de héroes y objetos enlazados a sus fichas. */
export async function renderPatchHtml(html: string): Promise<string> {
  const [heroes, items] = await Promise.all([getHeroes(), getItems()]);
  const entities = [
    ...heroes.map((h) => ({ name: h.name, href: `/heroes/${slugify(h.name)}` })),
    ...items.filter((i) => i.type === "upgrade" && i.shopable).map((i) => ({ name: i.name, href: `/items/${i.class_name}` })),
  ];
  return linkEntities(sanitizePatchHtml(html), entities);
}

// ---------- Versiones del juego y comparador ----------

export type GameVersion = { version: number; date: string };

export const loadVersions = cache(async (): Promise<GameVersion[]> => {
  const all = await orElse<{ client_version: number; version_datetime: string }[]>("/v1/assets/steam-info/all", []);
  return all.map((v) => ({ version: v.client_version, date: v.version_datetime })).sort((a, b) => b.version - a.version);
});

/** Solo héroes jugables: los de desarrollo y pruebas cambian constantemente y no interesan. */
const playable = <T extends { player_selectable?: boolean }>(list: T[]) => list.filter((h) => h.player_selectable !== false);

export type PatchDiff = {
  from?: number;
  to?: number;
  heroes: AssetDiff;
  items: AssetDiff;
  /** El parche anterior no cambiaba nada y se comparó contra la versión previa al último gran día. */
  widened?: boolean;
};

type Asset = { id: number; name: string; player_selectable?: boolean };

/** Compara los héroes y objetos de dos versiones del cliente. Sin `from`/`to`, el último parche contra el anterior. */
async function computePatchDiff(from?: number, to?: number): Promise<Fetched<PatchDiff>> {
  const versions = await loadVersions();
  const latest = to ?? versions[0]?.version;
  const previous = from ?? versions.find((v) => latest !== undefined && v.version < latest)?.version;
  try {
    if (previous === undefined || latest === undefined) return { ok: true, data: { heroes: emptyDiff(), items: emptyDiff() } };
    const api = getSource();
    const get = (path: string, v: number) => api.get<Asset[]>(path, { client_version: v });
    const compare = async (a: number, b: number): Promise<Fetched<PatchDiff>> => {
      const [oh, nh, oi, ni] = await Promise.all([get("/v1/assets/heroes", a), get("/v1/assets/heroes", b), get("/v1/assets/items", a), get("/v1/assets/items", b)]);
      const bad = [oh, nh, oi, ni].find((r) => r.status >= 400 || !Array.isArray(r.data));
      if (bad) return { ok: false, status: bad.status >= 400 ? bad.status : 502 };
      return { ok: true, data: { from: a, to: b, heroes: diffAssets(playable(oh.data), playable(nh.data)), items: diffAssets(oi.data, ni.data) } };
    };
    const first = await compare(previous, latest);
    const empty = (d: PatchDiff) => !d.heroes.changed.length && !d.heroes.added.length && !d.heroes.removed.length && !d.items.changed.length && !d.items.added.length && !d.items.removed.length;
    // Muchas versiones son actualizaciones sin cambios de equilibrio: si el "anterior" es idéntico, se retrocede hasta justo antes del último gran día.
    if (first.ok && from === undefined && empty(first.data)) {
      const bigDay = (await loadBigDays())[0];
      const before = bigDay ? versions.find((v) => v.date < bigDay.slice(0, 19)) : undefined;
      if (before && before.version < previous) {
        const wider = await compare(before.version, latest);
        if (wider.ok) return { ok: true, data: { ...wider.data, widened: true } };
      }
    }
    return first;
  } catch {
    return { ok: false, status: 502 };
  }
}

// La comparación por defecto (último parche) la usan todas las fichas de héroe y objeto: se calcula una vez por hora, idioma y proceso.
const defaultDiffs = new Map<string, { at: number; promise: Promise<Fetched<PatchDiff>> }>();
const HOUR = 3600_000;

export const loadPatchDiff = cache(async (from?: number, to?: number): Promise<Fetched<PatchDiff>> => {
  if (from !== undefined || to !== undefined) return computePatchDiff(from, to);
  const lang = await getLanguage();
  const cached = defaultDiffs.get(lang);
  if (cached && Date.now() - cached.at < HOUR) return cached.promise;
  const entry = { at: Date.now(), promise: computePatchDiff() };
  defaultDiffs.set(lang, entry);
  // Un fallo no se queda en caché: la siguiente petición lo reintenta.
  entry.promise.then((r) => { if (!r.ok && defaultDiffs.get(lang) === entry) defaultDiffs.delete(lang); });
  return entry.promise;
});
