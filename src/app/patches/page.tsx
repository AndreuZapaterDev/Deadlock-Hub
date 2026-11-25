import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroPortrait } from "@/components/hero/hero-card";
import { MarkPatchSeen } from "@/components/patch/new-patch";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { getHeroes } from "@/lib/lookup";
import { loadBigDays } from "@/lib/meta-data";
import { loadPatches } from "@/lib/patch-data";
import { effectiveDate, excerpt, groupByMonth, isBigDay, mentionedNames, readingMinutes } from "@/lib/patches";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("patches");
  return { title: t("title"), description: t("metaDesc") };
}
const MAX_FACES = 6;

type Sp = { source?: string; big?: string; q?: string };

export default async function PatchesPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const [t, locale] = await Promise.all([getTranslations("patches"), getLocale()]);
  const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const dayOnly = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short" });
  const monthTitle = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString(locale, { month: "long", year: "numeric" });
  const sp = await searchParams;
  const [res, bigDays, heroes] = await Promise.all([loadPatches(), loadBigDays(), getHeroes()]);
  const q = (sp.q ?? "").trim().toLowerCase();

  const all = res.ok ? res.data : [];
  const enriched = all.map((p) => {
    const text = excerpt(p.html, Number.POSITIVE_INFINITY);
    return { p, text, big: isBigDay(p, bigDays), day: effectiveDate(p) };
  });
  const shown = enriched.filter((e) => (!sp.source || e.p.source === sp.source) && (sp.big !== "1" || e.big) && (!q || e.p.title.toLowerCase().includes(q) || e.text.toLowerCase().includes(q)));
  const groups = groupByMonth(shown.map((e) => ({ ...e, title: e.p.title, date: e.p.date })));
  const bigCount = enriched.filter((e) => e.big).length;
  const latest = enriched[0];
  const tab = (extra: Partial<Sp>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...extra }).filter((e): e is [string, string] => !!e[1]));
    return `/patches${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      {latest && <MarkPatchSeen id={latest.p.id} />}
      <div className="flex flex-wrap items-end gap-3">
        <Suspense>
          <FilterBar
            fields={[
              { name: "q", label: t("search"), type: "search", placeholder: t("searchPlaceholder") },
              { name: "source", label: t("source"), type: "select", allLabel: t("all"), options: [{ value: "forum", label: t("sourceForum") }, { value: "steam", label: t("sourceSteam") }] },
              { name: "big", label: t("importance"), type: "select", allLabel: t("allM"), options: [{ value: "1", label: t("onlyBig") }] },
            ]}
          />
        </Suspense>
        <Button href="/patches/diff" variant="secondary">{t("seeNumbers")}</Button>
      </div>

      {res.ok && (
        <>
          {/* Accesos rápidos a los filtros más usados, con cuántos parches hay en cada uno. */}
          <nav aria-label={t("filterShortcuts")} className="flex flex-wrap gap-2">
            {[
              { label: t("tabAll"), n: all.length, on: !sp.source && sp.big !== "1", href: tab({ source: undefined, big: undefined }) },
              { label: t("tabBig"), n: bigCount, on: sp.big === "1", href: tab({ source: undefined, big: "1" }) },
              { label: t("tabForum"), n: enriched.filter((e) => e.p.source === "forum").length, on: sp.source === "forum" && sp.big !== "1", href: tab({ source: "forum", big: undefined }) },
              { label: t("tabSteam"), n: enriched.filter((e) => e.p.source === "steam").length, on: sp.source === "steam" && sp.big !== "1", href: tab({ source: "steam", big: undefined }) },
            ].map((s) => (
              <Link key={s.label} href={s.href} replace scroll={false} aria-current={s.on ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${s.on ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`}>
                {s.label}<span className={`text-xs tabular-nums ${s.on ? "text-bg/80" : "text-ink-muted"}`}>{s.n}</span>
              </Link>
            ))}
          </nav>
          <p className="text-sm text-ink-muted" aria-live="polite">
            {t.rich("countLine", { shown: shown.length, total: all.length, b: (c) => <strong className="text-ink">{c}</strong> })}{latest && t("latest", { date: longDate(latest.day) })}
          </p>
        </>
      )}

      {!res.ok ? (
        <ErrorState title={t("loadError")} hint={t("loadErrorHint")} />
      ) : shown.length === 0 ? (
        <EmptyState title={t("none")} hint={t("noneHint")} />
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.month} aria-labelledby={`m-${g.month}`} className="space-y-3">
              <h2 id={`m-${g.month}`} className="flex items-center gap-3 font-display text-xl font-black capitalize">
                {monthTitle(g.month)}
                <span aria-hidden className="h-px flex-1 bg-brass/40" />
                <span className="text-sm font-semibold normal-case text-ink-muted">{g.items.length}</span>
              </h2>
              <ol className="relative space-y-3 border-l-2 border-brass/40 pl-5">
                {g.items.map(({ p, text, big, day }) => {
                  const faces = heroes.filter((h) => mentionedNames(text, [h.name]).length > 0);
                  return (
                    <li key={p.id} className="relative">
                      <span aria-hidden className={`absolute -left-[1.62rem] top-5 size-3 rounded-full border-2 ${big ? "border-accent bg-accent" : "border-brass bg-bg"}`} />
                      <Link href={`/patches/${p.id}`} className={`block space-y-2 rounded-md border bg-surface p-4 shadow-card transition duration-150 hover:-translate-y-0.5 hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${big ? "border-accent/60" : "border-brass/30 hover:border-brass"}`}>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="min-w-0 flex-1 font-display text-lg font-black leading-tight">{p.title || t("untitled")}</h3>
                          {big && <Chip tone="apricot">{t("bigUpdate")}</Chip>}
                          <Chip tone={p.source === "forum" ? "teal" : "neutral"}>{p.source === "forum" ? t("forum") : t("steam")}</Chip>
                          <time dateTime={p.date} className="text-sm tabular-nums text-ink-muted">{dayOnly(day)}</time>
                        </div>
                        {text && <p className="line-clamp-2 text-sm text-ink-muted">{excerpt(p.html, 220)}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                          {faces.length > 0 && (
                            <span className="flex items-center gap-2">
                              <span className="flex -space-x-2">
                                {faces.slice(0, MAX_FACES).map((h) => <HeroPortrait key={h.id} hero={h} small className="size-7 ring-2 ring-surface" />)}
                              </span>
                              <span>{faces.length === 1 ? faces[0].name : t("heroesMentioned", { count: faces.length })}</span>
                            </span>
                          )}
                          <span>{t("readingMin", { count: readingMinutes(text) })}</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
