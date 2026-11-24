import { describe, expect, it } from "vitest";
import { describeMapFilters, hasMapFilters, parseMapFilters, toHeatQuery, toHeatSearch } from "./map-filters";

describe("parseMapFilters", () => {
  it("sin nada no hay filtros", () => {
    expect(parseMapFilters({})).toEqual({});
    expect(hasMapFilters(parseMapFilters({}))).toBe(false);
  });
  it("lee héroe, minutos, rango, parche, duración y tipo de partida", () => {
    expect(parseMapFilters({ hero_id: "7", from: "10", to: "20", rank_min: "3", rank_max: "8", since: "2026-09-29", dur: "mid", mode: "ranked" })).toEqual({
      hero: 7, fromMin: 10, toMin: 20, rankMin: 3, rankMax: 8, since: "2026-09-29", dur: "mid", mode: "ranked",
    });
  });
  it("ignora lo inválido sin romper", () => {
    expect(parseMapFilters({ hero_id: "-1", from: "x", to: "9999", rank_min: "0", rank_max: "12", since: "ayer", dur: "eterna", mode: "bots" })).toEqual({});
    expect(parseMapFilters({ hero_id: "1.5" })).toEqual({});
  });
  it("un tramo vacío o un rango imposible descartan el segundo valor", () => {
    expect(parseMapFilters({ from: "20", to: "10" })).toEqual({ fromMin: 20 });
    expect(parseMapFilters({ from: "20", to: "20" })).toEqual({ fromMin: 20 });
    expect(parseMapFilters({ rank_min: "9", rank_max: "4" })).toEqual({ rankMin: 9 });
  });
  it("«desde el minuto 0» no cuenta como filtro", () => {
    expect(parseMapFilters({ from: "0" })).toEqual({});
    expect(parseMapFilters({ from: "0", to: "10" })).toEqual({ toMin: 10 });
  });
});

describe("toHeatQuery", () => {
  it("usa los nombres de parámetro del OpenAPI", () => {
    expect(toHeatQuery({ hero: 7, fromMin: 10, toMin: 20, rankMin: 3, rankMax: 8, dur: "short", mode: "unranked" })).toEqual({
      min_average_badge: 31, max_average_badge: 86, max_duration_s: 1200, hero_ids: 7, min_game_time_s: 600, max_game_time_s: 1200, match_mode: "unranked",
    });
  });
  it("sin filtros no manda nada", () => {
    expect(toHeatQuery({})).toEqual({});
  });
});

describe("toHeatSearch", () => {
  it("es estable (mismo orden siempre) para servir de clave de caché", () => {
    const a = toHeatSearch({ hero: 7, toMin: 20, mode: "ranked" });
    const b = toHeatSearch({ mode: "ranked", toMin: 20, hero: 7 });
    expect(a).toBe(b);
    expect(a).toBe("hero_id=7&mode=ranked&to=20");
  });
  it("ida y vuelta con el parser", () => {
    const f = { hero: 3, fromMin: 5, toMin: 15, rankMin: 2, rankMax: 6, since: "2026-05-22", dur: "long" as const, mode: "ranked" as const };
    expect(parseMapFilters(Object.fromEntries(new URLSearchParams(toHeatSearch(f))))).toEqual(f);
  });
});

describe("describeMapFilters", () => {
  const names = { hero: "Infernus", tier: (t: number) => `Rango ${t}` };
  it("resume los filtros activos", () => {
    expect(describeMapFilters({ hero: 1, fromMin: 10, rankMin: 3 }, names)).toEqual(["Infernus", "Minutos 10–fin", "Desde Rango 3"]);
    expect(describeMapFilters({}, names)).toEqual([]);
  });
});

import { EMPTY_FILTERS, pickFilterState, stateToFilters } from "./map-filters";

describe("estado de los selectores", () => {
  const ids = (slug: string) => ({ infernus: 1, "lady-geist": 4 })[slug];
  it("pickFilterState solo toma las claves de filtro", () => {
    expect(pickFilterState({ hero: "infernus", capas: "zip", z: "3", from: "10" })).toEqual({ ...EMPTY_FILTERS, hero: "infernus", from: "10" });
  });
  it("traduce el slug del héroe a su id y valida el resto", () => {
    expect(stateToFilters({ ...EMPTY_FILTERS, hero: "lady-geist", to: "30", mode: "ranked" }, ids)).toEqual({ hero: 4, toMin: 30, mode: "ranked" });
  });
  it("un héroe desconocido (p. ej. el slug de otro idioma) simplemente no filtra", () => {
    expect(stateToFilters({ ...EMPTY_FILTERS, hero: "hiedra" }, ids)).toEqual({});
  });
});
