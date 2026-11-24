import { humanize } from "@/lib/labels";
import { stripHtml } from "@/lib/format";
import type { Item, ItemProperty } from "@/lib/types";

export type Stat = { label: string; text: string };
export type Section = { type: string; text?: string; stats: Stat[] };

const isZero = (v: unknown) => v === undefined || v === null || v === "" || parseFloat(String(v)) === 0;
/** La API a veces ya incluye la unidad en el valor ("20m" con postfix "m"): no se duplica. */
export const propText = (p: ItemProperty) => {
  const v = String(p.value);
  return p.postfix && !v.endsWith(p.postfix) ? v + p.postfix : v;
};

function toStat(item: Item, key: string): Stat | null {
  const p = item.properties?.[key];
  if (!p || !p.label || p.label.startsWith("#") || isZero(p.value)) return null;
  return { label: p.label, text: propText(p) };
}

/** Bonificaciones, efecto activo y pasivo de un objeto, según sus `tooltip_sections`. El texto del juego se limpia de HTML. */
export function itemSections(item: Item): Section[] {
  const out: Section[] = [];
  for (const s of item.tooltip_sections ?? []) {
    const sec: Section = { type: s.section_type, stats: [] };
    for (const a of s.section_attributes) {
      if (a.loc_string) sec.text = [sec.text, stripHtml(a.loc_string)].filter(Boolean).join(" ");
      for (const k of a.properties ?? []) {
        const st = toStat(item, k);
        if (st) sec.stats.push(st);
      }
    }
    if (sec.text || sec.stats.length) out.push(sec);
  }
  return out;
}

const ABILITY_KEYS = ["AbilityCooldown", "AbilityCharges", "AbilityDuration", "AbilityChannelTime", "AbilityCastRange", "AbilityCastDelay"];

/** Números clave de una habilidad (enfriamiento, cargas, duración…), sin los que valen 0. */
export const abilityStats = (item: Item): Stat[] => ABILITY_KEYS.map((k) => toStat(item, k)).filter((s): s is Stat => !!s);

/** Mejoras T1/T2/T3 de una habilidad: lista de "propiedad +bonus" por nivel. */
export function abilityUpgrades(item: Item): Stat[][] {
  return (item.upgrades ?? []).map((u) =>
    (u.property_upgrades ?? []).map((pu) => {
      const p = item.properties?.[pu.name];
      const n = Number(pu.bonus);
      const sign = n > 0 && !String(pu.bonus).startsWith("+") ? "+" : "";
      return { label: p?.label && !p.label.startsWith("#") ? p.label : humanize(pu.name), text: `${sign}${pu.bonus}${p?.postfix && !String(pu.bonus).endsWith(p.postfix) ? p.postfix : ""}` };
    }),
  );
}

/** Estadísticas de un objeto cuando no hay `tooltip_sections` (respaldo). */
export const plainStats = (item: Item, max = 6): Stat[] =>
  Object.keys(item.properties ?? {}).map((k) => toStat(item, k)).filter((s): s is Stat => !!s).slice(0, max);
