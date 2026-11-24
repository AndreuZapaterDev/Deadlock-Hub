import { describe, expect, it } from "vitest";
import { categoriesOf, filterBuilds, hasBuildFilters, itemCount, linkify, orderSteps, parseBuildQuery, sortBuilds, toApiParams, type BuildEntry } from "./builds";

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

describe("filterBuilds y sortBuilds", () => {
  const list = [
    b({ hero_build_id: 1, name: "Fuego rápido", hero_id: 1, tags: [5], author_account_id: 10, language: 0, last_updated_timestamp: 300 }, 50),
    b({ hero_build_id: 2, name: "Hielo", hero_id: 2, tags: [6], description: "Mucho FUEGO", author_account_id: 11, language: 5, last_updated_timestamp: 100 }, 900),
    b({ hero_build_id: 3, name: "Otra", hero_id: 1, tags: null, author_account_id: 10, language: 0, last_updated_timestamp: 200 }, null),
  ];
  const q = (o = {}) => parseBuildQuery({}, heroes, tags) && { sort: "favorites" as const, page: 1, ...o };
  const ids = (l: BuildEntry[]) => l.map((x) => x.hero_build.hero_build_id);
  it("por héroe, etiqueta, idioma y autor", () => {
    expect(ids(filterBuilds(list, q({ hero: 1 })))).toEqual([1, 3]);
    expect(ids(filterBuilds(list, q({ tag: 6 })))).toEqual([2]);
    expect(ids(filterBuilds(list, q({ lang: 5 })))).toEqual([2]);
    expect(ids(filterBuilds(list, q({ author: 10 })))).toEqual([1, 3]);
  });
  it("la búsqueda mira nombre y descripción sin distinguir mayúsculas", () => {
    expect(ids(filterBuilds(list, q({ q: "fuego" })))).toEqual([1, 2]);
  });
  it("los filtros se combinan", () => {
    expect(ids(filterBuilds(list, q({ hero: 1, q: "fuego" })))).toEqual([1]);
    expect(filterBuilds(list, q({ hero: 2, tag: 5 }))).toEqual([]);
  });
  it("una build sin etiquetas (null) no rompe el filtro", () => {
    expect(() => filterBuilds(list, q({ tag: 5 }))).not.toThrow();
  });
  it("orden por popularidad (null cuenta 0) y por fecha, y no muta la lista", () => {
    expect(ids(sortBuilds(list, "favorites"))).toEqual([2, 1, 3]);
    expect(ids(sortBuilds(list, "updated"))).toEqual([1, 3, 2]);
    expect(ids(list)).toEqual([1, 2, 3]);
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
