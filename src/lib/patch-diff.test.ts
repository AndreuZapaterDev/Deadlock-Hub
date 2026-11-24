import { describe, expect, it } from "vitest";
import { diffAssets, diffEntity, directionFor, flatten, humanize, overallDirection } from "./patch-diff";

describe("flatten", () => {
  it("aplana objetos y arrays, lee números escritos como texto y salta campos ignorados y textos", () => {
    const m = flatten({ id: 1, image: "x.png", properties: { Cooldown: { value: "12", css_class: "cd" } }, tags: ["a"], bonus: 0.5 });
    expect([...m]).toEqual([["properties.Cooldown.value", 12], ["bonus", 0.5]]);
  });
  it("descarta textos, rutas y URLs", () => {
    expect(flatten({ a: "https://x.com/a.png", b: "icons/foo/bar.svg", c: "ok" }).size).toBe(0);
  });
});

describe("directionFor", () => {
  it("más daño es buff y menos daño es nerf", () => {
    expect(directionFor("weapon.damage", { old: 10, new: 12 })).toBe("buff");
    expect(directionFor("weapon.damage", { old: 10, new: 8 })).toBe("nerf");
  });
  it("menos enfriamiento o coste es buff", () => {
    expect(directionFor("properties.AbilityCooldown.value", { old: 20, new: 15 })).toBe("buff");
    expect(directionFor("cost", { old: 1000, new: 1250 })).toBe("nerf");
  });
  it("sin regla conocida o sin números es neutral", () => {
    expect(directionFor("foo", { old: 1, new: 2 })).toBe("neutral");
    expect(directionFor("damage", { old: "a", new: "b" })).toBe("neutral");
  });
});

describe("diffEntity", () => {
  it("calcula el porcentaje y la dirección", () => {
    const [c] = diffEntity({ max_health: 100 }, { max_health: 110 });
    expect(c).toMatchObject({ path: "max_health", old: 100, new: 110, pct: 10, direction: "buff", label: "Max Health" });
  });
  it("no devuelve pct si el valor antiguo es 0", () => {
    expect(diffEntity({ bonus: 0 }, { bonus: 5 })[0].pct).toBeUndefined();
  });
  it("detecta campos que aparecen o desaparecen", () => {
    const changes = diffEntity({ a: 1 }, { a: 1, b: 2 });
    expect(changes).toEqual([expect.objectContaining({ path: "b", old: undefined, new: 2 })]);
  });
  it("no marca cambios en ids ni imágenes", () => {
    expect(diffEntity({ id: 1, image: "a" }, { id: 2, image: "b" })).toEqual([]);
  });
});

describe("overallDirection", () => {
  it("buff, nerf o mezcla", () => {
    const c = (direction: "buff" | "nerf" | "neutral") => ({ path: "x", label: "x", direction });
    expect(overallDirection([c("buff"), c("neutral")])).toBe("buff");
    expect(overallDirection([c("nerf")])).toBe("nerf");
    expect(overallDirection([c("buff"), c("nerf")])).toBe("neutral");
  });
});

describe("diffAssets", () => {
  const oldL = [{ id: 1, name: "A", damage: 10 }, { id: 2, name: "B", damage: 5 }, { id: 3, name: "Vieja" }];
  const newL = [{ id: 1, name: "A", damage: 12 }, { id: 2, name: "B", damage: 5 }, { id: 4, name: "Nueva" }];
  const d = diffAssets(oldL, newL);
  it("separa añadidos, eliminados y cambiados", () => {
    expect(d.added).toEqual([{ id: 4, name: "Nueva" }]);
    expect(d.removed).toEqual([{ id: 3, name: "Vieja" }]);
    expect(d.changed).toHaveLength(1);
    expect(d.changed[0]).toMatchObject({ id: 1, name: "A", direction: "buff" });
  });
  it("sin cambios devuelve todo vacío", () => {
    expect(diffAssets(oldL, oldL)).toEqual({ added: [], removed: [], changed: [] });
  });
});

describe("humanize", () => {
  it("quita .value y los índices", () => {
    expect(humanize("properties.AbilityCooldown.value")).toBe("Properties · Ability Cooldown");
    expect(humanize("starting_stats.max_move_speed.value")).toBe("Starting Stats · Max Move Speed");
  });
});
