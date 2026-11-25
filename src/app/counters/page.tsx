import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Heatmap } from "@/components/charts/heatmap";
import { analyticsFields } from "@/components/filters/analytics-fields";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroChip } from "@/components/hero/hero-chip";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/feedback";
import { apiErrorHint } from "@/lib/api-error-hint";
import { pillClass } from "@/components/ui/pill";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { rankMatchups, winRate, type Counter } from "@/lib/analytics";
import { parseFilters } from "@/lib/analytics-filters";
import { fmtNum, fmtPct } from "@/lib/format";
import { getHeroes, getRanks } from "@/lib/lookup";
import { loadBigDays, loadCounters, loadSynergy } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("counters");
  return { title: t("fullTitle"), description: t("metaDesc") };
}

const MIN_MATCHES = 500;

type Sp =Record<string, string | undefined>;

export default async function CountersPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const [t, ta] = await Promise.all([getTranslations("counters"), getTranslations("analytics")]);
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = sp.view === "synergy" ? "synergy" : sp.view === "ranking" ? "ranking" : "counters";

  const [heroes, ranks, bigDays] = await Promise.all([getHeroes(), getRanks(), loadBigDays()]);
  const sorted = [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  const bySlug = new Map(sorted.map((h) => [slugify(h.name), h]));
  const heroA = sp.a ? bySlug.get(sp.a) : undefined;
  const heroB = sp.b ? bySlug.get(sp.b) : undefined;

  const data = view === "synergy" ? await loadSynergy(filters) : await loadCounters(filters);
  const matrixView = view !== "ranking";

  const qs = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ ...sp, ...extra }).filter((e): e is [string, string] => !!e[1]));
    return `/counters${q.size ? `?${q}` : ""}`;
  };

  // Matriz: win rate de la fila contra la columna (counters) o de la pareja (sinergias, simétrica)
  const cell = new Map<string, { rate: number; matches: number }>();
  if (data.ok) {
    if (view !== "synergy") {
      for (const c of data.data as { hero_id: number; enemy_hero_id: number; wins: number; matches_played: number }[]) cell.set(`${c.hero_id}-${c.enemy_hero_id}`, { rate: winRate(c.wins, c.matches_played), matches: c.matches_played });
    } else {
      for (const s of data.data as { hero_id1: number; hero_id2: number; wins: number; matches_played: number }[]) {
        const v = { rate: winRate(s.wins, s.matches_played), matches: s.matches_played };
        cell.set(`${s.hero_id1}-${s.hero_id2}`, v);
        cell.set(`${s.hero_id2}-${s.hero_id1}`, v);
      }
    }
  }
  const values = sorted.map((r) => sorted.map((c) => (r.id === c.id ? null : cell.get(`${r.id}-${c.id}`)?.rate ?? null)));
  const detail = heroA && heroB ? { ab: cell.get(`${heroA.id}-${heroB.id}`), ba: cell.get(`${heroB.id}-${heroA.id}`) } : null;
  const heroName = new Map(sorted.map((h) => [h.id, h.name]));
  const heroOptions = sorted.map((h) => ({ value: slugify(h.name), label: h.name }));

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      <nav aria-label={t("view")} className="flex gap-2">
        {[["counters", t("vCounters")], ["ranking", t("vRanking")], ["synergy", t("vSynergy")]].map(([v, label]) => (
          <Link key={v} href={qs({ view: v === "counters" ? undefined : v })} aria-current={view === v ? "page" : undefined} className={pillClass(view === v)}>{label}</Link>
        ))}
      </nav>
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            { name: "a", label: view === "counters" ? t("hero") : t("heroA"), type: "select", options: heroOptions, allLabel: t("pickHero") },
            ...(view === "ranking" ? [] : [{ name: "b", label: view === "counters" ? t("against") : t("heroB"), type: "select" as const, options: heroOptions, allLabel: t("pickHero") }]),
            ...analyticsFields(ranks, bigDays, ta),
          ]}
        />
      </Suspense>

      {!data.ok ? (
        <ErrorState title={t("loadError")} hint={await apiErrorHint(data.status)} />
      ) : (
        <>
          {matrixView && detail && heroA && heroB && (
            <section aria-labelledby="detail" className="space-y-4">
              <SectionTitle id="detail">{t(view === "counters" ? "detailVs" : "detailWith", { a: heroA.name, b: heroB.name })}</SectionTitle>
              {!detail.ab ? (
                <p className="text-sm text-ink-muted">{t("notEnough")}</p>
              ) : view === "counters" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[[heroA, heroB, detail.ab], [heroB, heroA, detail.ba]].map(([x, y, d]) => d && (
                    <Card key={(x as { id: number }).id} className="space-y-3 text-center">
                      <HeroChip id={(x as { id: number }).id} name={(x as { name: string }).name} />
                      <p className="font-display text-4xl font-black">{fmtPct((d as { rate: number }).rate)}</p>
                      <p className="text-sm text-ink-muted">{t("winsVs", { a: (x as { name: string }).name, b: (y as { name: string }).name, matches: fmtNum((d as { matches: number }).matches) })}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="space-y-2 text-center">
                  <p className="font-display text-4xl font-black">{fmtPct(detail.ab.rate)}</p>
                  <p className="text-sm text-ink-muted">{t("winsTogether", { a: heroA.name, b: heroB.name, matches: fmtNum(detail.ab.matches) })}</p>
                </Card>
              )}
            </section>
          )}

          {view === "ranking" && (() => {
            const all = data.data as Counter[];
            const list = (h: { id: number }, mode: "strong" | "weak", n: number) => rankMatchups(all, h.id, mode, n, MIN_MATCHES);
            const chips = (rows: ReturnType<typeof list>, tone: "good" | "bad") => (
              <ul className="space-y-1.5">
                {rows.map((r) => <li key={r.id}><HeroChip id={r.id} name={heroName.get(r.id) ?? `#${r.id}`} note={t("chipNote", { rate: fmtPct(r.rate), matches: fmtNum(r.matches) })} tone={tone} /></li>)}
                {rows.length === 0 && <li className="text-xs text-ink-muted">{t("notEnoughShort")}</li>}
              </ul>
            );
            return (
              <>
                {heroA && (
                  <section aria-labelledby="focus" className="space-y-4">
                    <SectionTitle id="focus">{t("countersOf", { name: heroA.name })}</SectionTitle>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2"><h3 className="font-semibold">{t("whoCounters")}</h3><p className="text-xs text-ink-muted">{t("rivalsLess", { name: heroA.name })}</p>{chips(list(heroA, "weak", 8), "bad")}</div>
                      <div className="space-y-2"><h3 className="font-semibold">{t("whomCounters")}</h3><p className="text-xs text-ink-muted">{t("rivalsMore", { name: heroA.name })}</p>{chips(list(heroA, "strong", 8), "good")}</div>
                    </div>
                  </section>
                )}
                <section aria-labelledby="all-counters" className="space-y-3">
                  <SectionTitle id="all-counters">{t("allHeroes")}</SectionTitle>
                  <p className="max-w-prose text-sm text-ink-muted">{t("allNote", { min: fmtNum(MIN_MATCHES) })}</p>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sorted.map((h) => (
                      <Card key={h.id} className="space-y-3">
                        <Link href={qs({ a: slugify(h.name) })} className="link-brass font-display text-lg font-black">{h.name}</Link>
                        <div><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rose-ink">{t("counteredBy")}</h3>{chips(list(h, "weak", 3), "bad")}</div>
                        <div><h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sage-ink">{t("countersTo")}</h3>{chips(list(h, "strong", 3), "good")}</div>
                      </Card>
                    ))}
                  </div>
                </section>
              </>
            );
          })()}

          {matrixView && <section aria-labelledby="matrix" className="space-y-3">
            <SectionTitle id="matrix">{view === "counters" ? t("matrixCounters") : t("matrixSynergy")}</SectionTitle>
            <p className="max-w-prose text-sm text-ink-muted">
              {view === "counters" ? t("matrixNoteCounters") : t("matrixNoteSynergy")}
            </p>
            <Card>
              <Heatmap
                rows={sorted.map((h) => h.name)}
                cols={sorted.map((h) => h.name)}
                values={values}
                label={view === "counters" ? t("matrixCounters") : t("matrixSynergy")}
                cellHref={(i, j) => qs({ a: slugify(sorted[i].name), b: slugify(sorted[j].name) })}
                selected={heroA && heroB ? [sorted.indexOf(heroA), sorted.indexOf(heroB)] : null}
              />
            </Card>
          </section>}
        </>
      )}
    </div>
  );
}
