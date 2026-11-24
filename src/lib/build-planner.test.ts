import { describe, expect, it } from "vitest";
import { computeBuild, costSummary, decodeBuild, describeEffects, encodeBuild, itemEffects, moveItem, type BaseStats, type Effects } from "./build-planner";
import type { Item } from "./types";

const item = (props: Record<string, string | number>, innateKeys: string[], extra: Partial<Item> = {}): Item => ({
  type: "upgrade", id: 1, class_name: "x", name: "X", heroes: [],
  properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, { value: v, label: k }])),
  tooltip_sections: [{ section_type: "innate", section_attributes: [{ properties: innateKeys }] }],
  ...extra,
});

const base: BaseStats = { health: 800, regen: 2, move: 7, sprint: 1.5, stamina: 3, dps: 50, bulletDamage: 5, shotsPerSecond: 10, clip: 20 };
const row = (rows: ReturnType<typeof computeBuild>, k: string) => rows.find((r) => r.key === k)!;

describe("itemEffects", () => {
  it("traduce las bonificaciones fijas a efectos", () => {
    const e = itemEffects(item({ BonusHealth: 125, BaseAttackDamagePercent: "8%" }, ["BonusHealth", "BaseAttackDamagePercent"]));
    expect(e.effects).toEqual({ health: 125, weaponDmg: 8 });
    expect(e.hasInnate).toBe(true);
  });
  it("entiende valores con la unidad dentro (\"0.75m\", \"8%\") y negativos", () => {
    const e = itemEffects(item({ BonusSprintSpeed: "0.75m", BonusMoveSpeed: "-0.5m" }, ["BonusSprintSpeed", "BonusMoveSpeed"]));
    expect(e.effects).toEqual({ sprint: 0.75, move: -0.5 });
  });
  it("suma propiedades que son el mismo efecto (varias claves de poder espiritual)", () => {
    const e = itemEffects(item({ TechPower: 7, SpiritPower: 3 }, ["TechPower", "SpiritPower"]));
    expect(e.effects.spirit).toBe(10);
  });
  it("cuenta las propiedades fijas que no sabe interpretar y no las suma", () => {
    const e = itemEffects(item({ BonusHealth: 10, ReduceFootstepSound: "-50%" }, ["BonusHealth", "ReduceFootstepSound"]));
    expect(e.effects).toEqual({ health: 10 });
    expect(e.unknown).toBe(1);
  });
  it("ignora lo que no está en la sección innate (efectos activos/pasivos condicionales)", () => {
    const i = item({ BonusHealth: 100, Damage: 500 }, ["BonusHealth"]);
    i.tooltip_sections!.push({ section_type: "active", section_attributes: [{ properties: ["Damage"] }] });
    expect(itemEffects(i).effects).toEqual({ health: 100 });
  });
  it("un objeto sin sección innate no aporta nada y lo indica", () => {
    const e = itemEffects({ type: "upgrade", id: 2, class_name: "y", name: "Y", heroes: [], properties: {}, tooltip_sections: [{ section_type: "active", section_attributes: [] }] });
    expect(e).toEqual({ effects: {}, unknown: 0, hasInnate: false });
  });
  it("ignora valores 0", () => {
    expect(itemEffects(item({ BonusHealth: 0 }, ["BonusHealth"])).effects).toEqual({});
  });
});

describe("computeBuild", () => {
  it("sin objetos devuelve la base", () => {
    const r = computeBuild(base, []);
    expect(row(r, "health").total).toBe(800);
    expect(row(r, "dps").total).toBe(50);
    expect(row(r, "bulletResist").total).toBe(0);
  });
  it("vida = (base + fija) × (1 + %)", () => {
    expect(row(computeBuild(base, [{ health: 200 }, { healthPct: -10 }]), "health").total).toBeCloseTo(900, 5); // (800+200)×0.9
  });
  it("DPS = base × (1 + %daño) × (1 + %cadencia); el daño por bala solo usa el daño", () => {
    const r = computeBuild(base, [{ weaponDmg: 20 }, { fireRate: 10 }]);
    expect(row(r, "dps").total).toBeCloseTo(50 * 1.2 * 1.1, 5);
    expect(row(r, "bullet").total).toBeCloseTo(6, 5);
    expect(row(r, "sps").total).toBeCloseTo(11, 5);
  });
  it("las resistencias se apilan multiplicando: dos de 20 % dan 36 %, no 40 %", () => {
    expect(row(computeBuild(base, [{ bulletResist: 20 }, { bulletResist: 20 }]), "bulletResist").total).toBeCloseTo(36, 5);
  });
  it("las resistencias nunca llegan a 100 % aunque se acumulen", () => {
    const many: Effects[] = Array.from({ length: 6 }, () => ({ spiritResist: 40 }));
    expect(row(computeBuild(base, many), "spiritResist").total).toBeLessThan(100);
  });
  it("el cargador se redondea y el poder espiritual se suma", () => {
    const r = computeBuild(base, [{ clip: 30, spirit: 7 }, { spirit: 5 }]);
    expect(row(r, "clip").total).toBe(26);
    expect(row(r, "spirit").total).toBe(12);
  });
  it("velocidades en m/s se suman, también las negativas", () => {
    expect(row(computeBuild(base, [{ move: -0.5, sprint: 0.75 }]), "move").total).toBe(6.5);
    expect(row(computeBuild(base, [{ sprint: 0.75 }]), "sprint").total).toBe(2.25);
  });
});

