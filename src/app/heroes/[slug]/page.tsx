import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RadarChartBase } from "@/components/charts/lazy-charts";
import { AbilityCard } from "@/components/hero/ability-card";
import { FalloffChart } from "@/components/hero/falloff-chart";
import { HeroPortrait, heroPastel } from "@/components/hero/hero-card";
import { HeroMeta } from "@/components/hero/hero-meta";
import { HeroPerformance } from "@/components/hero/hero-performance";
import { HeroNav } from "@/components/hero/hero-nav";
import { LevelCalculator } from "@/components/hero/level-calculator";
import { Lore } from "@/components/hero/lore";
import { PopularItems } from "@/components/hero/popular-items";
import { StatBars, type StatRow } from "@/components/hero/stat-bars";
import { PatchHistory } from "@/components/patch/patch-history";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { SectionTitle } from "@/components/ui/section-title";
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
  const hero = await getHeroBySlug((await params).slug);
  return hero ? { title: hero.name, description: stripHtml(hero.description.role) || `Estadísticas, habilidades, nivel y meta de ${hero.name} en Deadlock.` } : {};
}

const SECTIONS = [
  { id: "resumen", label: "Resumen" },
  { id: "stats", label: "Estadísticas" },
  { id: "level", label: "Nivel" },
  { id: "abilities", label: "Habilidades" },
  { id: "items", label: "Objetos" },
  { id: "performance", label: "Rendimiento" },
  { id: "meta", label: "Meta" },
  { id: "matchups", label: "Counters" },
  { id: "board", label: "Leaderboard" },
  { id: "history", label: "Cambios" },
];

type Weapon = Record<string, number>;

