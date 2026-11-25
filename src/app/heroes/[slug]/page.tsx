import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RadarChartBase } from "@/components/charts/lazy-charts";
import { AbilityCard } from "@/components/hero/ability-card";
import { FalloffChart } from "@/components/hero/falloff-chart";
import { HeroPortrait, heroPastel } from "@/components/hero/hero-card";
import { HeroMeta } from "@/components/hero/hero-meta";
import { HeroPerformance } from "@/components/hero/hero-performance";
import { LevelCalculator } from "@/components/hero/level-calculator";
import { Lore } from "@/components/hero/lore";
import { PopularItems } from "@/components/hero/popular-items";
import { StatBars, type StatRow } from "@/components/hero/stat-bars";
import { PatchHistory } from "@/components/patch/patch-history";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/panel";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { SectionTitle } from "@/components/ui/section-title";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { normalizeAxis } from "@/lib/analytics";
import { fmtDec, fmtNum, stripHtml } from "@/lib/format";
import { falloffCurve, heroAccent, levelCount, splitLore, statPosition, statsAtLevel } from "@/lib/hero-stats";
import { difficultyLabel, HERO_STATS, heroTypeLabel, unitsToMeters } from "@/lib/labels";
import { getHeroAbilities, getHeroBySlug, getHeroes, getItemIndex } from "@/lib/lookup";
import { slugify } from "@/lib/slug";
import { Suspense } from "react";

export const revalidate = 1800; // 30 min: los assets cambian con un parche (12 h) pero la ficha incluye estadísticas de meta (30 min)

