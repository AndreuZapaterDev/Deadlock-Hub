import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChartBase, SankeyChart } from "@/components/charts/lazy-charts";
import { analyticsFields } from "@/components/filters/analytics-fields";
import { FilterBar } from "@/components/filters/filter-bar";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { SortableTable } from "@/components/ui/sortable-table";
import { adjustedWinRate, winRate } from "@/lib/analytics";
import { describeFilters, hasFilters, parseFilters } from "@/lib/analytics-filters";
import { fmtDuration, fmtNum } from "@/lib/format";
import { humanize } from "@/lib/labels";
import { byId, getHeroes, getItems, getRanks } from "@/lib/lookup";
import { loadBigDays, loadBuffs, loadCombs, loadFlow, loadGameStats, loadItemStats, loadLane, loadPermutations } from "@/lib/meta-data";
import { buildFlowSankey } from "@/lib/sankey";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = { title: "Meta", description: "Objetos más fuertes, combinaciones, composiciones, power-ups y flujo de compras de Deadlock." };

const SECTIONS = [["global", "Panorama"], ["items", "Objetos"], ["combos", "Combinaciones"], ["comps", "Composiciones"], ["buffs", "Power-ups"], ["flow", "Flujo de objetos"], ["lane", "Carriles"]] as const;
const TOP = 15;

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-brass/30 bg-surface p-4 text-center shadow-card">
      <p className="font-display text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
    </div>
  );
}

