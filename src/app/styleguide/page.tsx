import type { Metadata } from "next";
import { BarChartBase, LineChartBase, RadarChartBase, SankeyChart } from "@/components/charts/charts";
import { Heatmap } from "@/components/charts/heatmap";
import { Corner, Divider, Sigil, Skyline, Sunburst } from "@/components/deco";
import { HeroCard } from "@/components/hero/hero-card";
import { ItemTooltip } from "@/components/item/item-tooltip";
import { MatchRow } from "@/components/match/match-row";
import { Button } from "@/components/ui/button";
import { Card, FeaturedCard } from "@/components/ui/card";
import { CategoryChip, Chip, TONES, type Tone } from "@/components/ui/chip";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { PosterHeader } from "@/components/ui/poster-header";
import { Input } from "@/components/ui/search-box";
import { SortableTable } from "@/components/ui/sortable-table";
import { SectionTitle } from "@/components/ui/section-title";
import { Tabs } from "@/components/ui/tabs";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { getSource } from "@/lib/api";
import { fmtDuration } from "@/lib/format";
import { byId, getHeroes, getItems } from "@/lib/lookup";
import type { HeroStat, MatchHistoryRow } from "@/lib/types";

export const metadata: Metadata = { title: "Styleguide", robots: { index: false, follow: false } };

type Counter = { hero_id: number; enemy_hero_id: number; wins: number; matches_played: number };
type FlowNode = { column: number; item_id: number; matches: number };
type FlowEdge = { from_column: number; from_item_id: number; to_item_id: number; matches: number };
type Curve = { game_time: number; net_worth_avg: number; gold_lane_creep_avg: number };

const SWATCHES = ["bg", "surface", "ink", "ink-muted", "brass", "accent", "poster", "sage", "apricot", "lilac", "rose", "teal"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}

