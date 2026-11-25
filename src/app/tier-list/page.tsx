import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { analyticsFields } from "@/components/filters/analytics-fields";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroChip } from "@/components/hero/hero-chip";
import { Explainer, ActiveFilters } from "@/components/ui/explainer";
import { pillClass } from "@/components/ui/pill";
import { ErrorState } from "@/components/ui/feedback";
import { apiErrorHint } from "@/lib/api-error-hint";
import { PosterHeader } from "@/components/ui/poster-header";
import { SortableTable } from "@/components/ui/sortable-table";
import { assignTiers, PRIOR_MATCHES, TIERS } from "@/lib/analytics";
import { describeFilters, hasFilters, parseFilters } from "@/lib/analytics-filters";
import { fmtNum, fmtPct } from "@/lib/format";
import { getHeroes, getRanks } from "@/lib/lookup";
import { recentDelta, weeklySeries } from "@/lib/hero-trends";
import { loadBigDays, loadHeroMeta, loadHeroStatsWeekly } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("tierList");
  return { title: t("title"), description: t("metaDesc") };
}

export default async function TierListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [t, ta, th] = await Promise.all([getTranslations("tierList"), getTranslations("analytics"), getTranslations("heroUi")]);
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = sp.view === "table" ? "table" : "tiers";

  // La tendencia semanal no admite filtros (es del meta global), así que solo se pide sin ellos
  const [meta, heroes, ranks, bigDays, weekly] = await Promise.all([loadHeroMeta(filters), getHeroes(), getRanks(), loadBigDays(), hasFilters(filters) ? null : loadHeroStatsWeekly()]);
  const trend = (id: number) => (weekly?.ok ? recentDelta(weeklySeries(weekly.data, id)) : null);
  const types = new Map(heroes.map((h) => [h.id, h.hero_type]));
  // Color de cada fila: el mismo que el anillo de la insignia de tier.
  const TIER_COLOR: Record<string, string> = { S: "var(--brass)", A: "var(--sage)", B: "var(--teal)", C: "var(--apricot)", D: "var(--rose)" };
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const tierName = (n: number) => ranks.find((r) => r.tier === n)?.name ?? th("rankFallback", { tier: n });

  const href = (v: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1] && e[0] !== "view"));
    if (v === "table") q.set("view", "table");
    return `/tier-list${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      <Suspense fallback={null}>
        <FilterBar fields={analyticsFields(ranks, bigDays, ta)} />
      </Suspense>
      <ActiveFilters parts={hasFilters(filters) ? describeFilters(filters, tierName, ta) : []} />

      {!meta.ok ? (
        <ErrorState title={t("loadError")} hint={await apiErrorHint(meta.status)} />
      ) : (
        (() => {
          const ranked = assignTiers(meta.data.rows.filter((r) => names.has(r.id)).map((r) => ({ ...r, score: r.adjusted })));
          return (
            <>
              <nav aria-label={t("view")} className="flex gap-2">
                {[["tiers", t("viewTiers")], ["table", t("viewTable")]].map(([v, label]) => (
                  <Link key={v} href={href(v)} aria-current={view === v ? "page" : undefined} className={pillClass(view === v)}>{label}</Link>
                ))}
              </nav>

              {view === "tiers" ? (
                <div className="space-y-4">
                  {TIERS.map((tr) => {
                    const list = ranked.filter((r) => r.tier === tr).sort((a, b) => b.adjusted - a.adjusted);
                    if (!list.length) return null;
                    const avg = list.reduce((sum, r) => sum + r.winRate, 0) / list.length;
                    return (
                      <section key={tr} aria-label={t("tierN", { tier: tr })} style={{ "--tier": TIER_COLOR[tr] } as React.CSSProperties} className="grid overflow-hidden rounded-md border border-(--tier)/45 bg-surface bg-[linear-gradient(90deg,color-mix(in_srgb,var(--tier)_16%,transparent),transparent_45%)] shadow-card sm:grid-cols-[9.5rem_1fr]">
                        {/* Placa del tier: bloque de color con doble filete, como el rótulo de un cartel déco */}
                        <div className="relative flex items-center justify-center gap-4 bg-[linear-gradient(160deg,color-mix(in_srgb,var(--tier),white_24%),var(--tier)_55%,color-mix(in_srgb,var(--tier),black_20%))] px-4 py-3 text-night before:pointer-events-none before:absolute before:inset-1.5 before:border before:border-night/35 sm:flex-col sm:gap-1 sm:py-5">
                          <span role="img" aria-label={t("tierN", { tier: tr })} className="font-display text-5xl font-black leading-none drop-shadow-[0_1px_0_rgb(255_255_255/0.3)] sm:text-7xl">{tr}</span>
                          <span className="text-xs font-semibold leading-snug sm:text-center">{t("heroCount", { count: list.length })}<br />{t("avgLine", { avg: fmtPct(avg) })}</span>
                        </div>
                        <ul className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-4">
                          {list.map((r) => (
                            <li key={r.id}><HeroChip id={r.id} name={names.get(r.id)!} heroType={types.get(r.id)} note={t("pickNote", { win: fmtPct(r.winRate), pick: fmtPct(r.pickRate) })} trend={trend(r.id)} tone={r.winRate >= 0.5 ? "good" : "bad"} /></li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <SortableTable
                  columns={[
                    { key: "hero", label: t("colHero") },
                    { key: "tier", label: t("colTier") },
                    { key: "matches", label: t("colMatches"), numeric: true },
                    { key: "winrate", label: t("colWin"), numeric: true },
                    { key: "adjusted", label: t("colAdjusted"), numeric: true },
                    { key: "pick", label: t("colPick"), numeric: true },
                    { key: "ban", label: t("colBan"), numeric: true },
                    { key: "kda", label: t("colKda"), numeric: true },
                    ...(weekly?.ok ? [{ key: "trend", label: t("colTrend"), numeric: true }] : []),
                    { key: "souls", label: t("colSouls"), numeric: true },
                  ]}
                  rows={ranked.map((r) => ({
                    id: r.id,
                    href: `/heroes/${slugify(names.get(r.id)!)}`,
                    hero: names.get(r.id)!,
                    tier: r.tier,
                    matches: r.matches,
                    winrate: r.winRate,
                    adjusted: r.adjusted,
                    pick: r.pickRate,
                    ban: r.banRate ?? 0,
                    kda: r.kda,
                    trend: trend(r.id) ?? 0,
                    souls: Math.round(r.soulsPerMatch),
                  }))}
                  initialSort={{ key: "adjusted", dir: "desc" }}
                  format={{ matches: "num", winrate: "pct", adjusted: "pct", pick: "pct", ban: "pct", kda: "dec", souls: "num", trend: "dec" }}
                />
              )}

              <Explainer>
                    <p>{t.rich("explain1", { half: fmtNum(PRIOR_MATCHES / 2), prior: fmtNum(PRIOR_MATCHES), b: (c: React.ReactNode) => <strong className="text-ink">{c}</strong> })}</p>
                    <p>{t.rich("explain2", { b: (c: React.ReactNode) => <strong className="text-ink">{c}</strong> })}</p>
                    <p>{t.rich("explain3", { b: (c: React.ReactNode) => <strong className="text-ink">{c}</strong> })}</p>
                    <p>{t.rich("explain4", { b: (c: React.ReactNode) => <strong className="text-ink">{c}</strong> })}</p>
              </Explainer>
            </>
          );
        })()
      )}
    </div>
  );
}
