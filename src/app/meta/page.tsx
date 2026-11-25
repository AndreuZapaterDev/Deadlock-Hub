import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarChartBase, SankeyChart } from "@/components/charts/lazy-charts";
import { analyticsFields } from "@/components/filters/analytics-fields";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroChip } from "@/components/hero/hero-chip";
import { ItemIcon } from "@/components/item/item-tile";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { RateMeter } from "@/components/ui/rate-meter";
import { SectionTitle } from "@/components/ui/section-title";
import { SortableTable } from "@/components/ui/sortable-table";
import { PRIOR_MATCHES } from "@/lib/analytics";
import { describeFilters, hasFilters, parseFilters, type AnalyticsFilters } from "@/lib/analytics-filters";
import { fmtDec, fmtDuration, fmtNum, fmtPct } from "@/lib/format";
import { humanize } from "@/lib/labels";
import { LANE_PRIOR, rankDuos, toDuos } from "@/lib/lanes";
import { byId, getHeroes, getItems, getRanks } from "@/lib/lookup";
import { loadBuffs, loadBigDays, loadCombs, loadFlow, loadGameStats, loadHeroMeta, loadItemStats, loadLaneDuos, loadPermutations } from "@/lib/meta-data";
import { rankSamples, sampleFloor, usageShare } from "@/lib/meta-insights";
import { buildFlowSankey } from "@/lib/sankey";
import { slugify } from "@/lib/slug";
import type { Category, Hero, Item } from "@/lib/types";

export const metadata: Metadata = { title: "Meta", description: "Héroes y objetos más fuertes, combinaciones, composiciones, power-ups, carriles y flujo de compras de Deadlock." };

const SECTIONS = [["global", "Panorama"], ["items", "Objetos"], ["combos", "Combinaciones"], ["comps", "Composiciones"], ["buffs", "Power-ups"], ["flow", "Flujo de objetos"], ["lane", "Carriles"]] as const;
const CATS: [Category, string][] = [["weapon", "Arma"], ["vitality", "Vitalidad"], ["spirit", "Espíritu"]];
const CAT_LABEL = Object.fromEntries(CATS) as Record<Category, string>;
const TOP = 8;

type Sp = Record<string, string | undefined>;
type Ctx = { filters: AnalyticsFilters; sp: Sp; heroes: Hero[]; items: Map<number, Item> };

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-brass/30 bg-surface p-4 text-center shadow-card">
      <p className="font-display text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
    </div>
  );
}

const rateTone = (adjusted: number) => (adjusted >= 0.5 ? "text-sage-ink" : "text-rose-ink");
const ListTitle = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div><h3 className="font-semibold">{children}</h3>{hint && <p className="text-xs text-ink-muted">{hint}</p>}</div>
);

