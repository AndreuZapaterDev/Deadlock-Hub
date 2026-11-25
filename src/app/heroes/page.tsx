import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { CompareTray } from "@/components/hero/compare-tray";
import { HeroCard, type HeroCardStat } from "@/components/hero/hero-card";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SortableTable } from "@/components/ui/sortable-table";
import { TierBadge } from "@/components/ui/tier-badge";
import { assignTiers, TIERS } from "@/lib/analytics";
import { DIFFICULTIES, HERO_TYPES, difficultyLabel, heroTypeLabel, unitsToMeters } from "@/lib/labels";
import { getHeroes, getItemIndex } from "@/lib/lookup";
import { loadHeroMeta } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";
import type { Hero } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("heroes");
  return { title: t("title"), description: t("metaDesc") };
}

type Params = { q?: string; type?: string; difficulty?: string; gun?: string; tier?: string; sort?: string; vista?: string };

// Clave de cada criterio → clave del texto en los mensajes («heroes.<clave>»)
const SORTS = { name: "sortName", winrate: "sortWinrate", pick: "sortPick", health: "sortHealth", dps: "sortDps", difficulty: "sortDifficulty" } as const;
type SortKey = keyof typeof SORTS;

export default async function HeroesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", type = "", difficulty = "", gun = "", tier = "", sort = "", vista = "" } = await searchParams;
  const [all, meta, { byClass }, t, tl] = await Promise.all([getHeroes(), loadHeroMeta({}), getItemIndex(), getTranslations("heroes"), getTranslations("labels")]);
  const guns = [...new Set(all.map((h) => h.gun_tag).filter((g): g is string => !!g))].sort();

  // Meta de cada héroe (si la API de estadísticas falla, las tarjetas se muestran igual sin esos datos)
  const ids = new Set(all.map((h) => h.id));
  const ranked = meta.ok ? assignTiers(meta.data.rows.filter((r) => ids.has(r.id)).map((r) => ({ ...r, score: r.adjusted }))) : [];
  const stats = new Map(ranked.map((r) => [r.id, r]));
  const statOf = (h: Hero): HeroCardStat | null => {
    const r = stats.get(h.id);
    return r ? { tier: r.tier, winRate: r.winRate, pickRate: r.pickRate } : null;
  };
  const dpsOf = (h: Hero) => (byClass.get(h.items.weapon_primary)?.weapon_info as Record<string, number> | undefined)?.damage_per_second ?? 0;

  const sortKey: SortKey = sort in SORTS ? (sort as SortKey) : "name";
  const term = q.toLowerCase();
  const heroes = all
    .filter((h) => (!type || h.hero_type === type) && (!difficulty || String(h.complexity) === difficulty) && (!gun || h.gun_tag === gun))
    .filter((h) => !tier || stats.get(h.id)?.tier === tier)
    .filter((h) => !term || [h.name, h.description.role, h.gun_tag, ...h.tags].some((s) => s?.toLowerCase().includes(term)))
    .sort((a, b) => {
      const by: Record<SortKey, number> = {
        name: 0,
        winrate: (stats.get(b.id)?.winRate ?? 0) - (stats.get(a.id)?.winRate ?? 0),
        pick: (stats.get(b.id)?.pickRate ?? 0) - (stats.get(a.id)?.pickRate ?? 0),
        health: (b.starting_stats.max_health?.value ?? 0) - (a.starting_stats.max_health?.value ?? 0),
        dps: dpsOf(b) - dpsOf(a),
        difficulty: a.complexity - b.complexity,
      };
      return by[sortKey] || a.name.localeCompare(b.name);
    });

  const table = vista === "tabla";
  const rows = heroes.map((h) => {
    const s = stats.get(h.id);
    const w = byClass.get(h.items.weapon_primary)?.weapon_info as Record<string, number> | undefined;
    return {
      id: h.id,
      hero: h.name,
      href: `/heroes/${slugify(h.name)}`,
      type: heroTypeLabel(tl, h.hero_type),
      difficulty: h.complexity,
      health: h.starting_stats.max_health?.value ?? 0,
      speed: h.starting_stats.max_move_speed?.value ?? 0,
      dps: w?.damage_per_second ?? 0,
      range: w ? unitsToMeters(w.damage_falloff_end_range) : 0,
      tier: s?.tier ?? "—",
      winrate: s?.winRate ?? 0,
      pick: s?.pickRate ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle", { count: all.length })} />
      <CompareTray />
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            { name: "q", label: t("search"), type: "search", placeholder: t("searchPlaceholder") },
            { name: "type", label: t("type"), type: "select", options: HERO_TYPES.map((value) => ({ value, label: heroTypeLabel(tl, value) })) },
            { name: "difficulty", label: t("difficulty"), type: "select", options: DIFFICULTIES.map((n) => ({ value: String(n), label: difficultyLabel(tl, n) })) },
            { name: "gun", label: t("gun"), type: "select", options: guns.map((g) => ({ value: g, label: g })) },
            ...(meta.ok ? [{ name: "tier", label: t("tier"), type: "select" as const, options: TIERS.map((x) => ({ value: x, label: t("tierN", { tier: x }) })) }] : []),
            { name: "sort", label: t("sortBy"), type: "select", allLabel: t(SORTS.name), options: Object.entries(SORTS).filter(([k]) => k !== "name" && (meta.ok || (k !== "winrate" && k !== "pick"))).map(([value, key]) => ({ value, label: t(key) })) },
            { name: "vista", label: t("view"), type: "select", allLabel: t("viewCards"), options: [...(meta.ok ? [{ value: "tiers", label: t("viewTiers") }] : []), { value: "tabla", label: t("viewTable") }] },
          ]}
        />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-ink-muted">
        <p aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{t.rich(heroes.length === all.length ? "count" : "countOf", { count: heroes.length, total: all.length, b: (c) => <strong className="text-ink">{c}</strong> })}</span>
        </p>
        {/* Ruta que redirige (route handler): navegación completa, no del router de cliente. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/heroes/random" className="inline-flex items-center gap-1.5 rounded-full border border-brass/60 px-3 py-1 font-semibold text-ink hover:bg-brass/15">{t("random")}</a>
      </div>
      <p className="-mt-3 text-xs text-ink-muted">
        {meta.ok ? t.rich("tierNote", { link: (c) => <Link href="/tier-list" className="link-brass">{c}</Link> }) : t("noMeta")}
      </p>

      {heroes.length === 0 ? (
        <EmptyState title={t("noMatch")} hint={t("noMatchHint")} />
      ) : table ? (
        <SortableTable
          columns={[
            { key: "hero", label: t("colHero") },
            { key: "type", label: t("colType") },
            { key: "difficulty", label: t("colDifficulty"), numeric: true },
            { key: "health", label: t("colHealth"), numeric: true },
            { key: "speed", label: t("colSpeed"), numeric: true },
            { key: "dps", label: t("colDps"), numeric: true },
            { key: "range", label: t("colRange"), numeric: true },
            ...(meta.ok ? [{ key: "tier", label: t("colTier") }, { key: "winrate", label: t("colWin"), numeric: true }, { key: "pick", label: t("colPick"), numeric: true }] : []),
          ]}
          rows={rows}
          initialSort={{ key: sortKey === "winrate" ? "winrate" : sortKey === "pick" ? "pick" : sortKey === "health" ? "health" : sortKey === "dps" ? "dps" : sortKey === "difficulty" ? "difficulty" : "hero", dir: sortKey === "name" || sortKey === "difficulty" ? "asc" : "desc" }}
          format={{ winrate: "pct", pick: "pct", dps: "dec", speed: "dec", range: "dec" }}
        />
      ) : vista === "tiers" && meta.ok ? (
        <div className="space-y-8">
          {TIERS.map((tr) => {
            const group = heroes.filter((h) => stats.get(h.id)?.tier === tr);
            if (group.length === 0) return null;
            return (
              <section key={tr} aria-label={t("tierN", { tier: tr })} className="flex gap-4">
                <TierBadge tier={tr} size="lg" />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.map((h) => <HeroCard key={h.id} hero={h} href={`/heroes/${slugify(h.name)}`} stat={statOf(h)} selectable compact />)}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {heroes.map((h, i) => (
            <Reveal key={h.id} delay={(i % 3) * 0.08} className="h-full">
              <HeroCard hero={h} href={`/heroes/${slugify(h.name)}`} stat={statOf(h)} selectable compact priority={i < 10} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