export default async function HeroPage({ params }: { params: Promise<{ slug: string }> }) {
  const hero = await getHeroBySlug((await params).slug);
  if (!hero) notFound();

  const [abilities, all, { byClass }] = await Promise.all([getHeroAbilities(hero), getHeroes(), getItemIndex()]);
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
    return [{ label: s.label, text: `${s.digits !== undefined ? fmtDec(Number(v.toFixed(s.digits))) : v}${s.unit ?? ""}`, pos: statPosition(v, stat(s.key)) }];
  });

  const weaponRows: StatRow[] = w
    ? [
        { label: "Daño por segundo", text: fmtDec(w.damage_per_second), pos: statPosition(w.damage_per_second, wstat("damage_per_second")) },
        { label: "Daño por bala", text: fmtDec(w.bullet_damage) + (w.bullets > 1 ? ` × ${w.bullets}` : ""), pos: statPosition(w.bullet_damage, wstat("bullet_damage")) },
        { label: "Disparos por segundo", text: fmtDec(w.shots_per_second), pos: statPosition(w.shots_per_second, wstat("shots_per_second")) },
        { label: "Cargador", text: String(w.clip_size), pos: statPosition(w.clip_size, wstat("clip_size")) },
        { label: "Recarga", text: `${fmtDec(w.reload_duration)} s`, pos: statPosition(w.reload_duration, wstat("reload_duration")), lowerIsBetter: true },
        { label: "Daño completo hasta", text: `${fmtDec(unitsToMeters(w.damage_falloff_start_range))} m`, pos: statPosition(w.damage_falloff_start_range, wstat("damage_falloff_start_range")) },
        { label: "Daño mínimo desde", text: `${fmtDec(unitsToMeters(w.damage_falloff_end_range))} m`, pos: statPosition(w.damage_falloff_end_range, wstat("damage_falloff_end_range")) },
        { label: "Alcance máximo", text: `${Math.round(unitsToMeters(w.range))} m` },
      ]
    : [];

  // ---------- Radar frente a la media de todos los héroes ----------
  const axes = [
    { axis: "Vida", mine: hero.starting_stats.max_health?.value, all: stat("max_health") },
    { axis: "Velocidad", mine: hero.starting_stats.max_move_speed?.value, all: stat("max_move_speed") },
    { axis: "Daño/s", mine: w?.damage_per_second, all: wstat("damage_per_second") },
    { axis: "Cargador", mine: w?.clip_size, all: wstat("clip_size") },
    { axis: "Alcance", mine: w?.damage_falloff_end_range, all: wstat("damage_falloff_end_range") },
    { axis: "Movilidad", mine: hero.starting_stats.air_dash_distance_in_meters?.value, all: stat("air_dash_distance_in_meters") },
  ].filter((a) => a.mine !== undefined && a.all.length > 1);
  const radar = axes.map((a) => ({
    axis: a.axis,
    [hero.name]: normalizeAxis(a.mine!, a.all),
    "Media de héroes": normalizeAxis(a.all.reduce((x, y) => x + y, 0) / a.all.length, a.all),
  }));

  const levels = Array.from({ length: levelCount(hero) }, (_, n) => statsAtLevel(hero, w, n + 1));
  const lore = splitLore(hero.description.lore);
  const curve = falloffCurve(w);
  const facts = [
    ["Vida", hero.starting_stats.max_health ? fmtNum(hero.starting_stats.max_health.value) : null],
    ["Velocidad", hero.starting_stats.max_move_speed ? `${fmtDec(hero.starting_stats.max_move_speed.value)} m/s` : null],
    ["Daño por segundo", w ? fmtDec(w.damage_per_second) : null],
    ["Alcance efectivo", w ? `${Math.round(unitsToMeters(w.damage_falloff_end_range))} m` : null],
  ].filter((f): f is [string, string] => f[1] !== null);

  return (
    <div className="space-y-10">
      <PosterHeader compact title={hero.name} subtitle={stripHtml(hero.description.role) || undefined} color={accent ? `color-mix(in srgb, ${accent} 22%, var(--poster-ray))` : undefined}>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Chip tone={tone}>{heroTypeLabel(hero.hero_type)}</Chip>
          <Chip>Dificultad: {difficultyLabel(hero.complexity)}</Chip>
          {hero.gun_tag && <Chip>{hero.gun_tag}</Chip>}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button href={`/heroes/compare?h=${slugify(hero.name)}`} variant="secondary">Comparar con…</Button>
          <Button href={`/counters?a=${slugify(hero.name)}`} variant="ghost"><span className="text-cream">Ver counters</span></Button>
        </div>
      </PosterHeader>

      <HeroNav sections={SECTIONS} />

      <section id="resumen" aria-label="Resumen" className="scroll-mt-40 grid gap-8 lg:grid-cols-[17rem_1fr]">
        <div className="space-y-4">
          <HeroPortrait hero={hero} arch priority className="mx-auto h-72 w-64" />
          {hero.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {hero.tags.map((t) => <span key={t} className="inline-block rounded-sm bg-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-accent">{t}</span>)}
            </div>
          )}
        </div>
        <div className="space-y-6">
          {facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(([k, v]) => (
                <div key={k} className="rounded-md border border-brass/30 bg-surface p-3 text-center shadow-card">
                  <dd className="font-display text-2xl font-black tabular-nums">{v}</dd>
                  <dt className="text-xs italic text-ink-muted">{k}</dt>
                </div>
              ))}
            </dl>
          )}
          <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
            <div className="space-y-4">
              <Lore paragraphs={lore} />
              {hero.description.playstyle && (
                <Card>
                  <p className="font-semibold">Estilo de juego</p>
                  <p className="mt-1 max-w-prose text-sm text-ink-muted">{stripHtml(hero.description.playstyle)}</p>
                </Card>
              )}
            </div>
            {radar.length >= 3 && (
              <div className="rounded-md border border-brass/30 bg-surface p-3 shadow-card">
                <h3 className="px-1 font-display text-base font-black uppercase">Perfil frente a los demás</h3>
                <RadarChartBase data={radar} series={[{ key: hero.name, label: hero.name }, { key: "Media de héroes", label: "Media de héroes" }]} height={270} />
                <p className="px-1 text-[11px] text-ink-muted">Cada eje va de 0 (el héroe con menos) a 100 (el que más) entre los {all.length} héroes.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="stats" aria-labelledby="stats-t" className="scroll-mt-40 space-y-4">
        <SectionTitle id="stats-t">Estadísticas base</SectionTitle>
        <p className="text-sm text-ink-muted">La barra sitúa al héroe entre los {all.length} jugables (de la mínima a la máxima); la marca vertical es la media.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-1 font-semibold">Al empezar la partida</h3>
            <StatBars rows={baseRows} />
          </Card>
          {weaponRows.length > 0 && (
            <Card className="space-y-4">
              <h3 className="mb-1 font-semibold">Arma principal</h3>
              {curve && <FalloffChart points={curve} />}
              <StatBars rows={weaponRows} />
            </Card>
          )}
        </div>
      </section>

      <section id="level" aria-labelledby="level-t" className="scroll-mt-40 space-y-4">
        <SectionTitle id="level-t">Calculadora de nivel</SectionTitle>
        <LevelCalculator rows={levels} hasWeapon={!!w} />
      </section>

      <section id="abilities" aria-labelledby="abilities-t" className="scroll-mt-40 space-y-4">
        <SectionTitle id="abilities-t">Habilidades</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          {abilities.map((a, n) => <AbilityCard key={a.id} ability={a} n={n + 1} accent={accent} />)}
        </div>
      </section>

      <Suspense fallback={<SectionSkeleton id="items" title="Objetos más comprados" height={300} />}>
        <PopularItems hero={hero} />
      </Suspense>

      {/* Las estadísticas de meta llaman a varios endpoints pesados: llegan por streaming y el resto de la ficha no espera. */}
      <Suspense fallback={<SectionSkeleton id="performance" title="Rendimiento" height={300} />}>
        <HeroPerformance hero={hero} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton id="meta"title="Estadísticas del meta" height={420} />}>
        <HeroMeta hero={hero} abilities={abilities} />
      </Suspense>

      <Suspense fallback={null}>
        <PatchHistory kind="heroes" id={hero.id} name={hero.name} />
      </Suspense>

      <nav aria-label="Otros héroes" className="flex flex-wrap items-center justify-between gap-3 border-t border-brass/30 pt-6">
        <Link href={`/heroes/${slugify(prev.name)}`} className="link-brass font-semibold">← {prev.name}</Link>
        <Button href="/heroes" variant="secondary">Todos los héroes</Button>
        <Link href={`/heroes/${slugify(next.name)}`} className="link-brass font-semibold">{next.name} →</Link>
      </nav>
    </div>
  );
}