// ---------- Panorama: partidas y héroes del momento ----------
async function Overview({ filters, heroes }: Ctx) {
  const [game, meta] = await Promise.all([loadGameStats(filters), loadHeroMeta(filters)]);
  const g = game.ok ? game.data[0] : undefined;
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const rows = meta.ok ? meta.data.rows.filter((r) => names.has(r.id) && r.matches >= 1000) : [];
  const lists = [
    { title: "Mejor win rate", rows: [...rows].sort((a, b) => b.adjusted - a.adjusted), note: (r: (typeof rows)[number]) => `${fmtPct(r.winRate)} win rate` },
    { title: "Más jugados", rows: [...rows].sort((a, b) => b.pickRate - a.pickRate), note: (r: (typeof rows)[number]) => `${fmtPct(r.pickRate)} pick rate` },
    { title: "Más vetados", rows: [...rows].filter((r) => r.banRate !== null).sort((a, b) => (b.banRate ?? 0) - (a.banRate ?? 0)), note: (r: (typeof rows)[number]) => `${fmtPct(r.banRate ?? 0)} ban rate` },
  ];
  return (
    <>
      {g ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat value={fmtNum(g.total_matches)} label="partidas" />
          <Stat value={fmtNum(g.total_players)} label="jugadores distintos" />
          <Stat value={fmtDuration(g.avg_duration_s)} label="duración media" />
          <Stat value={fmtDec(g.avg_kills)} label="bajas medias por jugador" />
          <Stat value={fmtNum(Math.round(g.avg_net_worth))} label="almas medias por jugador" />
        </div>
      ) : <ErrorState title="No se han podido cargar las estadísticas globales" />}
      {meta.ok && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Héroes del momento</h3>
            <Link href="/tier-list" className="link-brass text-sm font-semibold">Ver la tier list completa</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {lists.map((l) => (
              <div key={l.title} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{l.title}</p>
                <ul className="space-y-1.5">
                  {l.rows.slice(0, 5).map((r) => <li key={r.id}><HeroChip id={r.id} name={names.get(r.id)!} note={l.note(r)} /></li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Objetos ----------
async function ItemsSection({ filters, sp, items, heroes }: Ctx) {
  const itemHero = heroes.find((h) => slugify(h.name) === sp.item_hero);
  const [stats, game] = await Promise.all([loadItemStats(filters, itemHero?.id), loadGameStats(filters)]);
  if (!stats.ok) return <ErrorState title="No se han podido cargar las estadísticas de objetos" />;

  // Con un héroe elegido, el total son las partidas de ese héroe: lo más cercano es el máximo de compras de cualquier objeto
  const total = itemHero ? stats.data.reduce((m, r) => Math.max(m, r.matches), 0) : game.ok ? (game.data[0]?.total_matches ?? 0) : 0;
  const cat = CATS.find(([c]) => c === sp.cat)?.[0];
  const tier = [1, 2, 3, 4].find((t) => String(t) === sp.tier);
  const all = stats.data
    .map((r) => ({ stat: r, item: items.get(r.item_id) }))
    .filter((x): x is { stat: (typeof stats.data)[number]; item: Item } => x.item?.type === "upgrade");
  const shown = all.filter((x) => (!cat || x.item.item_slot_type === cat) && (!tier || x.item.item_tier === tier));

  const floor = sampleFloor(shown.map((x) => ({ matches: x.stat.matches })), 0.1, 500);
  const ranked = rankSamples(shown.map((x) => ({ ...x, wins: x.stat.wins, matches: x.stat.matches })), "strong", TOP, floor, PRIOR_MATCHES);
  const used = [...shown].sort((a, b) => b.stat.matches - a.stat.matches).slice(0, TOP);

  const href = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ ...sp, ...extra }).filter((e): e is [string, string] => !!e[1]));
    return `/meta${q.size ? `?${q}` : ""}#items`;
  };
  const pill = (active: boolean) => `rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${active ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`;

  const itemLine = (item: Item, note: React.ReactNode, tone?: string, rate?: number, rank?: number) => (
    <li key={item.id}>
      <Link href={`/items/${item.class_name}`} className="flex items-center gap-2.5 rounded-md border border-brass/30 bg-surface p-1.5 pr-3 shadow-card transition-colors hover:bg-brass/10">
        {rank !== undefined && <span className="w-5 shrink-0 text-center font-display text-sm font-black text-brass">{rank}</span>}
        <ItemIcon item={item} size={40} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight">{item.name}</span>
          <span className={`block text-xs tabular-nums ${tone ?? "text-ink-muted"}`}>{note}</span>
        </span>
        {rate !== undefined && <span className="ml-auto w-16 shrink-0"><RateMeter rate={rate} /></span>}
      </Link>
    </li>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar objetos">
        <Link href={href({ cat: undefined })} aria-current={!cat ? "true" : undefined} className={pill(!cat)}>Todas las categorías</Link>
        {CATS.map(([c, label]) => <Link key={c} href={href({ cat: c })} aria-current={cat === c ? "true" : undefined} className={pill(cat === c)}>{label}</Link>)}
        <span aria-hidden className="mx-1 h-5 w-px bg-brass/40" />
        <Link href={href({ tier: undefined })} aria-current={!tier ? "true" : undefined} className={pill(!tier)}>Todos los tiers</Link>
        {[1, 2, 3, 4].map((t) => <Link key={t} href={href({ tier: String(t) })} aria-current={tier === t ? "true" : undefined} className={pill(tier === t)}>Tier {t}</Link>)}
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Sin objetos con estos filtros" hint="Prueba con otra categoría o tier." />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <ListTitle hint={`Por win rate ajustado, con al menos ${fmtNum(floor)} partidas.`}>Los más fuertes</ListTitle>
              <ul className="space-y-1.5">{ranked.map((r, i) => itemLine(r.item, `${fmtPct(r.rate)} win rate · ${fmtPct(usageShare(r.stat.matches, total))} de las partidas`, rateTone(r.adjusted), r.rate, i + 1))}</ul>
            </div>
            <div className="space-y-2">
              <ListTitle hint="Los que más veces se compran.">Los más comprados</ListTitle>
              <ul className="space-y-1.5">{used.map((x, i) => itemLine(x.item, `${fmtPct(usageShare(x.stat.matches, total))} de las partidas · ${fmtPct(x.stat.wins / Math.max(1, x.stat.matches))} win rate`, undefined, x.stat.wins / Math.max(1, x.stat.matches), i + 1))}</ul>
            </div>
          </div>
          <SortableTable
            columns={[
              { key: "item", label: "Objeto" },
              { key: "cat", label: "Categoría" },
              { key: "tier", label: "Tier", numeric: true },
              { key: "matches", label: "Partidas", numeric: true },
              { key: "usage", label: "Uso", numeric: true },
              { key: "winrate", label: "Win rate", numeric: true },
              { key: "adjusted", label: "Ajustado", numeric: true },
              { key: "buy", label: "Compra media (min)", numeric: true },
              { key: "sold", label: "Vendido", numeric: true },
            ]}
            rows={shown.map(({ stat, item }) => ({
              id: item.id,
              href: `/items/${item.class_name}`,
              item: item.name,
              cat: item.item_slot_type ? CAT_LABEL[item.item_slot_type] : "—",
              tier: item.item_tier ?? 0,
              matches: stat.matches,
              usage: usageShare(stat.matches, total),
              winrate: stat.matches ? stat.wins / stat.matches : 0,
              adjusted: (stat.wins + PRIOR_MATCHES / 2) / (stat.matches + PRIOR_MATCHES),
              buy: stat.avg_buy_time_s / 60,
              sold: stat.matches ? stat.sold / stat.matches : 0,
            }))}
            initialSort={{ key: "adjusted", dir: "desc" }}
            format={{ matches: "num", usage: "pct", winrate: "pct", adjusted: "pct", buy: "dec", sold: "pct" }}
          />
        </>
      )}
      <p className="text-xs text-ink-muted">
        «Uso» = % de partidas en las que se compra. «Ajustado» = win rate con {fmtNum(PRIOR_MATCHES)} partidas ficticias al 50 %, para que pocas partidas no den un valor extremo. «Compra media» son los minutos de partida a los que se compra de media; «Vendido», la proporción de partidas en las que se acaba vendiendo.
      </p>
    </>
  );
}

// ---------- Combinaciones de objetos y parejas de héroes: mejores y peores ----------
async function ItemCombos({ filters, items }: Ctx) {
  const perms = await loadPermutations(filters);
  if (!perms.ok) return <ErrorState title="No se han podido cargar las combinaciones" />;
  const floor = sampleFloor(perms.data, 0.05, 500);
  const best = rankSamples(perms.data, "strong", TOP, floor, PRIOR_MATCHES);
  const worst = rankSamples(perms.data, "weak", TOP, floor, PRIOR_MATCHES);
  if (best.length === 0) return <EmptyState title="Sin combinaciones con muestra suficiente" hint="Prueba con menos filtros." />;
  const row = (r: (typeof best)[number], i: number) => (
    <li key={i} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-1.5 pr-3 shadow-card">
      <span className="w-5 shrink-0 text-center font-display text-sm font-black text-brass">{i + 1}</span>
      <span className="flex shrink-0 -space-x-2">{r.item_ids.map((id) => items.get(id) && <ItemIcon key={id} item={items.get(id)!} size={36} className="ring-2 ring-surface" />)}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{r.item_ids.map((id) => items.get(id)?.name ?? `#${id}`).join(" + ")}</span>
        <span className={`block text-xs tabular-nums ${rateTone(r.adjusted)}`}>{fmtPct(r.rate)} win rate · {fmtNum(r.matches)} partidas</span>
      </span>
      <span className="ml-auto w-16 shrink-0"><RateMeter rate={r.rate} /></span>
    </li>
  );
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2"><ListTitle>Mejores parejas de objetos</ListTitle><ul className="space-y-1.5">{best.map(row)}</ul></div>
        <div className="space-y-2"><ListTitle>Peores parejas de objetos</ListTitle><ul className="space-y-1.5">{worst.map(row)}</ul></div>
      </div>
      <p className="text-xs text-ink-muted">Ordenadas por win rate ajustado, con un mínimo de {fmtNum(floor)} partidas (se adapta a los filtros).</p>
    </>
  );
}

