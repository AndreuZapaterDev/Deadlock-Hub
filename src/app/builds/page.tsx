import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BuildCard } from "@/components/builds/build-card";
import { FilterBar } from "@/components/filters/filter-bar";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { apiErrorHint } from "@/lib/api-error-hint";
import { Pagination } from "@/components/ui/pagination";
import { PosterHeader } from "@/components/ui/poster-header";
import { BUILD_LANGUAGE_TAGS, hasBuildFilters, parseBuildQuery, shopItemsOf } from "@/lib/builds";
import { loadBuildList, loadBuildTags } from "@/lib/builds-data";
import { byId, getHeroNames, getItems } from "@/lib/lookup";
import { loadNames } from "@/lib/player-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("builds");
  return { title: t("title"), description: t("metaDesc") };
}

export default async function BuildsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("builds"), getLocale()]);
  const langNames = new Intl.DisplayNames(locale, { type: "language" });
  const [heroNames, tags, items] = await Promise.all([getHeroNames(), loadBuildTags(), getItems().then(byId)]);
  const q = parseBuildQuery(sp, new Set(heroNames.keys()), new Set(tags.map((t) => t.id)));
  const [res, tagLabel] = [await loadBuildList(q), new Map(tags.map((t) => [t.id, t.label]))];
  const authors = res.ok ? await loadNames(res.data.items.map((b) => b.hero_build.author_account_id)) : new Map<number, string>();

  const href = (page: number, extra: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...extra, page: page > 1 ? String(page) : undefined }).filter((e): e is [string, string] => !!e[1]));
    return `/builds${p.size ? `?${p}` : ""}`;
  };

  const heroOptions = [...heroNames].filter(([, n]) => n).sort((a, b) => a[1].localeCompare(b[1])).map(([id, label]) => ({ value: String(id), label }));
  const pages = res.ok ? (res.data.hasMore ? q.page + 1 : q.page) : 1;

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            { name: "q", label: t("search"), type: "search", placeholder: t("searchPlaceholder") },
            { name: "hero", label: t("hero"), type: "select", options: heroOptions },
            { name: "tag", label: t("tag"), type: "select", options: tags.map((t) => ({ value: String(t.id), label: t.label })) },
            { name: "lang", label: t("language"), type: "select", options: BUILD_LANGUAGE_TAGS.map((tag, i) => ({ value: String(i), label: langNames.of(tag) ?? tag })) },
            { name: "sort", label: t("sort"), type: "select", options: [{ value: "weekly", label: t("sortWeekly") }, { value: "updated", label: t("sortUpdated") }], allLabel: t("sortPopular") },
          ]}
        />
      </Suspense>
      {tags.length > 0 && (
        <nav aria-label={t("tagsNav")} className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-ink-muted">{t("tagsLabel")}</span>
          {tags.slice(0, 12).map((t) => (
            <Link key={t.id} href={href(1, { tag: q.tag === t.id ? undefined : String(t.id) })} aria-current={q.tag === t.id ? "true" : undefined} className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${q.tag === t.id ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`}>{t.label}</Link>
          ))}
        </nav>
      )}
      {q.author !== undefined && (
        <p className="flex items-center gap-2 text-sm">
          {t("byAuthor")} <Link href={`/players/${q.author}`} className="link-brass font-semibold">{authors.get(q.author) ?? `#${q.author}`}</Link>
          <Link href={href(1, { author: undefined })} className="rounded-full border border-brass/50 px-2 py-0.5 text-xs font-semibold hover:bg-brass/15" aria-label={t("removeAuthor")}>{t("removeShort")}</Link>
        </p>
      )}

      {!res.ok ? (
        <ErrorState title={t("loadError")} hint={await apiErrorHint(res.status)} />
      ) : res.data.items.length === 0 ? (
        <EmptyState title={t("noMatch")} hint={hasBuildFilters(q) ? t("noMatchHint") : t("noneYet")} />
      ) : (
        <>
          <p className="text-sm text-ink-muted" aria-live="polite">
            <strong className="text-ink">{q.sort === "updated" ? t("orderRecent") : q.sort === "weekly" ? t("orderWeekly") : t("orderPopular")}</strong>
            {" · "}{t("pageN", { page: q.page })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.items.map((b) => (
              <BuildCard
                key={b.hero_build.hero_build_id}
                build={b}
                heroId={b.hero_build.hero_id}
                shop={shopItemsOf(b, items)}
                heroName={heroNames.get(b.hero_build.hero_id) ?? t("heroFallback", { id: b.hero_build.hero_id })}
                authorName={authors.get(b.hero_build.author_account_id)}
                tags={(b.hero_build.tags ?? []).map((t) => tagLabel.get(t)).filter((t): t is string => !!t).slice(0, 3)}
              />
            ))}
          </div>
          <Pagination page={q.page} pages={pages} href={(p) => href(p)} />
        </>
      )}
    </div>
  );
}
