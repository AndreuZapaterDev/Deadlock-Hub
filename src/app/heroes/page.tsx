import type { Metadata } from "next";
import Link from "next/link";
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
import { DIFFICULTY, HERO_TYPE, heroTypeLabel, unitsToMeters } from "@/lib/labels";
import { getHeroes, getItemIndex } from "@/lib/lookup";
import { loadHeroMeta } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";
import type { Hero } from "@/lib/types";

export const metadata: Metadata = { title: "Héroes", description: "Todos los héroes de Deadlock: tier, win rate, estadísticas base, arma y habilidades. Filtra, ordena y compara." };

type Params = { q?: string; type?: string; difficulty?: string; gun?: string; tier?: string; sort?: string; vista?: string };

const SORTS = {
  name: { label: "Nombre (A–Z)" },
  winrate: { label: "Win rate" },
  pick: { label: "Pick rate" },
  health: { label: "Vida" },
  dps: { label: "Daño por segundo" },
  difficulty: { label: "Dificultad" },
} as const;
type SortKey = keyof typeof SORTS;

export default async function HeroesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", type = "", difficulty = "", gun = "", tier = "", sort = "", vista = "" } = await searchParams;
  const [all, meta, { byClass }] = await Promise.all([getHeroes(), loadHeroMeta({}), getItemIndex()]);
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
      type: heroTypeLabel(h.hero_type),
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
    <div className="space-y-6 pb-20">
      <PosterHeader compact title="Héroes" subtitle={`${all.length} héroes jugables, cada uno con su estilo`} />
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            { name: "q", label: "Buscar", type: "search", placeholder: "Nombre, rol o etiqueta" },
            { name: "type", label: "Tipo", type: "select", options: Object.entries(HERO_TYPE).map(([value, label]) => ({ value, label })) },
            { name: "difficulty", label: "Dificultad", type: "select", options: Object.entries(DIFFICULTY).map(([value, label]) => ({ value, label })) },
            { name: "gun", label: "Arma", type: "select", options: guns.map((g) => ({ value: g, label: g })) },
            ...(meta.ok ? [{ name: "tier", label: "Tier", type: "select" as const, options: TIERS.map((t) => ({ value: t, label: `Tier ${t}` })) }] : []),
            { name: "sort", label: "Ordenar por", type: "select", allLabel: SORTS.name.label, options: Object.entries(SORTS).filter(([k]) => k !== "name" && (meta.ok || (k !== "winrate" && k !== "pick"))).map(([value, s]) => ({ value, label: s.label })) },
            { name: "vista", label: "Vista", type: "select", allLabel: "Tarjetas", options: [...(meta.ok ? [{ value: "tiers", label: "Por tier" }] : []), { value: "tabla", label: "Tabla" }] },
          ]}
        />
      </Suspense>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-ink-muted">
        <p aria-live="polite" className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span><strong className="text-ink">{heroes.length}</strong> {heroes.length === 1 ? "héroe" : "héroes"}{heroes.length !== all.length && ` de ${all.length}`}</span>
        </p>
        {/* Ruta que redirige (route handler): navegación completa, no del router de cliente. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/heroes/random" className="inline-flex items-center gap-1.5 rounded-full border border-brass/60 px-3 py-1 font-semibold text-ink hover:bg-brass/15">🎲 Héroe aleatorio</a>
      </div>
      <p className="-mt-3 text-xs text-ink-muted">
        {meta.ok ? <>Tier calculado con el win rate ajustado de <Link href="/tier-list" className="link-brass">la tier list</Link>.</> : "Las estadísticas de meta no están disponibles ahora mismo."}
      </p>

      {heroes.length === 0 ? (
        <EmptyState title="Ningún héroe coincide" hint="Prueba con otra búsqueda o quita algún filtro." />
      ) : table ? (
        <SortableTable
          columns={[
            { key: "hero", label: "Héroe" },
            { key: "type", label: "Tipo" },
            { key: "difficulty", label: "Dificultad", numeric: true },
            { key: "health", label: "Vida", numeric: true },
            { key: "speed", label: "Velocidad", numeric: true },
            { key: "dps", label: "Daño/s", numeric: true },
            { key: "range", label: "Alcance (m)", numeric: true },
            ...(meta.ok ? [{ key: "tier", label: "Tier" }, { key: "winrate", label: "Win rate", numeric: true }, { key: "pick", label: "Pick rate", numeric: true }] : []),
          ]}
          rows={rows}
          initialSort={{ key: sortKey === "winrate" ? "winrate" : sortKey === "pick" ? "pick" : sortKey === "health" ? "health" : sortKey === "dps" ? "dps" : sortKey === "difficulty" ? "difficulty" : "hero", dir: sortKey === "name" || sortKey === "difficulty" ? "asc" : "desc" }}
          format={{ winrate: "pct", pick: "pct", dps: "dec", speed: "dec", range: "dec" }}
        />
      ) : vista === "tiers" && meta.ok ? (
        <div className="space-y-8">
          {TIERS.map((t) => {
            const group = heroes.filter((h) => stats.get(h.id)?.tier === t);
            if (group.length === 0) return null;
            return (
              <section key={t} aria-label={`Tier ${t}`} className="flex gap-4">
                <TierBadge tier={t} size="lg" />
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
      <CompareTray />
    </div>
  );
}