async function HeroPairs({ filters, heroes }: Ctx) {
  const combs = await loadCombs(filters);
  if (!combs.ok) return <ErrorState title="No se han podido cargar las composiciones" />;
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const valid = combs.data.filter((c) => c.hero_ids.every((i) => names.has(i)));
  const floor = sampleFloor(valid, 0.05, 300);
  const best = rankSamples(valid, "strong", TOP, floor, PRIOR_MATCHES);
  const worst = rankSamples(valid, "weak", TOP, floor, PRIOR_MATCHES);
  if (best.length === 0) return <EmptyState title="Sin parejas con muestra suficiente" hint="Prueba con menos filtros." />;
  const row = (r: (typeof best)[number], i: number) => (
    <li key={i} className="space-y-1.5 rounded-md border border-brass/30 bg-surface p-1.5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 text-center font-display text-sm font-black text-brass">{i + 1}</span>
        <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">{r.hero_ids.map((id) => <HeroChip key={id} id={id} name={names.get(id)!} />)}</div>
      </div>
      <div className="flex items-center gap-3 px-1 pb-0.5">
        <p className={`text-xs tabular-nums ${rateTone(r.adjusted)}`}>{fmtPct(r.rate)} win rate · {fmtNum(r.matches)} partidas</p>
        <span className="ml-auto w-20"><RateMeter rate={r.rate} /></span>
      </div>
    </li>
  );
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2"><ListTitle>Mejores parejas</ListTitle><ul className="space-y-1.5">{best.map(row)}</ul></div>
        <div className="space-y-2"><ListTitle>Peores parejas</ListTitle><ul className="space-y-1.5">{worst.map(row)}</ul></div>
      </div>
      <p className="text-xs text-ink-muted">Dos héroes en el mismo equipo, con un mínimo de {fmtNum(floor)} partidas y ordenadas por win rate ajustado. Todas las parejas, en <Link href="/counters?view=synergy" className="link-brass font-semibold">sinergias</Link>.</p>
    </>
  );
}