export default async function MetaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [heroes, items, ranks, bigDays] = await Promise.all([getHeroes(), getItems().then(byId), getRanks(), loadBigDays()]);
  const heroName = new Map(heroes.map((h) => [h.id, h.name]));
  const sortedHeroes = [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  const flowHero = sortedHeroes.find((h) => slugify(h.name) === sp.hero) ?? heroes.find((h) => h.id === 1) ?? sortedHeroes[0];
  const itemName = (id: number) => items.get(id)?.name ?? `#${id}`;
  const tierName = (t: number) => ranks.find((r) => r.tier === t)?.name ?? `Rango ${t}`;

  const [game, itemStats, perms, combs, buffs, lane, flow] = await Promise.all([
    loadGameStats(filters), loadItemStats(filters), loadPermutations(filters), loadCombs(filters), loadBuffs(filters), loadLane(filters), loadFlow(flowHero.id, filters),
  ]);

  const g = game.ok ? game.data[0] : undefined;
  const itemRows = itemStats.ok
    ? itemStats.data.filter((r) => items.get(r.item_id)?.type === "upgrade").map((r) => ({
        id: r.item_id,
        href: `/items/${items.get(r.item_id)!.class_name}`,
        item: itemName(r.item_id),
        matches: r.matches,
        winrate: winRate(r.wins, r.matches),
        players: r.players,
        buy: Math.round(r.avg_buy_time_s),
        sold: r.matches ? r.sold / r.matches : 0,
      }))
    : [];
  const comboRows = perms.ok
    ? perms.data.filter((p) => p.matches >= 100_000).map((p) => ({ ...p, score: adjustedWinRate(p.wins, p.matches) })).sort((a, b) => b.score - a.score).slice(0, TOP)
    : [];
  const compRows = combs.ok
    ? combs.data.filter((c) => c.matches >= 5_000).map((c) => ({ ...c, score: adjustedWinRate(c.wins, c.matches) })).sort((a, b) => b.score - a.score).slice(0, TOP)
    : [];
  const buffChart = buffs.ok
    ? [...buffs.data].sort((a, b) => b.pickups - a.pickups).slice(0, 12).map((b) => ({ name: humanize(b.buff_type.replace(/_pickup$/, "")).slice(0, 18), value: Number((b.avg_first_pickup_time_s / 60).toFixed(1)) }))
    : [];
  const laneRows = lane.ok ? [...lane.data].filter((l) => l.matches_played > 0).sort((a, b) => b.matches_played - a.matches_played).slice(0, TOP) : [];
  const sankey = flow.ok ? buildFlowSankey(flow.data, itemName) : null;
  const team = (ids: number[]) => ids.map((i) => heroName.get(i) ?? `#${i}`).join(" + ");

  return (
    <div className="space-y-12">
      <PosterHeader compact title="Meta" subtitle="Lo que está funcionando ahora mismo en las partidas" />
      <Suspense fallback={null}>
        <FilterBar fields={[...analyticsFields(ranks, bigDays), { name: "hero", label: "Héroe (flujo de objetos)", type: "select", options: sortedHeroes.map((h) => ({ value: slugify(h.name), label: h.name })), allLabel: "Infernus (por defecto)" }]} />
      </Suspense>
      {hasFilters(filters) && <p className="text-sm text-ink-muted">Filtros activos: {describeFilters(filters, tierName).join(" · ")}</p>}

      <nav aria-label="Secciones" className="flex flex-wrap justify-center gap-2">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-full border border-brass/50 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-bg">{label}</a>)}
      </nav>

      <section id="global" aria-labelledby="global-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="global-t">Panorama</SectionTitle>
        {g ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat value={fmtNum(g.total_matches)} label="partidas" />
            <Stat value={fmtNum(g.total_players)} label="jugadores distintos" />
            <Stat value={fmtDuration(g.avg_duration_s)} label="duración media" />
            <Stat value={fmtNum(Math.round(g.avg_net_worth))} label="almas medias por jugador" />
          </div>
        ) : <ErrorState title="No se han podido cargar las estadísticas globales" />}
      </section>

      <section id="items" aria-labelledby="items-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="items-t">Objetos más fuertes y más comprados</SectionTitle>
        {itemStats.ok ? (
          <SortableTable
            columns={[
              { key: "item", label: "Objeto" },
              { key: "matches", label: "Partidas", numeric: true },
              { key: "winrate", label: "Win rate", numeric: true },
              { key: "players", label: "Jugadores", numeric: true },
              { key: "buy", label: "Compra media (s)", numeric: true },
              { key: "sold", label: "Vendido", numeric: true },
            ]}
            rows={itemRows}
            initialSort={{ key: "winrate", dir: "desc" }}
            format={{ matches: "num", winrate: "pct", players: "num", buy: "num", sold: "pct" }}
          />
        ) : <ErrorState title="No se han podido cargar las estadísticas de objetos" />}
        <p className="text-xs text-ink-muted">«Compra media» son los segundos de partida a los que se compra de media. «Vendido» es la proporción de partidas en las que se acaba vendiendo.</p>
      </section>

      <section id="combos" aria-labelledby="combos-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="combos-t">Mejores combinaciones de objetos</SectionTitle>
        {perms.ok ? (
          <SortableTable
            columns={[{ key: "combo", label: "Pareja de objetos" }, { key: "matches", label: "Partidas", numeric: true }, { key: "winrate", label: "Win rate", numeric: true }]}
            rows={comboRows.map((c, i) => ({ id: i, combo: c.item_ids.map(itemName).join(" + "), matches: c.matches, winrate: winRate(c.wins, c.matches) }))}
            initialSort={{ key: "winrate", dir: "desc" }}
            format={{ matches: "num", winrate: "pct" }}
          />
        ) : <ErrorState title="No se han podido cargar las combinaciones" />}
        <p className="text-xs text-ink-muted">Ordenadas por win rate ajustado, con un mínimo de 100.000 partidas para que la muestra sea fiable.</p>
      </section>

      <section id="comps" aria-labelledby="comps-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="comps-t">Mejores parejas de héroes</SectionTitle>
        {combs.ok ? (
          <SortableTable
            columns={[{ key: "team", label: "Pareja" }, { key: "matches", label: "Partidas", numeric: true }, { key: "winrate", label: "Win rate", numeric: true }]}
            rows={compRows.map((c, i) => ({ id: i, team: team(c.hero_ids), matches: c.matches, winrate: winRate(c.wins, c.matches) }))}
            initialSort={{ key: "winrate", dir: "desc" }}
            format={{ matches: "num", winrate: "pct" }}
          />
        ) : <ErrorState title="No se han podido cargar las composiciones" />}
        <p className="text-xs text-ink-muted">Composiciones de dos héroes en el mismo equipo, con un mínimo de 5.000 partidas y ordenadas por win rate ajustado.</p>
      </section>

      <section id="buffs" aria-labelledby="buffs-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="buffs-t">Power-ups: cuándo se recogen</SectionTitle>
        {buffs.ok ? (
          <Card>
            <h3 className="mb-2 font-semibold">Minuto medio de la primera recogida (los 12 más recogidos)</h3>
            <BarChartBase data={buffChart} height={300} />
          </Card>
        ) : <ErrorState title="No se han podido cargar los power-ups" />}
      </section>

      <section id="flow" aria-labelledby="flow-t" className="scroll-mt-24 space-y-4">
        <SectionTitle id="flow-t">Flujo de objetos de {flowHero.name}</SectionTitle>
        {sankey && sankey.nodes.length ? (
          <Card>
            <p className="mb-2 text-xs text-ink-muted">Los 4 objetos más comprados en cada fase de la partida (de izquierda a derecha) y cómo se pasa de uno a otro.</p>
            <SankeyChart data={sankey} />
          </Card>
        ) : <ErrorState title="No se ha podido cargar el flujo de objetos" />}
      </section>

      <section id="lane" aria-labelledby="lane-t" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3"><SectionTitle id="lane-t">Duelos de carril</SectionTitle><Chip tone="apricot">beta</Chip></div>
        {lane.ok ? (
          <SortableTable
            columns={[
              { key: "duel", label: "Dúo contra dúo" },
              { key: "matches", label: "Partidas", numeric: true },
              { key: "winrate", label: "Win rate", numeric: true },
              { key: "diff", label: "Diferencia de almas", numeric: true },
              { key: "time", label: "Medida a los", numeric: true },
            ]}
            rows={laneRows.map((l, i) => ({
              id: i,
              duel: `${team(l.hero_ids)} vs ${team(l.enemy_hero_ids)}`,
              matches: l.matches_played,
              winrate: winRate(l.wins, l.matches_played),
              diff: Math.round(l.net_worth_diff),
              time: l.sample_time_s,
            }))}
            initialSort={{ key: "matches", dir: "desc" }}
            format={{ matches: "num", winrate: "pct", diff: "num", time: "num" }}
          />
        ) : <ErrorState title="No se han podido cargar los carriles" />}
        <p className="text-xs text-ink-muted">Estadística inestable según la propia API: úsala como orientación. «Diferencia de almas» a los N segundos de partida, a favor del primer dúo.</p>
      </section>
    </div>
  );
}