export async function generateStaticParams() {
  return (await getHeroes()).map((h) => ({ slug: slugify(h.name) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [hero, t] = await Promise.all([getHeroBySlug((await params).slug), getTranslations("heroPage")]);
  return hero ? { title: hero.name, description: stripHtml(hero.description.role) || t("metaDesc", { name: hero.name }) } : {};
}

type Weapon = Record<string, number>;

export default async function HeroPage({ params }: { params: Promise<{ slug: string }> }) {
  const hero = await getHeroBySlug((await params).slug);
  if (!hero) notFound();

  const [abilities, all, { byClass }, t, tl, tu] = await Promise.all([getHeroAbilities(hero), getHeroes(), getItemIndex(), getTranslations("heroPage"), getTranslations("labels"), getTranslations("heroUi")]);
  const weaponOf = (h: { items: Record<string, string> }) => byClass.get(h.items.weapon_primary)?.weapon_info as Weapon | undefined;
  const w = weaponOf(hero);
  const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
  const i = sorted.findIndex((h) => h.id === hero.id);
  const [prev, next] = [sorted[(i - 1 + sorted.length) % sorted.length], sorted[(i + 1) % sorted.length]];
  const tone = heroPastel(hero).tone;
  const accent = heroAccent(hero);

  // ---------- Posición frente a los demás héroes ----------
  const stat = (key: string) => all.map((h) => h.starting_stats[key]?.value).filter((v): v is number => v !== undefined);
  const wstat = (key: string) => all.map((h) => weaponOf(h)?.[key]).filter((v): v is number => v !== undefined);

  const baseRows: StatRow[] = HERO_STATS.flatMap((s) => {
    const v = hero.starting_stats[s.key]?.value;
    if (v === undefined) return [];
    return [{ label: tl(`stat_${s.key}`), text: `${s.digits !== undefined ? fmtDec(Number(v.toFixed(s.digits))) : v}${s.unit ?? ""}`, pos: statPosition(v, stat(s.key)) }];
  });

  const weaponRows: StatRow[] = w
    ? [
        { label: tu("dps"), text: fmtDec(w.damage_per_second), pos: statPosition(w.damage_per_second, wstat("damage_per_second")) },
        { label: tu("bulletDamage"), text: fmtDec(w.bullet_damage) + (w.bullets > 1 ? ` × ${w.bullets}` : ""), pos: statPosition(w.bullet_damage, wstat("bullet_damage")) },
        { label: t("shotsPerSecond"), text: fmtDec(w.shots_per_second), pos: statPosition(w.shots_per_second, wstat("shots_per_second")) },
        { label: t("clip"), text: String(w.clip_size), pos: statPosition(w.clip_size, wstat("clip_size")) },
        { label: t("reload"), text: `${fmtDec(w.reload_duration)} s`, pos: statPosition(w.reload_duration, wstat("reload_duration")), lowerIsBetter: true },
        { label: t("fullDamageUntil"), text: `${fmtDec(unitsToMeters(w.damage_falloff_start_range))} m`, pos: statPosition(w.damage_falloff_start_range, wstat("damage_falloff_start_range")) },
        { label: t("minDamageFrom"), text: `${fmtDec(unitsToMeters(w.damage_falloff_end_range))} m`, pos: statPosition(w.damage_falloff_end_range, wstat("damage_falloff_end_range")) },
        { label: t("maxRange"), text: `${Math.round(unitsToMeters(w.range))} m` },
      ]
    : [];

  // ---------- Radar frente a la media de todos los héroes ----------
  const axes = [
    { axis: tu("health"), mine: hero.starting_stats.max_health?.value, all: stat("max_health") },
    { axis: t("axisSpeed"), mine: hero.starting_stats.max_move_speed?.value, all: stat("max_move_speed") },
    { axis: t("axisDps"), mine: w?.damage_per_second, all: wstat("damage_per_second") },
    { axis: t("clip"), mine: w?.clip_size, all: wstat("clip_size") },
    { axis: t("axisRange"), mine: w?.damage_falloff_end_range, all: wstat("damage_falloff_end_range") },
    { axis: t("axisMobility"), mine: hero.starting_stats.air_dash_distance_in_meters?.value, all: stat("air_dash_distance_in_meters") },
  ].filter((a) => a.mine !== undefined && a.all.length > 1);
  const radar = axes.map((a) => ({
    axis: a.axis,
    [hero.name]: normalizeAxis(a.mine!, a.all),
    [t("heroAverage")]: normalizeAxis(a.all.reduce((x, y) => x + y, 0) / a.all.length, a.all),
  }));

  const levels = Array.from({ length: levelCount(hero) }, (_, n) => statsAtLevel(hero, w, n + 1));
  const lore = splitLore(hero.description.lore);
  const curve = falloffCurve(w);
  const facts = [
    [tu("health"), hero.starting_stats.max_health ? fmtNum(hero.starting_stats.max_health.value) : null],
    [t("axisSpeed"), hero.starting_stats.max_move_speed ? `${fmtDec(hero.starting_stats.max_move_speed.value)} m/s` : null],
    [tu("dps"), w ? fmtDec(w.damage_per_second) : null],
    [t("effectiveRange"), w ? `${Math.round(unitsToMeters(w.damage_falloff_end_range))} m` : null],
  ].filter((f): f is [string, string] => f[1] !== null);

  return (
    <div className="space-y-10">
      <PosterHeader compact title={hero.name} subtitle={stripHtml(hero.description.role) || undefined} color={accent ? `color-mix(in srgb, ${accent} 22%, var(--poster-ray))` : undefined}>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Chip tone={tone}>{heroTypeLabel(tl, hero.hero_type)}</Chip>
          <Chip>{t("difficultyChip", { value: difficultyLabel(tl, hero.complexity) })}</Chip>
          {hero.gun_tag && <Chip>{hero.gun_tag}</Chip>}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button href={`/heroes/compare?h=${slugify(hero.name)}`} variant="secondary">{t("compareWith")}</Button>
          <Button href={`/counters?a=${slugify(hero.name)}`} variant="ghost"><span className="text-cream">{t("seeCounters")}</span></Button>
        </div>
      </PosterHeader>

      <Tabs syncHash sticky label={t("tabsLabel")} tabs={[
        {
          id: "resumen",
          label: t("tabSummary"),
          content: (
            <section id="resumen" aria-label={t("tabSummary")} className="grid gap-8 lg:grid-cols-[19rem_1fr]">
              {/* Columna del retrato: el arco grande con su marco y las etiquetas del héroe debajo */}
              <div className="space-y-4">
                <div className="relative mx-auto w-fit pb-2">
                  <HeroPortrait hero={hero} arch priority className="h-80 w-72" />
                  <span aria-hidden className="absolute -bottom-0 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-brass" />
                </div>
                {hero.tags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {hero.tags.map((t) => <span key={t} className="inline-block rounded-sm bg-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-accent">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-6">
                {facts.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {facts.map(([k, v]) => <Stat key={k} value={v} label={k} />)}
                  </div>
                )}
                <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
                  <div className="space-y-5">
                    <Panel title={t("story")}>
                      <Lore paragraphs={lore} />
                    </Panel>
                    {hero.description.playstyle && (
                      <Panel title={t("playstyle")}>
                        <p className="max-w-prose text-sm leading-relaxed text-ink-muted">{stripHtml(hero.description.playstyle)}</p>
                      </Panel>
                    )}
                  </div>
                  {radar.length >= 3 && (
                    <Panel title={t("profile")} className="self-start">
                      <RadarChartBase data={radar} series={[{ key: hero.name, label: hero.name }, { key: t("heroAverage"), label: t("heroAverage") }]} height={270} />
                      <p className="text-[11px] text-ink-muted">{t("radarNote", { count: all.length })}</p>
                    </Panel>
                  )}
                </div>
              </div>
            </section>
          ),
        },
        {
          id: "stats",
          label: t("tabStats"),
          content: (
            <div className="space-y-10">
              <section id="stats" aria-labelledby="stats-t" className="scroll-mt-40 space-y-4">
                <SectionTitle id="stats-t">{t("baseStats")}</SectionTitle>
                <p className="text-sm text-ink-muted">{t("baseNote", { count: all.length })}</p>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Panel title={t("atStart")}>
                    <StatBars rows={baseRows} />
                  </Panel>
                  {weaponRows.length > 0 && (
                    <Panel title={t("mainWeapon")} className="space-y-4">
                      {curve && <FalloffChart points={curve} />}
                      <StatBars rows={weaponRows} />
                    </Panel>
                  )}
                </div>
              </section>
              <section id="level" aria-labelledby="level-t" className="scroll-mt-40 space-y-4">
                <SectionTitle id="level-t">{t("levelCalc")}</SectionTitle>
                <LevelCalculator rows={levels} hasWeapon={!!w} />
              </section>
            </div>
          ),
        },
        {
          id: "abilities",
          label: t("tabAbilities"),
          content: (
            <div className="space-y-10">
              <section id="abilities" aria-labelledby="abilities-t" className="scroll-mt-40 space-y-4">
                <SectionTitle id="abilities-t">{t("abilities")}</SectionTitle>
                <div className="grid gap-6 md:grid-cols-2">
                  {abilities.map((a, n) => <AbilityCard key={a.id} ability={a} n={n + 1} accent={accent} />)}
                </div>
              </section>
              <Suspense fallback={<SectionSkeleton id="order" title={t("abilityOrder")} height={260} />}>
                <HeroMeta hero={hero} abilities={abilities} parts={["order"]} />
              </Suspense>
            </div>
          ),
        },
        {
          id: "items",
          label: t("tabItems"),
          content: (
            <div className="space-y-10">
              <Suspense fallback={<SectionSkeleton id="items" title={t("mostBought")} height={300} />}>
                <PopularItems hero={hero} />
              </Suspense>
              <Suspense fallback={<SectionSkeleton id="builds" title={t("popularBuilds")} height={260} />}>
                <HeroMeta hero={hero} abilities={abilities} parts={["builds", "flow"]} />
              </Suspense>
            </div>
          ),
        },
        {
          id: "meta",
          label: t("tabMeta"),
          content: (
            <div className="space-y-10">
              {/* Las estadísticas de meta llaman a varios endpoints pesados: llegan por streaming y el resto de la ficha no espera. */}
              <Suspense fallback={<SectionSkeleton id="meta" title={t("metaStats")} height={200} />}>
                <HeroMeta hero={hero} abilities={abilities} parts={["meta"]} />
              </Suspense>
              <Suspense fallback={<SectionSkeleton id="performance" title={t("performance")} height={300} />}>
                <HeroPerformance hero={hero} />
              </Suspense>
              <Suspense fallback={null}>
                <PatchHistory kind="heroes" id={hero.id} name={hero.name} />
              </Suspense>
            </div>
          ),
        },
        {
          id: "rivals",
          label: t("tabRivals"),
          content: (
            <Suspense fallback={<SectionSkeleton id="matchups" title={t("matchups")} height={360} />}>
              <HeroMeta hero={hero} abilities={abilities} parts={["matchups", "board"]} />
            </Suspense>
          ),
        },
      ]} />

      <nav aria-label={t("otherHeroes")} className="flex flex-wrap items-center justify-between gap-3 border-t border-brass/30 pt-6">
        <Link href={`/heroes/${slugify(prev.name)}`} className="link-brass font-semibold">← {prev.name}</Link>
        <Button href="/heroes" variant="secondary">{t("allHeroes")}</Button>
        <Link href={`/heroes/${slugify(next.name)}`} className="link-brass font-semibold">{next.name} →</Link>
      </nav>
    </div>
  );
}