// ---------- Power-ups ----------
async function Buffs({ filters }: Ctx) {
  const buffs = await loadBuffs(filters);
  if (!buffs.ok) return <ErrorState title="No se han podido cargar los power-ups" />;
  const top = [...buffs.data].sort((a, b) => b.pickups - a.pickups).slice(0, 12);
  const label = (b: (typeof top)[number]) => humanize(b.buff_type.replace(/_pickup$/, "")).slice(0, 18);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-2 font-semibold">Los más recogidos</h3>
        <BarChartBase data={top.map((b) => ({ name: label(b), value: b.pickups }))} height={300} />
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">Minuto medio de la primera recogida</h3>
        <BarChartBase data={top.map((b) => ({ name: label(b), value: Number((b.avg_first_pickup_time_s / 60).toFixed(1)) }))} height={300} />
      </Card>
    </div>
  );
}

// ---------- Flujo de objetos ----------
async function Flow({ filters, items, flowHero }: Ctx & { flowHero: Hero }) {
  const flow = await loadFlow(flowHero.id, filters);
  const sankey = flow.ok ? buildFlowSankey(flow.data, (id) => items.get(id)?.name ?? `#${id}`) : null;
  return sankey && sankey.nodes.length ? (
    <Card>
      <p className="mb-2 text-xs text-ink-muted">Los 4 objetos más comprados en cada fase de la partida (de izquierda a derecha) y cómo se pasa de uno a otro.</p>
      <SankeyChart data={sankey} />
    </Card>
  ) : <ErrorState title="No se ha podido cargar el flujo de objetos" />;
}

