import { describe, expect, it } from "vitest";
import { categoriesOf, categoryMix, hasBuildFilters, isFresh, itemCount, linkify, orderSteps, parseBuildQuery, shopItemsOf, toApiParams, totalCost, type BuildEntry } from "./builds";

const b = (o: Partial<BuildEntry["hero_build"]> = {}, fav: number | null = 100): BuildEntry => ({
  hero_build: { hero_id: 1, hero_build_id: 1, author_account_id: 10, last_updated_timestamp: 1000, name: "Build", language: 0, version: 1, ...o },
  num_favorites: fav,
});
const heroes = new Set([1, 2]);
const tags = new Set([5, 6]);

describe("parseBuildQuery", () => {
  it("sin parámetros: popularidad, página 1, sin filtros", () => {
    const q = parseBuildQuery({}, heroes, tags);
    expect(q).toEqual({ q: undefined, hero: undefined, tag: undefined, lang: undefined, author: undefined, sort: "favorites", page: 1 });
    expect(hasBuildFilters(q)).toBe(false);
  });
  it("lee filtros válidos", () => {
    const q = parseBuildQuery({ q: "  fuego ", hero: "2", tag: "5", lang: "5", author: "464664477", sort: "updated", page: "3" }, heroes, tags);
    expect(q).toEqual({ q: "fuego", hero: 2, tag: 5, lang: 5, author: 464664477, sort: "updated", page: 3 });
    expect(hasBuildFilters(q)).toBe(true);
  });
  it("ignora héroe y etiqueta que no existen, idioma fuera de rango, autor enorme y basura", () => {
    const q = parseBuildQuery({ hero: "99", tag: "7", lang: "99", author: "99999999999", sort: "raro", page: "-4" }, heroes, tags);
    expect(q).toMatchObject({ hero: undefined, tag: undefined, lang: undefined, author: undefined, sort: "favorites", page: 1 });
  });
  it("recorta una búsqueda larguísima", () => {
    expect(parseBuildQuery({ q: "a".repeat(500) }, heroes, tags).q).toHaveLength(80);
  });
});

describe("toApiParams", () => {
  it("usa los nombres del OpenAPI y pide uno más para saber si hay siguiente página", () => {
    expect(toApiParams({ sort: "updated", page: 3, hero: 2, q: "x", tag: 5, lang: 1, author: 9 }, 20)).toEqual({
      sort_by: "updated_at", sort_direction: "desc", start: 40, limit: 21, only_latest: "true", search_name: "x", hero_id: 2, tag: 5, language: 1, author_id: 9,
    });
  });
  it("sin filtros solo lleva orden y paginación", () => {
    expect(Object.keys(toApiParams({ sort: "favorites", page: 1 }, 20)).sort()).toEqual(["limit", "only_latest", "sort_by", "sort_direction", "start"]);
  });
});

describe("categoriesOf", () => {
  it("tolera mods null y categorías sin nombre (ambos casos existen en los datos)", () => {
    const e = b();
    e.hero_build.details = { mod_categories: [{ name: "Early", mods: [{ ability_id: 1, annotation: " 3rd skill " }] }, { name: null, mods: null }, { name: "", mods: [] }] };
    const c = categoriesOf(e);
    expect(c.map((x) => x.name)).toEqual(["Early", "Grupo 2", "Grupo 3"]);
    expect(c[0].mods).toEqual([{ ability_id: 1, annotation: "3rd skill" }]);
    expect(c[1].mods).toEqual([]);
    expect(itemCount(e)).toBe(1);
  });
  it("sin detalles: vacío", () => {
    expect(categoriesOf(b())).toEqual([]);
    expect(itemCount(b())).toBe(0);
  });
});

describe("linkify", () => {
  it("enlaza URLs http y https y deja el resto como texto", () => {
    expect(linkify("mira https://discord.com/x y http://a.b/c.")).toEqual([
      { type: "text", value: "mira " }, { type: "link", href: "https://discord.com/x", value: "https://discord.com/x" },
      { type: "text", value: " y " }, { type: "link", href: "http://a.b/c", value: "http://a.b/c" }, { type: "text", value: "." },
    ]);
  });
  it("no enlaza javascript:, data: ni URLs sin protocolo", () => {
    for (const t of ["javascript:alert(1)", "data:text/html,<b>x</b>", "steamcommunity.com/id/x", "ftp://x.y"]) {
      expect(linkify(t).every((p) => p.type === "text")).toBe(true);
    }
  });
  it("la puntuación final no forma parte del enlace", () => {
    expect(linkify("(https://x.y/z).").find((p) => p.type === "link")).toMatchObject({ href: "https://x.y/z" });
  });
  it("texto vacío o sin URLs", () => {
    expect(linkify("")).toEqual([]);
    expect(linkify("solo texto")).toEqual([{ type: "text", value: "solo texto" }]);
  });
});

describe("orderSteps", () => {
  it("devuelve los pasos con cambio y tolera su ausencia", () => {
    const e = b();
    expect(orderSteps(e)).toEqual([]);
    e.hero_build.details = { ability_order: { currency_changes: [{ ability_id: 1, currency_type: 2, delta: -1 }, { ability_id: 2, currency_type: 1, delta: 0 }] } };
    expect(orderSteps(e)).toHaveLength(1);
  });
});


describe("análisis de una build", () => {
  const items = new Map([
    [1, { id: 1, type: "upgrade", cost: 500, item_slot_type: "weapon" as const }],
    [2, { id: 2, type: "upgrade", cost: 1250, item_slot_type: "spirit" as const }],
    [3, { id: 3, type: "ability" }],
  ]);
  const build = { hero_build: { hero_id: 1, hero_build_id: 1, author_account_id: 1, last_updated_timestamp: 1000, name: "x", language: 0, version: 1, details: { mod_categories: [{ mods: [{ ability_id: 1 }, { ability_id: 3 }] }, { mods: [{ ability_id: 2 }, { ability_id: 1 }] }] } } } as BuildEntry;

  it("shopItemsOf: solo objetos de tienda, sin repetir y en orden", () => expect(shopItemsOf(build, items).map((i) => i.id)).toEqual([1, 2]));
  it("totalCost suma costes (los que faltan cuentan 0)", () => expect(totalCost([{ cost: 500 }, {}, { cost: 1250 }])).toBe(1750));
  it("categoryMix reparte por categoría", () => {
    const m = categoryMix([{ item_slot_type: "weapon" }, { item_slot_type: "weapon" }, { item_slot_type: "spirit" }, {}]);
    expect(m.counts).toEqual({ weapon: 2, vitality: 0, spirit: 1 });
    expect(m.share.weapon).toBeCloseTo(2 / 3);
    expect(categoryMix([]).total).toBe(0);
  });
  it("isFresh", () => {
    expect(isFresh(build, 14, 1000 + 86400)).toBe(true);
    expect(isFresh(build, 14, 1000 + 30 * 86400)).toBe(false);
  });
});