export default async function Styleguide() {
  const api = getSource();
  const [heroes, items, stats, counters, flow, curve, history] = await Promise.all([
    getHeroes(),
    getItems(),
    api.get<HeroStat[]>("/v1/analytics/hero-stats").then((r) => r.data),
    api.get<Counter[]>("/v1/analytics/hero-counter-stats").then((r) => r.data),
    api.get<{ nodes: FlowNode[]; edges: FlowEdge[] }>("/v1/analytics/item-flow-stats", { hero_ids: 1, min_matches: 500 }).then((r) => r.data),
    api.get<Curve[]>("/v1/analytics/player-performance-curve").then((r) => r.data),
    api.get<MatchHistoryRow[]>("/v1/players/483770846/match-history").then((r) => r.data),
  ]);
  const heroById = byId(heroes);
  const itemById = byId(items);
  const name = (id: number) => heroById.get(id)?.name ?? `#${id}`;

  // Barras: top 10 por win rate
  const ranked = stats.filter((s) => s.matches > 0).map((s) => ({ name: name(s.hero_id), value: s.wins / s.matches })).sort((a, b) => b.value - a.value);
  const bars = ranked.slice(0, 10);

  // Tabla: todos los héroes
  const rows = stats.map((s) => ({ id: s.hero_id, hero: name(s.hero_id), matches: s.matches, winrate: s.wins / s.matches }));

  // Línea: curva de rendimiento
  const line = curve.map((c) => ({ t: fmtDuration(c.game_time), net: Math.round(c.net_worth_avg), creeps: Math.round(c.gold_lane_creep_avg) }));

  // Radar: 3 héroes. Cada eje se normaliza min-max (0-100) entre TODOS los héroes seleccionables.
  const byClass = new Map(items.map((i) => [i.class_name, i]));
  const weapon = (h: (typeof heroes)[number]) => byClass.get(h.items.weapon_primary);
  const axes = [
    { axis: "Vida", get: (h: (typeof heroes)[number]) => h.starting_stats.max_health?.value },
    { axis: "Velocidad", get: (h: (typeof heroes)[number]) => h.starting_stats.max_move_speed?.value },
    { axis: "Cadencia", get: (h: (typeof heroes)[number]) => weapon(h)?.weapon_info?.shots_per_second },
    { axis: "Cargador", get: (h: (typeof heroes)[number]) => weapon(h)?.weapon_info?.clip_size },
    { axis: "DPS", get: (h: (typeof heroes)[number]) => weapon(h)?.weapon_info?.damage_per_second },
  ];
  const picks = heroes.slice(0, 3);
  const radar = axes.map((a) => {
    const all = heroes.map((h) => a.get(h) ?? 0);
    const [lo, hi] = [Math.min(...all), Math.max(...all)];
    const row: Record<string, string | number> = { axis: a.axis };
    for (const h of picks) row[`h${h.id}`] = hi === lo ? 50 : Math.round((((a.get(h) ?? 0) - lo) / (hi - lo)) * 100);
    return row;
  });

  // Heatmap: win rate cara a cara de los 8 héroes más jugados
  const top = [...stats].sort((a, b) => b.matches - a.matches).slice(0, 8).map((s) => s.hero_id);
  const cmap = new Map(counters.map((c) => [`${c.hero_id}-${c.enemy_hero_id}`, c.wins / c.matches_played]));
  const values = top.map((a) => top.map((b) => (a === b ? null : (cmap.get(`${a}-${b}`) ?? null))));

  // Sankey: 4 objetos más comprados por columna y sus transiciones
  const cols = [0, 1, 2, 3].map((c) => flow.nodes.filter((n) => n.column === c).sort((a, b) => b.matches - a.matches).slice(0, 4));
  const nodes = cols.flat().map((n) => ({ name: itemById.get(n.item_id)?.name ?? `#${n.item_id}`, column: n.column }));
  const idx = new Map(cols.flat().map((n, i) => [`${n.column}-${n.item_id}`, i]));
  const links = flow.edges
    .map((e) => ({ source: idx.get(`${e.from_column}-${e.from_item_id}`), target: idx.get(`${e.from_column + 1}-${e.to_item_id}`), value: e.matches }))
    .filter((l): l is { source: number; target: number; value: number } => l.source !== undefined && l.target !== undefined);

  const sample = ["weapon", "vitality", "spirit"].map((cat) => items.find((i) => i.type === "upgrade" && i.item_slot_type === cat && i.item_tier === 3 && i.shopable && i.description?.desc)!);
  const tones = Object.keys(TONES) as Tone[];

  return (
    <div className="space-y-12">
      <PosterHeader title="Styleguide" subtitle="Sistema de diseño · usa el interruptor Día/Noche de la cabecera" />

      <Section title="Paleta">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SWATCHES.map((s) => (
            <div key={s} className="overflow-hidden rounded-md border border-brass/30">
              <div className="h-14" style={{ background: `var(--${s})` }} />
              <p className="px-2 py-1 text-xs">{s}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <Card className="space-y-2">
          <p className="font-display text-4xl font-black uppercase tracking-[0.06em]">Título display</p>
          <p className="font-serif text-xl italic">Subtítulo en serif elegante</p>
          <p>Texto y datos en sans legible. <span className="font-semibold">1.234.567</span> · 52,4 % · 40:14</p>
          <p className="text-sm text-ink-muted">Texto secundario en ink-muted.</p>
        </Card>
      </Section>

      <Section title="Botones, inputs y chips">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primario</Button><Button variant="secondary">Secundario</Button><Button variant="ghost">Fantasma</Button><Button disabled>Desactivado</Button>
        </div>
        <Input aria-label="Ejemplo de input" placeholder="Input de ejemplo" className="max-w-sm" />
        <div className="flex flex-wrap gap-2">
          {tones.map((t) => <Chip key={t} tone={t}>{t}</Chip>)}
          <CategoryChip category="weapon" /><CategoryChip category="vitality" /><CategoryChip category="spirit" />
        </div>
      </Section>

      <Section title="Tarjetas y ornamentos">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>Tarjeta normal: borde simple y sombra suave.</Card>
          <FeaturedCard>Tarjeta destacada con marco de latón de doble línea y esquinas achaflanadas.</FeaturedCard>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="relative h-32 overflow-hidden rounded-md border border-brass/30"><Sunburst /></div>
          <div className="relative flex h-32 items-center justify-center rounded-md border border-brass/30"><Sigil className="h-24 w-24" /></div>
          <div className="relative h-32 rounded-md border border-brass/30"><Corner className="left-2 top-2" /><Corner className="bottom-2 right-2" rotate={180} /></div>
          <div className="flex h-32 items-center rounded-md border border-brass/30 px-3"><Divider /></div>
        </div>
        <Skyline className="h-28" />
      </Section>

      <Section title="Tarjeta de héroe (cartel de teatro)">
        <div className="grid gap-4 sm:grid-cols-3">{heroes.slice(0, 3).map((h) => <HeroCard key={h.id} hero={h} />)}</div>
      </Section>

      <Section title="Tooltip de objeto (pasa el ratón o usa Tab)">
        <div className="flex flex-wrap gap-3 pb-40">{sample.map((i) => <ItemTooltip key={i.id} item={i} />)}</div>
      </Section>

      <Section title="Fila de historial de partida">
        <div className="space-y-2">{history.slice(0, 3).map((m) => <MatchRow key={m.match_id} match={m} hero={heroById.get(m.hero_id)} />)}</div>
      </Section>

      <Section title="Tabla ordenable">
        <SortableTable
          columns={[{ key: "hero", label: "Héroe" }, { key: "matches", label: "Partidas", numeric: true }, { key: "winrate", label: "Win rate", numeric: true }]}
          rows={rows}
          initialSort={{ key: "winrate", dir: "desc" }}
          format={{ winrate: "pct" }}
        />
      </Section>

      <Section title="Pestañas, paginación y estados">
        <Tabs tabs={[{ id: "a", label: "Resumen", content: <p>Contenido de la primera pestaña (←/→ para moverte).</p> }, { id: "b", label: "Detalle", content: <p>Segunda pestaña.</p> }]} />
        <Pagination page={3} pages={12} href={(p) => `?page=${p}`} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24" /><Skeleton className="h-4 w-1/2" /></div>
          <EmptyState title="Sin builds publicadas" hint="Este jugador aún no ha compartido ninguna build." />
          <ErrorState title="Perfil privado o protegido" hint="No podemos mostrar los datos de esta cuenta." />
        </div>
      </Section>

      <Section title="Movimiento">
        <p className="max-w-prose text-sm text-ink-muted">
          Todo respeta <code>prefers-reduced-motion</code>. Con CSS: letras del título, rayos, filete, bombillas y ventanas del skyline. Con Motion: aparición al hacer scroll y contadores.
          Recarga la página para ver la secuencia de carga del cartel de arriba.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Reveal><Card><p className="font-semibold">rise</p><p className="text-sm text-ink-muted">Sube y aparece una vez.</p></Card></Reveal>
          <Reveal variant="curtain" delay={0.12}><Card><p className="font-semibold">curtain</p><p className="text-sm text-ink-muted">Se despega como un cartel.</p></Card></Reveal>
          <Card className="text-center"><p className="font-display text-3xl font-black"><CountUp value={6831723} /></p><p className="font-serif text-sm italic text-ink-muted">CountUp</p></Card>
        </div>
      </Section>

      <Section title="Gráficas">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card><h3 className="mb-2 font-semibold">Barras · win rate (top 10)</h3><BarChartBase data={bars} percent /></Card>
          <Card><h3 className="mb-2 font-semibold">Líneas · almas por minuto de partida</h3><LineChartBase data={line} xKey="t" series={[{ key: "net", label: "Patrimonio" }, { key: "creeps", label: "Almas de tropas" }]} /></Card>
          <Card><h3 className="mb-2 font-semibold">Radar · {picks.map((h) => h.name).join(" vs ")}</h3><RadarChartBase data={radar} series={picks.map((h) => ({ key: `h${h.id}`, label: h.name }))} /></Card>
          <Card><h3 className="mb-2 font-semibold">Heatmap · win rate cara a cara (%)</h3><Heatmap rows={top.map(name)} cols={top.map(name)} values={values} /></Card>
        </div>
        <Card><h3 className="mb-2 font-semibold">Sankey · flujo de objetos de {name(1)}</h3><SankeyChart data={{ nodes, links }} /></Card>
      </Section>
    </div>
  );
}