// ---------- Carriles: resumen, el análisis completo está en /lanes ----------
async function LaneSummary({ filters, heroes }: Ctx) {
  const lane = await loadLaneDuos(filters);
  if (!lane.ok) return <ErrorState title="No se han podido cargar los carriles" />;
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const duos = toDuos(lane.data).filter((d) => d.ids.every((i) => names.has(i)));
  if (duos.length === 0) return <EmptyState title="Sin carriles con muestra suficiente" hint="Prueba con menos filtros." />;
  const list = (title: string, mode: "strong" | "weak") => (
    <div className="space-y-2">
      <ListTitle>{title}</ListTitle>
      <ul className="space-y-1.5">
        {rankDuos(duos, mode, 5).map((d, n) => (
          <li key={d.ids.join("-")} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface px-3 py-2 shadow-card">
            <span className="w-5 shrink-0 text-center font-display text-sm font-black text-brass">{n + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{d.ids.map((i) => names.get(i)).join(" + ")}</span>
              <span className={`block text-xs tabular-nums ${rateTone(d.adjusted)}`}>{fmtPct(d.rate)} win rate · {fmtNum(d.matches)} carriles</span>
            </span>
            <span className="w-16 shrink-0"><RateMeter rate={d.rate} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">{list("Parejas más fuertes en carril", "strong")}{list("Parejas más débiles en carril", "weak")}</div>
      <p className="text-xs text-ink-muted">Ajustado con {fmtNum(LANE_PRIOR)} carriles ficticios al 50 %. Estadística inestable según la propia API. <Link href="/lanes" className="link-brass font-semibold">Ver el análisis completo de carriles</Link>.</p>
    </>
  );
}

export default async function MetaPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [heroes, itemList, ranks, bigDays] = await Promise.all([getHeroes(), getItems(), getRanks(), loadBigDays()]);
  const items = byId(itemList);
  const sortedHeroes = [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  const flowHero = sortedHeroes.find((h) => slugify(h.name) === sp.hero) ?? heroes.find((h) => h.id === 1) ?? sortedHeroes[0];
  const tierName = (t: number) => ranks.find((r) => r.tier === t)?.name ?? `Rango ${t}`;
  const ctx: Ctx = { filters, sp, heroes, items };
  // Cada sección llega por streaming; la clave hace que vuelva a mostrar su esqueleto al cambiar filtros
  const key = JSON.stringify(sp);

  const sections: { id: string; title: string; intro: string; badge?: string; body: React.ReactNode }[] = [
    { id: "global", title: "Panorama", intro: "Cuánto se juega y qué héroes dominan ahora mismo.", body: <Overview {...ctx} /> },
    { id: "items", title: "Objetos más fuertes y más comprados", intro: "Qué se compra más y qué objetos acompañan más victorias. Filtra por categoría, tier o héroe.", body: <ItemsSection {...ctx} /> },
    { id: "combos", title: "Mejores y peores combinaciones de objetos", intro: "Parejas de objetos que, compradas juntas, mejor y peor resultado dan.", body: <ItemCombos {...ctx} /> },
    { id: "comps", title: "Mejores y peores parejas de héroes", intro: "Qué dos héroes rinden mejor (y peor) en el mismo equipo.", body: <HeroPairs {...ctx} /> },
    { id: "buffs", title: "Power-ups: cuántos se recogen y cuándo", intro: "Qué power-ups se recogen más y en qué minuto de media.", body: <Buffs {...ctx} /> },
    { id: "flow", title: `Flujo de objetos de ${flowHero.name}`, intro: "La ruta de compras típica de un héroe, fase a fase.", body: <Flow {...ctx} flowHero={flowHero} /> },
    { id: "lane", title: "Carriles", intro: "Un adelanto de los dúos de carril. El análisis completo tiene su propia página.", badge: "beta", body: <LaneSummary {...ctx} /> },
  ];

  return (
    <div className="space-y-12">
      <PosterHeader compact title="Meta" subtitle="Lo que está funcionando ahora mismo en las partidas" />
      <Suspense fallback={null}>
        <FilterBar fields={[...analyticsFields(ranks, bigDays), { name: "hero", label: "Héroe (flujo de objetos)", type: "select", options: sortedHeroes.map((h) => ({ value: slugify(h.name), label: h.name })), allLabel: "Infernus (por defecto)" }, { name: "item_hero", label: "Héroe (objetos)", type: "select", options: sortedHeroes.map((h) => ({ value: slugify(h.name), label: h.name })), allLabel: "Todos los héroes" }]} />
      </Suspense>
      {hasFilters(filters) && <p className="text-sm text-ink-muted">Filtros activos: {describeFilters(filters, tierName).join(" · ")}</p>}

      <nav aria-label="Secciones" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:flex-wrap lg:justify-center">
        {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-brass/50 px-4 py-1.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass">{label}</a>)}
      </nav>

      {sections.map((s, n) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="scroll-mt-40 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span aria-hidden className="font-display text-sm font-black tabular-nums text-brass">{String(n + 1).padStart(2, "0")}</span>
              <SectionTitle id={`${s.id}-t`}>{s.title}</SectionTitle>
              {s.badge && <Chip tone="apricot">{s.badge}</Chip>}
            </div>
            <p className="max-w-prose text-sm text-ink-muted">{s.intro}</p>
          </div>
          <Suspense key={key} fallback={<Skeleton className="h-72 w-full rounded-md" />}>{s.body}</Suspense>
        </section>
      ))}
    </div>
  );
}
