import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BuildPlanner } from "@/components/tools/build-planner";
import { PosterHeader } from "@/components/ui/poster-header";
import { decodeBuild, itemEffects, type BaseStats, type PlannerHero, type PlannerItem } from "@/lib/build-planner";
import { getHeroes, getItemIndex, getItems } from "@/lib/lookup";
import { slugify } from "@/lib/slug";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("planner");
  return { title: t("title"), description: t("metaDesc") };
}

export default async function BuildPlannerPage({ searchParams }: { searchParams: Promise<{ h?: string; i?: string }> }) {
  const sp = await searchParams;
  const t = await getTranslations("planner");
  const [heroes, all, { byClass }] = await Promise.all([getHeroes(), getItems(), getItemIndex()]);

  const plannerHeroes: PlannerHero[] = [...heroes]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((h) => {
      const w = byClass.get(h.items.weapon_primary)?.weapon_info;
      const s = (k: string) => h.starting_stats[k]?.value ?? 0;
      const base: BaseStats = {
        health: s("max_health"), regen: s("base_health_regen"), move: s("max_move_speed"), sprint: s("sprint_speed"), stamina: s("stamina"),
        dps: w?.damage_per_second ?? 0, bulletDamage: w?.bullet_damage ?? 0, shotsPerSecond: w?.shots_per_second ?? 0, clip: w?.clip_size ?? 0,
      };
      return { slug: slugify(h.name), name: h.name, base };
    });

  // Solo los objetos de la tienda de los tiers 1 a 4 (como en /items)
  const plannerItems: PlannerItem[] = all
    .filter((i) => i.type === "upgrade" && i.shopable && i.item_slot_type && i.item_tier && i.item_tier <= 4)
    .map((i) => {
      const e = itemEffects(i);
      return { c: i.class_name, n: i.name, cat: i.item_slot_type!, tier: i.item_tier!, cost: i.cost ?? 0, active: !!i.is_active_item, fx: e.effects, unknown: e.unknown, innate: e.hasInnate };
    });

  // El estado de la URL se valida contra el catálogo: un enlace viejo o manipulado siempre da un estado válido
  const initial = decodeBuild(sp, new Map(plannerItems.map((i) => [i.c, { cat: i.cat }])), new Set(plannerHeroes.map((h) => h.slug)));

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      <BuildPlanner heroes={plannerHeroes} items={plannerItems} initial={initial} />
    </div>
  );
}
