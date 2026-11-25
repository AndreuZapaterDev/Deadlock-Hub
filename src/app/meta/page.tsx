import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BarChartBase, SankeyChart } from "@/components/charts/lazy-charts";
import { analyticsFields } from "@/components/filters/analytics-fields";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroChip } from "@/components/hero/hero-chip";
import { ItemIcon } from "@/components/item/item-tile";
import { Card } from "@/components/ui/card";
import { CATEGORIES, Chip } from "@/components/ui/chip";
import { ActiveFilters } from "@/components/ui/explainer";
import { pillClass } from "@/components/ui/pill";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Panel } from "@/components/ui/panel";
import { PosterHeader } from "@/components/ui/poster-header";
import { Rank } from "@/components/ui/rank";
import { RateMeter } from "@/components/ui/rate-meter";
import { SectionTitle } from "@/components/ui/section-title";
import { SortableTable } from "@/components/ui/sortable-table";
import { PRIOR_MATCHES } from "@/lib/analytics";
import { describeFilters, hasFilters, parseFilters, type AnalyticsFilters } from "@/lib/analytics-filters";
import { fmtDec, fmtDuration, fmtNum, fmtPct } from "@/lib/format";
import { humanize } from "@/lib/labels";
import { byId, getHeroes, getItems, getRanks } from "@/lib/lookup";
import { loadBuffs, loadBigDays, loadCombs, loadFlow, loadGameStats, loadHeroMeta, loadItemStats, loadPermutations } from "@/lib/meta-data";
import { rankSamples, sampleFloor, usageShare } from "@/lib/meta-insights";
import { buildFlowSankey } from "@/lib/sankey";
import { slugify } from "@/lib/slug";
import type { Hero, Item } from "@/lib/types";
import { Stat } from "@/components/ui/stat";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metaPage");
  return { title: t("title"), description: t("metaDesc") };
}

const SECTIONS = [["global", "secOverview"], ["items", "secItems"], ["combos", "secCombos"], ["comps", "secComps"], ["buffs", "secBuffs"], ["flow", "secFlow"]] as const;
const TOP = 8;

type Sp = Record<string, string | undefined>;
type Ctx = { filters: AnalyticsFilters; sp: Sp; heroes: Hero[]; items: Map<number, Item> };