describe("costSummary", () => {
  const items = [{ cat: "weapon" as const, cost: 800 }, { cat: "spirit" as const, cost: 1600 }, { cat: "weapon" as const, cost: 3200 }];
  it("total, por categoría y acumulado en orden de compra", () => {
    expect(costSummary(items)).toEqual({ total: 5600, byCategory: { weapon: 4000, vitality: 0, spirit: 1600 }, steps: [800, 2400, 5600] });
  });
  it("vacío", () => expect(costSummary([]).total).toBe(0));
});

describe("estado en la URL", () => {
  const catalog = new Map([["a", { cat: "weapon" as const }], ["b", { cat: "weapon" as const }], ["c", { cat: "spirit" as const }]]);
  const heroes = new Set(["infernus", "seven"]);
  it("codifica y decodifica (ida y vuelta)", () => {
    const q = encodeBuild("infernus", ["a", "c", "b"]);
    expect(q).toBe("h=infernus&i=a%2Cc%2Cb");
    expect(decodeBuild(Object.fromEntries(new URLSearchParams(q)), catalog, heroes)).toEqual({ hero: "infernus", items: ["a", "c", "b"] });
  });
  it("descarta objetos desconocidos y repetidos, y un héroe inexistente", () => {
    expect(decodeBuild({ h: "noexiste", i: "a,zzz,a,c" }, catalog, heroes)).toEqual({ hero: undefined, items: ["a", "c"] });
  });
  it("no pasa del máximo por categoría", () => {
    const big = new Map(Array.from({ length: 10 }, (_, i) => [`w${i}`, { cat: "weapon" as const }]));
    const sp = { i: Array.from({ length: 10 }, (_, i) => `w${i}`).join(",") };
    expect(decodeBuild(sp, big, heroes).items).toHaveLength(6);
  });
  it("sin parámetros: estado vacío", () => {
    expect(decodeBuild({}, catalog, heroes)).toEqual({ hero: undefined, items: [] });
    expect(encodeBuild(undefined, [])).toBe("");
  });
});

describe("moveItem", () => {
  it("sube y baja una posición", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });
  it("en los extremos no hace nada y no muta el original", () => {
    const l = ["a", "b"];
    expect(moveItem(l, 0, -1)).toBe(l);
    expect(moveItem(l, 1, 1)).toBe(l);
    expect(moveItem(l, 5, 1)).toBe(l);
  });
});

describe("describeEffects", () => {
  it("muestra los efectos más grandes con signo y unidad", () => {
    expect(describeEffects({ health: 125, weaponDmg: 8, regen: 1 })).toBe("+125 vida · +8 % daño de arma · +1/s regeneración");
  });
  it("los negativos usan el signo menos, y se limita a `max`", () => {
    expect(describeEffects({ move: -0.5, health: 100 }, 1)).toBe("+100 vida");
    expect(describeEffects({ move: -0.5 })).toBe("−0.5 m/s movimiento");
  });
  it("sin efectos: cadena vacía", () => expect(describeEffects({})).toBe(""));
});

describe("propiedades elevadas (regresión)", () => {
  // Extra Health y Extended Magazine llevan su bonificación principal como `elevated_properties`, no como `properties`
  const elevated = (props: Record<string, number>, normal: string[], high: string[]): Item => ({
    type: "upgrade", id: 3, class_name: "z", name: "Z", heroes: [],
    properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, { value: v, label: k }])),
    tooltip_sections: [{ section_type: "innate", section_attributes: [{ properties: normal, elevated_properties: high }] }],
  });
  it("suma también las elevadas", () => {
    const e = itemEffects(elevated({ BonusHealth: 210, BonusMeleeDamagePercent: 5 }, ["BonusMeleeDamagePercent"], ["BonusHealth"]));
    expect(e.effects).toEqual({ health: 210, melee: 5 });
  });
  it("una clave que está en las dos listas no se cuenta dos veces", () => {
    expect(itemEffects(elevated({ BonusHealth: 100 }, ["BonusHealth"], ["BonusHealth"])).effects).toEqual({ health: 100 });
  });
});
