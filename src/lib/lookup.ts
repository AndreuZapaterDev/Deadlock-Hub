import "server-only";
import { getSource } from "@/lib/api";
import { getLanguage } from "@/lib/language";
import { decodeSlug, slugify } from "@/lib/slug";
import type { Hero, Item, Npc, Rank, Season } from "@/lib/types";

// Único sitio donde se resuelven ids → entidades. Las respuestas grandes se cachean en memoria (http-source).
export async function getHeroes(): Promise<Hero[]> {
  const { data } = await getSource().get<Hero[]>("/v1/assets/heroes");
  return data.filter((h) => h.player_selectable);
}

export async function getHeroBySlug(slug: string) {
  const wanted = decodeSlug(slug);
  return (await getHeroes()).find((h) => slugify(h.name) === wanted);
}

export async function getItems(): Promise<Item[]> {
  const { data } = await getSource().get<Item[]>("/v1/assets/items");
  return data;
}

export const byId = <T extends { id: number }>(list: T[]) => new Map(list.map((x) => [x.id, x]));

/** Índices de objetos calculados una vez por idioma (los nombres cambian con él): por class_name y "quién usa este objeto como componente". */
const itemIndexes = new Map<string, Promise<{ byClass: Map<string, Item>; usedBy: Map<string, Item[]> }>>();
export async function getItemIndex() {
  const lang = await getLanguage();
  let idx = itemIndexes.get(lang);
  if (!idx) {
    idx = getItems().then((items) => {
      const byClass = new Map(items.map((i) => [i.class_name, i]));
      const usedBy = new Map<string, Item[]>();
      for (const i of items) for (const c of i.component_items ?? []) usedBy.set(c, [...(usedBy.get(c) ?? []), i]);
      return { byClass, usedBy };
    });
    idx.catch(() => itemIndexes.delete(lang));
    itemIndexes.set(lang, idx);
  }
  return idx;
}

/** Las 4 habilidades firma de un héroe (`hero.items.signature1..4`, ver 3.0 de la spec). */
export async function getHeroAbilities(hero: Hero): Promise<Item[]> {
  const { byClass } = await getItemIndex();
  return [1, 2, 3, 4].map((n) => byClass.get(hero.items[`signature${n}`])).filter((i): i is Item => !!i);
}

export async function getHeroWeapon(hero: Hero): Promise<Item | undefined> {
  return (await getItemIndex()).byClass.get(hero.items.weapon_primary);
}

export async function getRanks(): Promise<Rank[]> {
  return (await getSource().get<Rank[]>("/v1/assets/ranks")).data;
}
export async function getSeasons(): Promise<Season[]> {
  return (await getSource().get<Season[]>("/v1/assets/ranked-seasons")).data;
}
export async function getNpcs(): Promise<Npc[]> {
  return (await getSource().get<Npc[]>("/v1/assets/npc-units")).data;
}

/** id → nombre de TODOS los héroes (también los no seleccionables: el historial puede incluirlos). */
export async function getHeroNames(): Promise<Map<number, string>> {
  const { data } = await getSource().get<Hero[]>("/v1/assets/heroes");
  return new Map(data.map((h) => [h.id, h.name]));
}


export type HeroImages = { card?: string; small?: string };
let heroImages: Promise<Map<number, HeroImages>> | undefined;
/** id → retrato (carta y miniatura) de TODOS los héroes. Se calcula una vez; si falla la API, se reintenta en la siguiente petición. */
export function getHeroImages(): Promise<Map<number, HeroImages>> {
  heroImages ??= getSource()
    .get<(Hero & { images?: Record<string, string> })[]>("/v1/assets/heroes")
    .then(({ data }) => new Map(data.map((h) => [h.id, { card: h.images?.icon_hero_card_webp, small: h.images?.icon_image_small_webp }])))
    .catch(() => {
      heroImages = undefined;
      return new Map();
    });
  return heroImages;
}
