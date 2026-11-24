import { describe, expect, it } from "vitest";
import { itemSections, propText } from "./item-sections";
import type { Item } from "./types";

const item = (high: string[], normal: string[]): Item => ({
  type: "upgrade", id: 1, class_name: "x", name: "X", heroes: [],
  properties: { BonusClipSizePercent: { value: "30", postfix: "%", label: "Max Ammo" }, BaseAttackDamagePercent: { value: "8", postfix: "%", label: "Weapon Damage" } },
  tooltip_sections: [{ section_type: "innate", section_attributes: [{ properties: normal, elevated_properties: high }] }],
});

describe("itemSections", () => {
  it("incluye las propiedades elevadas (la estadística principal de Extended Magazine) y las pone primero", () => {
    const [sec] = itemSections(item(["BonusClipSizePercent"], ["BaseAttackDamagePercent"]));
    expect(sec.stats).toEqual([{ label: "Max Ammo", text: "30%" }, { label: "Weapon Damage", text: "8%" }]);
  });
  it("sin duplicados si una clave está en las dos listas", () => {
    const [sec] = itemSections(item(["BonusClipSizePercent"], ["BonusClipSizePercent"]));
    expect(sec.stats).toHaveLength(1);
  });
});

describe("propText", () => {
  it("añade la unidad si falta y no la duplica si ya viene en el valor", () => {
    expect(propText({ value: "8", postfix: "%" })).toBe("8%");
    expect(propText({ value: "20m", postfix: "m" })).toBe("20m");
    expect(propText({ value: 5 })).toBe("5");
  });
});
