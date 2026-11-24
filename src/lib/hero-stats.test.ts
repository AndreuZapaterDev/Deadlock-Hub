import { describe, expect, it } from "vitest";
import { falloffCurve, heroAccent, levelCount, splitLore, statPosition, statsAtLevel } from "./hero-stats";

describe("splitLore", () => {
  it("parte por <br><br> y quita las etiquetas sueltas", () => {
    expect(splitLore("Uno.<br><br>Dos con <b>negrita</b>.<br />   <br/>Tres.")).toEqual(["Uno.", "Dos con negrita.", "Tres."]);
  });
  it("un <br> simple es un espacio, no un párrafo", () => {
    expect(splitLore("Línea<br>siguiente")).toEqual(["Línea siguiente"]);
  });
  it("vacío o sin lore", () => {
    expect(splitLore(undefined)).toEqual([]);
    expect(splitLore("  <br><br>  ")).toEqual([]);
  });
});

describe("statsAtLevel", () => {
  const hero = {
    starting_stats: { max_health: { value: 730 }, light_melee_damage: { value: 50 } },
    level_info: Object.fromEntries(Array.from({ length: 36 }, (_, i) => [String(i + 1), { required_gold: i * 100 }])),
    standard_level_up_upgrades: { MODIFIER_VALUE_BASE_HEALTH_FROM_LEVEL: 35, MODIFIER_VALUE_BASE_BULLET_DAMAGE_FROM_LEVEL: 0.05, MODIFIER_VALUE_BASE_MELEE_DAMAGE_FROM_LEVEL: 1.5, MODIFIER_VALUE_TECH_POWER: 1.1 },
  };
  const weapon = { bullet_damage: 3.6, shots_per_second: 10, bullets: 1 };
  it("nivel 1 = estadísticas base", () => {
    expect(statsAtLevel(hero, weapon, 1)).toMatchObject({ level: 1, health: 730, bulletDamage: 3.6, dps: 36, melee: 50, spiritPower: 0, souls: 0 });
  });
  it("suma la mejora por nivel de forma lineal", () => {
    const s = statsAtLevel(hero, weapon, 11);
    expect(s.health).toBe(730 + 35 * 10);
    expect(s.bulletDamage).toBeCloseTo(3.6 + 0.5, 6);
    expect(s.melee).toBe(50 + 15);
    expect(s.spiritPower).toBeCloseTo(11, 6);
    expect(s.souls).toBe(1000);
  });
  it("limita el nivel al rango de la API y multiplica por balas (escopetas)", () => {
    expect(statsAtLevel(hero, weapon, 99).level).toBe(36);
    expect(statsAtLevel(hero, weapon, -3).level).toBe(1);
    expect(statsAtLevel(hero, { bullet_damage: 2, shots_per_second: 1, bullets: 8 }, 1).dps).toBe(16);
    expect(levelCount(hero)).toBe(36);
  });
  it("sin datos de nivel no revienta", () => {
    expect(statsAtLevel({ starting_stats: {} }, undefined, 5)).toMatchObject({ health: 0, dps: 0, souls: 0 });
  });
});

describe("statPosition", () => {
  const all = [100, 200, 300, 400];
  it("posición, media y barra", () => {
    const p = statPosition(300, all);
    expect(p).toMatchObject({ rank: 2, of: 4, min: 100, max: 400, avg: 250 });
    expect(p.pct).toBe(67);
    expect(p.vsAvg).toBe(20);
  });
  it("el mayor es el nº 1 y el menor el último", () => {
    expect(statPosition(400, all).rank).toBe(1);
    expect(statPosition(100, all).rank).toBe(4);
  });
  it("empates comparten puesto y todos iguales no divide por cero", () => {
    expect(statPosition(5, [5, 5, 5]).rank).toBe(1);
    expect(statPosition(5, [5, 5, 5]).pct).toBe(50);
  });
});

describe("falloffCurve", () => {
  const w = { damage_falloff_start_range: 300, damage_falloff_end_range: 670, damage_falloff_start_scale: 1, damage_falloff_end_scale: 0.5, range: 7000 };
  it("1 hasta el inicio, baja linealmente hasta el fin y se queda ahí", () => {
    const c = falloffCurve(w)!;
    expect(c[0]).toEqual({ m: 0, scale: 1 });
    expect(c.find((p) => Math.abs(p.m - 7.62) < 0.01)?.scale).toBe(1);
    expect(c.find((p) => Math.abs(p.m - 17.02) < 0.01)?.scale).toBe(0.5);
    expect(c[c.length - 1]).toEqual({ m: 40, scale: 0.5 });
  });
  it("sin datos del arma devuelve null", () => {
    expect(falloffCurve(undefined)).toBeNull();
    expect(falloffCurve({})).toBeNull();
  });
});

describe("heroAccent", () => {
  it("solo acepta #RRGGBB", () => {
    expect(heroAccent({ colors: { style_hex: "#C93C26" } })).toBe("#C93C26");
    expect(heroAccent({ colors: { style_hex: "red; background:url(x)" } })).toBeUndefined();
    expect(heroAccent({})).toBeUndefined();
  });
});
