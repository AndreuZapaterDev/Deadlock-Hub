import { describe, expect, it } from "vitest";
import { describeFilters, hasFilters, parseFilters, toApiQuery } from "./analytics-filters";

describe("parseFilters", () => {
  it("sin parámetros: sin filtros", () => {
    expect(parseFilters({})).toEqual({});
    expect(hasFilters(parseFilters({}))).toBe(false);
  });
  it("lee rango, fecha y duración", () => {
    expect(parseFilters({ rank_min: "5", rank_max: "9", since: "2026-09-29", dur: "mid" })).toEqual({ rankMin: 5, rankMax: 9, since: "2026-09-29", dur: "mid" });
  });
  it("ignora valores inválidos en vez de romper", () => {
    expect(parseFilters({ rank_min: "0", rank_max: "12", since: "ayer", dur: "eterna" })).toEqual({});
    expect(parseFilters({ rank_min: "abc", rank_max: "3.5" })).toEqual({});
    expect(parseFilters({ since: "2026-13-45" })).toEqual({});
  });
  it("un rango imposible (mínimo mayor que máximo) descarta el máximo", () => {
    expect(parseFilters({ rank_min: "8", rank_max: "3" })).toEqual({ rankMin: 8 });
  });
  it("recorta la fecha a YYYY-MM-DD", () => {
    expect(parseFilters({ since: "2026-09-29T20:25:11Z" }).since).toBe("2026-09-29");
  });
});

describe("toApiQuery (nombres de parámetro del OpenAPI)", () => {
  it("rango: tier t → badge t·10+1 … t·10+6", () => {
    expect(toApiQuery({ rankMin: 5, rankMax: 9 })).toEqual({ min_average_badge: 51, max_average_badge: 96 });
  });
  it("el máximo nunca pasa de 116 (el badge más alto)", () => {
    expect(toApiQuery({ rankMax: 11 })).toEqual({ max_average_badge: 116 });
  });
  it("fecha → timestamp unix en UTC", () => {
    expect(toApiQuery({ since: "2026-09-29" })).toEqual({ min_unix_timestamp: Date.UTC(2026, 8, 29) / 1000 });
  });
  it("duración: cortas, medias y largas", () => {
    expect(toApiQuery({ dur: "short" })).toEqual({ max_duration_s: 1200 });
    expect(toApiQuery({ dur: "mid" })).toEqual({ min_duration_s: 1200, max_duration_s: 2400 });
    expect(toApiQuery({ dur: "long" })).toEqual({ min_duration_s: 2400 });
  });
  it("sin filtros: objeto vacío (la API usa sus valores por defecto)", () => {
    expect(toApiQuery({})).toEqual({});
  });
});

describe("describeFilters", () => {
  it("resume los filtros activos", () => {
    const tr = (k: string, v?: Record<string, string | number>) => (k === "any" ? "cualquiera" : k === "fRank" ? `Rango: ${v!.from} → ${v!.to}` : k === "fSince" ? `Desde el ${v!.date}` : k === "durLong" ? "Largas (más de 40 min)" : k);
    const out = describeFilters({ rankMin: 5, since: "2026-09-29", dur: "long" }, (t) => `T${t}`, tr);
    expect(out).toEqual(["Rango: T5 → cualquiera", "Desde el 2026-09-29", "Largas (más de 40 min)"]);
  });
});
