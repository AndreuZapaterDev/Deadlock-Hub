import { describe, expect, it } from "vitest";
import { isBigDay, linkEntities, patchId, titleDate } from "./patches";

describe("patchId", () => {
  it("toma el número final del guid", () => {
    expect(patchId("urn:xenforo:thread:166726")).toBe("166726");
    expect(patchId("https://store.steampowered.com/news/app/1422450/view/680766201707627248")).toBe("680766201707627248");
  });
});

describe("titleDate / isBigDay", () => {
  it("lee la fecha del título del foro", () => {
    expect(titleDate("09-29-2026")).toBe("2026-09-29");
    expect(titleDate("Ranked - Beta Season 2")).toBeNull();
  });
  it("usa la fecha del título; si no la tiene, la de publicación", () => {
    const big = ["2026-09-29T20:25:11Z"];
    expect(isBigDay({ title: "09-29-2026", date: "2026-10-15T03:12:00Z" }, big)).toBe(true);
    expect(isBigDay({ title: "Otro", date: "2026-09-29T10:00:00Z" }, big)).toBe(true);
    expect(isBigDay({ title: "Otro", date: "2026-10-01T10:00:00Z" }, big)).toBe(false);
  });
});

describe("linkEntities", () => {
  const ents = [{ name: "Infernus", href: "/heroes/infernus" }, { name: "Lady Geist", href: "/heroes/lady-geist" }, { name: "Ace", href: "/items/x" }];
  it("enlaza nombres en el texto, también los de varias palabras", () => {
    expect(linkEntities("<p>Infernus y Lady Geist</p>", ents)).toBe('<p><a href="/heroes/infernus">Infernus</a> y <a href="/heroes/lady-geist">Lady Geist</a></p>');
  });
  it("no toca atributos ni enlaces existentes", () => {
    const html = '<a href="/x" title="Infernus">Infernus</a> <span title="Infernus">ok</span>';
    expect(linkEntities(html, ents)).toBe(html);
  });
  it("respeta límites de palabra y mayúsculas, y salta nombres cortos", () => {
    expect(linkEntities("<p>Infernuss infernus Ace</p>", ents)).toBe("<p>Infernuss infernus Ace</p>");
  });
});

import { excerpt, groupByMonth, mentionedNames, readingMinutes } from "./patches";

describe("excerpt", () => {
  it("quita etiquetas y recorta en una palabra", () => {
    expect(excerpt("<p>Hola <b>mundo</b></p><p>otra</p>")).toBe("Hola mundo otra");
    const long = excerpt(`<p>${"palabra ".repeat(50)}</p>`, 40);
    expect(long.length).toBeLessThanOrEqual(41);
    expect(long.endsWith("…")).toBe(true);
    expect(long).not.toMatch(/palab…$/);
  });
});

describe("groupByMonth", () => {
  it("agrupa por mes, el más reciente primero, usando la fecha del título", () => {
    const g = groupByMonth([
      { title: "10-02-2026", date: "2026-10-05T00:00:00Z" },
      { title: "x", date: "2026-11-01T00:00:00Z" },
      { title: "09-29-2026", date: "2026-10-01T00:00:00Z" },
    ]);
    expect(g.map((x) => [x.month, x.items.length])).toEqual([["2026-11", 1], ["2026-10", 1], ["2026-09", 1]]);
  });
});

describe("mentionedNames / readingMinutes", () => {
  it("palabras completas y mínimo de 4 letras", () => {
    expect(mentionedNames("Infernus recibe un buff; Ivy no", ["Infernus", "Ivy", "Inferno"])).toEqual(["Infernus"]);
  });
  it("lectura mínima de 1 minuto", () => {
    expect(readingMinutes("hola")).toBe(1);
    expect(readingMinutes("a ".repeat(600))).toBe(3);
  });
});