const rateTone = (adjusted: number) => (adjusted >= 0.5 ? "text-sage-ink" : "text-rose-ink");
// ---------- Panorama: partidas y héroes del momento ----------
async function Overview({ filters, heroes }: Ctx) {
  const [game, meta, t] = await Promise.all([loadGameStats(filters), loadHeroMeta(filters), getTranslations("metaPage")]);
  const g = game.ok ? game.data[0] : undefined;
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const rows = meta.ok ? meta.data.rows.filter((r) => names.has(r.id) && r.matches >= 1000) : [];
  const lists = [
    { title: t("bestWin"), rows: [...rows].sort((a, b) => b.adjusted - a.adjusted), note: (r: (typeof rows)[number]) => t("noteWin", { rate: fmtPct(r.winRate) }) },
    { title: t("mostPlayed"), rows: [...rows].sort((a, b) => b.pickRate - a.pickRate), note: (r: (typeof rows)[number]) => t("notePick", { rate: fmtPct(r.pickRate) }) },
    { title: t("mostBanned"), rows: [...rows].filter((r) => r.banRate !== null).sort((a, b) => (b.banRate ?? 0) - (a.banRate ?? 0)), note: (r: (typeof rows)[number]) => t("noteBan", { rate: fmtPct(r.banRate ?? 0) }) },
  ];
  return (
    <>
      {g ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat value={fmtNum(g.total_matches)} label={t("statMatches")} />
          <Stat value={fmtNum(g.total_players)} label={t("statPlayers")} />
          <Stat value={fmtDuration(g.avg_duration_s)} label={t("statDuration")} />
          <Stat value={fmtDec(g.avg_kills)} label={t("statKills")} />
          <Stat value={fmtNum(Math.round(g.avg_net_worth))} label={t("statSouls")} />
        </div>
      ) : <ErrorState title={t("globalError")} />}
      {meta.ok && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xl font-black">{t("heroesOfMoment")}</h3>
            <Link href="/tier-list" className="link-brass text-sm font-semibold">{t("seeFullTier")}</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {lists.map((l) => (
              <Panel key={l.title} title={l.title}>
                <ul className="space-y-1.5">
                  {l.rows.slice(0, 5).map((r, i) => <li key={r.id} className="flex items-center gap-2"><Rank n={i + 1} /><div className="min-w-0 flex-1"><HeroChip id={r.id} name={names.get(r.id)!} note={l.note(r)} /></div></li>)}
                </ul>
              </Panel>
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
  const [stats, game, t, tc, tt] = await Promise.all([loadItemStats(filters, itemHero?.id), loadGameStats(filters), getTranslations("metaPage"), getTranslations("common"), getTranslations("heroes")]);
  if (!stats.ok) return <ErrorState title={t("itemsError")} />;

  // Con un héroe elegido, el total son las partidas de ese héroe: lo más cercano es el máximo de compras de cualquier objeto
  const total = itemHero ? stats.data.reduce((m, r) => Math.max(m, r.matches), 0) : game.ok ? (game.data[0]?.total_matches ?? 0) : 0;
  const cat = CATEGORIES.find((c) => c === sp.cat);
  const tier = [1, 2, 3, 4].find((n) => String(n) === sp.tier);
  const all = stats.data
    .map((r) => ({ stat: r, item: items.get(r.item_id) }))
    .filter((x): x is { stat: (typeof stats.data)[number]; item: Item } => x.item?.type === "upgrade");
  const shown = all.filter((x) => (!cat || x.item.item_slot_type === cat) && (!tier || x.item.item_tier === tier));

  const floor = sampleFloor(shown.map((x) => ({ matches: x.stat.matches })), 0.1, 500);
  const ranked = rankSamples(shown.map((x) => ({ ...x, wins: x.stat.wins, matches: x.stat.matches })), "strong", TOP, floor, PRIOR_MATCHES);
  const used = [...shown].sort((a, b) => b.stat.matches - a.stat.matches).slice(0, TOP);

  const href = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ ...sp, ...extra }).filter((e): e is [string, string] => !!e[1]));
    return `/meta${q.size ? `?${q}` : ""}`;
  };
  const pill = (active: boolean) => pillClass(active, "sm");

  const itemLine = (item: Item, note: React.ReactNode, tone?: string, rate?: number, rank?: number) => (
    <li key={item.id}>
      <Link href={`/items/${item.class_name}`} className="flex items-center gap-2.5 rounded-md border border-brass/30 bg-surface p-1.5 pr-3 shadow-card transition-colors hover:bg-brass/10">
        {rank !== undefined && <Rank n={rank} />}
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
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("filterItems")}>
        <Link href={href({ cat: undefined })} scroll={false} aria-current={!cat ? "true" : undefined} className={pill(!cat)}>{t("allCategories")}</Link>
        {CATEGORIES.map((c) => <Link key={c} href={href({ cat: c })} scroll={false} aria-current={cat === c ? "true" : undefined} className={pill(cat === c)}>{tc(c)}</Link>)}
        <span aria-hidden className="mx-1 h-5 w-px bg-brass/40" />
        <Link href={href({ tier: undefined })} scroll={false} aria-current={!tier ? "true" : undefined} className={pill(!tier)}>{t("allTiers")}</Link>
        {[1, 2, 3, 4].map((n) => <Link key={n} href={href({ tier: String(n) })} scroll={false} aria-current={tier === n ? "true" : undefined} className={pill(tier === n)}>{tt("tierN", { tier: n })}</Link>)}
      </div>

      {shown.length === 0 ? (
        <EmptyState title={t("noItems")} hint={t("noItemsHint")} />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title={t("strongest")} hint={t("strongestHint", { min: fmtNum(floor) })}>
              <ul className="space-y-1.5">{ranked.map((r, i) => itemLine(r.item, t("lineStrong", { rate: fmtPct(r.rate), share: fmtPct(usageShare(r.stat.matches, total)) }), rateTone(r.adjusted), r.rate, i + 1))}</ul>
            </Panel>
            <Panel title={t("mostBought")} hint={t("mostBoughtHint")}>
              <ul className="space-y-1.5">{used.map((x, i) => itemLine(x.item, t("lineUsed", { share: fmtPct(usageShare(x.stat.matches, total)), rate: fmtPct(x.stat.wins / Math.max(1, x.stat.matches)) }), undefined, x.stat.wins / Math.max(1, x.stat.matches), i + 1))}</ul>
            </Panel>
          </div>
          <SortableTable
            columns={[
              { key: "item", label: t("colItem") },
              { key: "cat", label: t("colCategory") },
              { key: "tier", label: t("colTier"), numeric: true },
              { key: "matches", label: t("colMatches"), numeric: true },
              { key: "usage", label: t("colUsage"), numeric: true },
              { key: "winrate", label: t("colWin"), numeric: true },
              { key: "adjusted", label: t("colAdjusted"), numeric: true },
              { key: "buy", label: t("colBuy"), numeric: true },
              { key: "sold", label: t("colSold"), numeric: true },
            ]}
            rows={shown.map(({ stat, item }) => ({
              id: item.id,
              href: `/items/${item.class_name}`,
              item: item.name,
              cat: item.item_slot_type ? tc(item.item_slot_type) : "—",
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
        {t("itemsNote", { prior: fmtNum(PRIOR_MATCHES) })}
      </p>
    </>
  );
}

// ---------- Combinaciones de objetos y parejas de héroes: mejores y peores ----------
async function ItemCombos({ filters, items }: Ctx) {
  const [perms, t] = await Promise.all([loadPermutations(filters), getTranslations("metaPage")]);
  if (!perms.ok) return <ErrorState title={t("combosError")} />;
  const floor = sampleFloor(perms.data, 0.05, 500);
  const best = rankSamples(perms.data, "strong", TOP, floor, PRIOR_MATCHES);
  const worst = rankSamples(perms.data, "weak", TOP, floor, PRIOR_MATCHES);
  if (best.length === 0) return <EmptyState title={t("noCombos")} hint={t("tryFewer")} />;
  const row = (r: (typeof best)[number], i: number) => (
    <li key={i} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-1.5 pr-3 shadow-card">
      <Rank n={i + 1} />
      <span className="flex shrink-0 -space-x-2">{r.item_ids.map((id) => items.get(id) && <ItemIcon key={id} item={items.get(id)!} size={36} className="ring-2 ring-surface" />)}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{r.item_ids.map((id) => items.get(id)?.name ?? `#${id}`).join(" + ")}</span>
        <span className={`block text-xs tabular-nums ${rateTone(r.adjusted)}`}>{t("lineCombo", { rate: fmtPct(r.rate), matches: fmtNum(r.matches) })}</span>
      </span>
      <span className="ml-auto w-16 shrink-0"><RateMeter rate={r.rate} /></span>
    </li>
  );
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title={t("bestItemPairs")}><ul className="space-y-1.5">{best.map(row)}</ul></Panel>
        <Panel title={t("worstItemPairs")}><ul className="space-y-1.5">{worst.map(row)}</ul></Panel>
      </div>
      <p className="text-xs text-ink-muted">{t("combosNote", { min: fmtNum(floor) })}</p>
    </>
  );
}

async function HeroPairs({ filters, heroes }: Ctx) {
  const [combs, t] = await Promise.all([loadCombs(filters), getTranslations("metaPage")]);
  if (!combs.ok) return <ErrorState title={t("compsError")} />;
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const valid = combs.data.filter((c) => c.hero_ids.every((i) => names.has(i)));
  const floor = sampleFloor(valid, 0.05, 300);
  const best = rankSamples(valid, "strong", TOP, floor, PRIOR_MATCHES);
  const worst = rankSamples(valid, "weak", TOP, floor, PRIOR_MATCHES);
  if (best.length === 0) return <EmptyState title={t("noPairs")} hint={t("tryFewer")} />;
  const row = (r: (typeof best)[number], i: number) => (
    <li key={i} className="space-y-1.5 rounded-md border border-brass/30 bg-surface p-1.5 shadow-card">
      <div className="flex items-center gap-2">
        <Rank n={i + 1} />
        <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2">{r.hero_ids.map((id) => <HeroChip key={id} id={id} name={names.get(id)!} />)}</div>
      </div>
      <div className="flex items-center gap-3 px-1 pb-0.5">
        <p className={`text-xs tabular-nums ${rateTone(r.adjusted)}`}>{t("lineCombo", { rate: fmtPct(r.rate), matches: fmtNum(r.matches) })}</p>
        <span className="ml-auto w-20"><RateMeter rate={r.rate} /></span>
      </div>
    </li>
  );
  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title={t("bestPairs")}><ul className="space-y-1.5">{best.map(row)}</ul></Panel>
        <Panel title={t("worstPairs")}><ul className="space-y-1.5">{worst.map(row)}</ul></Panel>
      </div>
      <p className="text-xs text-ink-muted">{t.rich("pairsNote", { min: fmtNum(floor), link: (c) => <Link href="/counters?view=synergy" className="link-brass font-semibold">{c}</Link> })}</p>
    </>
  );
}

// ---------- Power-ups ----------
async function Buffs({ filters }: Ctx) {
  const [buffs, t] = await Promise.all([loadBuffs(filters), getTranslations("metaPage")]);
  if (!buffs.ok) return <ErrorState title={t("buffsError")} />;
  const top = [...buffs.data].sort((a, b) => b.pickups - a.pickups).slice(0, 12);
  const label = (b: (typeof top)[number]) => humanize(b.buff_type.replace(/_pickup$/, "")).slice(0, 18);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-2 font-display text-lg font-black">{t("mostPickedUp")}</h3>
        <BarChartBase data={top.map((b) => ({ name: label(b), value: b.pickups }))} height={300} />
      </Card>
      <Card>
        <h3 className="mb-2 font-display text-lg font-black">{t("avgFirstPickup")}</h3>
        <BarChartBase data={top.map((b) => ({ name: label(b), value: Number((b.avg_first_pickup_time_s / 60).toFixed(1)) }))} height={300} />
      </Card>
    </div>
  );
}

// ---------- Flujo de objetos ----------
async function Flow({ filters, items, flowHero }: Ctx & { flowHero: Hero }) {
  const [flow, t] = await Promise.all([loadFlow(flowHero.id, filters), getTranslations("metaPage")]);
  const sankey = flow.ok ? buildFlowSankey(flow.data, (id) => items.get(id)?.name ?? `#${id}`) : null;
  return sankey && sankey.nodes.length ? (
    <Card>
      <p className="mb-2 text-xs text-ink-muted">{t("flowNote")}</p>
      <SankeyChart data={sankey} />
    </Card>
  ) : <ErrorState title={t("flowError")} />;
}


export default async function MetaPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const [t, ta, th] = await Promise.all([getTranslations("metaPage"), getTranslations("analytics"), getTranslations("heroUi")]);
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [heroes, itemList, ranks, bigDays] = await Promise.all([getHeroes(), getItems(), getRanks(), loadBigDays()]);
  const items = byId(itemList);
  const sortedHeroes = [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  const flowHero = sortedHeroes.find((h) => slugify(h.name) === sp.hero) ?? heroes.find((h) => h.id === 1) ?? sortedHeroes[0];
  const tierName = (n: number) => ranks.find((r) => r.tier === n)?.name ?? th("rankFallback", { tier: n });
  const ctx: Ctx = { filters, sp, heroes, items };
  // Cada sección llega por streaming; la clave hace que vuelva a mostrar su esqueleto al cambiar filtros
  const key = JSON.stringify(sp);
  const active = SECTIONS.find(([id]) => id === sp.seccion)?.[0] ?? "global";
  const tabHref = (id: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1] && e[0] !== "seccion"));
    if (id !== "global") q.set("seccion", id);
    return `/meta${q.size ? `?${q}` : ""}`;
  };

  const sections: { id: string; title: string; intro: string; badge?: string; body: React.ReactNode }[] = [
    { id: "global", title: t("sectionOverview"), intro: t("introOverview"), body: <Overview {...ctx} /> },
    { id: "items", title: t("sectionItems"), intro: t("introItems"), body: <ItemsSection {...ctx} /> },
    { id: "combos", title: t("sectionCombos"), intro: t("introCombos"), body: <ItemCombos {...ctx} /> },
    { id: "comps", title: t("sectionComps"), intro: t("introComps"), body: <HeroPairs {...ctx} /> },
    { id: "buffs", title: t("sectionBuffs"), intro: t("introBuffs"), body: <Buffs {...ctx} /> },
    { id: "flow", title: t("sectionFlow", { name: flowHero.name }), intro: t("introFlow"), body: <Flow {...ctx} flowHero={flowHero} /> },
  ];

  return (
    <div className="space-y-14">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      <Suspense fallback={null}>
        <FilterBar fields={[...analyticsFields(ranks, bigDays, ta), { name: "hero", label: t("flowHero"), type: "select", options: sortedHeroes.map((h) => ({ value: slugify(h.name), label: h.name })), allLabel: t("flowHeroDefault") }, { name: "item_hero", label: t("itemHero"), type: "select", options: sortedHeroes.map((h) => ({ value: slugify(h.name), label: h.name })), allLabel: t("allHeroes") }]} />
      </Suspense>
      <ActiveFilters parts={hasFilters(filters) ? describeFilters(filters, tierName, ta) : []} />

      {/* Pestañas en la URL (?seccion=): solo se pide y se pinta la sección abierta, no las seis a la vez */}
      <nav aria-label={t("sections")} className="-mx-4 bg-bg/90 px-4 backdrop-blur md:sticky md:top-[6.7rem] md:z-30">
        <ul className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-brass/40 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SECTIONS.map(([id, labelKey]) => (
            <li key={id} className="shrink-0">
              <Link href={tabHref(id)} scroll={false} aria-current={id === active ? "page" : undefined} className={`block whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brass ${id === active ? "border-brass text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}>{t(labelKey)}</Link>
            </li>
          ))}
        </ul>
      </nav>

      {sections.map((s, n) => s.id !== active ? null : (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className="scroll-mt-40 space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span aria-hidden className="chamfer grid size-10 shrink-0 place-items-center bg-brass font-display text-base font-black tabular-nums text-night">{String(n + 1).padStart(2, "0")}</span>
              <SectionTitle id={`${s.id}-t`}>{s.title}</SectionTitle>
              {s.badge && <Chip tone="apricot">{s.badge}</Chip>}
            </div>
            <p className="max-w-prose pl-[3.25rem] text-sm text-ink-muted">{s.intro}</p>
          </div>
          <Suspense key={key} fallback={<Skeleton className="h-72 w-full rounded-md" />}>{s.body}</Suspense>
        </section>
      ))}

      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="font-display text-lg font-black">{t("moreAnalysis")}</span>
        <Link href="/tier-list" className="link-brass font-semibold">{t("fullTierList")}</Link>
        <Link href="/lanes" className="link-brass font-semibold">{t("lanesLink")}</Link>
        <Link href="/counters" className="link-brass font-semibold">{t("countersLink")}</Link>
      </Card>
    </div>
  );
}
