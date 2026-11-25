import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { apiErrorHint } from "@/lib/api-error-hint";
import { Pagination } from "@/components/ui/pagination";
import { pillClass } from "@/components/ui/pill";
import { PosterHeader } from "@/components/ui/poster-header";
import { fmtNum } from "@/lib/format";
import { getHeroes } from "@/lib/lookup";
import { isRegion, loadLeaderboard, REGIONS } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("leaderboard");
  return { title: t("title"), description: t("metaDesc") };
}

const PAGE_SIZE = 50;

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ region?: string; hero?: string; page?: string }> }) {
  const t = await getTranslations("leaderboard");
  const sp = await searchParams;
  const region = isRegion(sp.region) ? sp.region : "Europe";
  const heroes = (await getHeroes()).sort((a, b) => a.name.localeCompare(b.name));
  const hero = heroes.find((h) => slugify(h.name) === sp.hero);
  const names = new Map(heroes.map((h) => [h.id, h.name]));

  const lb = await loadLeaderboard(region, hero?.id);
  const entries = lb.ok ? lb.data : [];
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages);
  const slice = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const link = (r: string, p = 1) => {
    const q = new URLSearchParams();
    if (r !== "Europe") q.set("region", r);
    if (hero) q.set("hero", slugify(hero.name));
    if (p > 1) q.set("page", String(p));
    return `/leaderboard${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={hero ? t("subtitleHero", { name: hero.name }) : t("subtitle")} />

      <nav aria-label={t("region")} className="flex flex-wrap gap-2">
        {REGIONS.map(([r]) => (
          <Link key={r} href={link(r)} aria-current={region === r ? "page" : undefined} className={pillClass(region === r)}>{t(`region${r}`)}</Link>
        ))}
      </nav>
      <Suspense fallback={null}>
        <FilterBar fields={[{ name: "hero", label: t("hero"), type: "select", options: heroes.map((h) => ({ value: slugify(h.name), label: h.name })), allLabel: t("globalAll") }]} />
      </Suspense>

      {!lb.ok ? (
        <ErrorState title={t("loadError")} hint={await apiErrorHint(lb.status)} />
      ) : entries.length === 0 ? (
        <EmptyState title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-brass/30">
            <table className="w-full min-w-2xl border-collapse text-sm">
              <thead className="bg-brass/10 text-left">
                <tr>
                  <th scope="col" className="w-16 px-3 py-2 text-right font-semibold">#</th>
                  <th scope="col" className="px-3 py-2 font-semibold">{t("colPlayer")}</th>
                  {!hero && <th scope="col" className="px-3 py-2 font-semibold">{t("colTopHeroes")}</th>}
                </tr>
              </thead>
              <tbody>
                {slice.map((e) => {
                  const [main, ...others] = e.possible_account_ids;
                  return (
                    <tr key={e.rank} className="border-t border-brass/20 hover:bg-brass/5">
                      <td className="px-3 py-2 text-right font-display text-lg font-black tabular-nums">{fmtNum(e.rank)}</td>
                      <td className="px-3 py-2">
                        {main ? <Link href={`/players/${main}`} className="link-brass font-semibold">{e.account_name}</Link> : <span className="font-semibold">{e.account_name}</span>}
                        {others.length > 0 && <span className="ml-2 text-xs text-ink-muted" title={t("otherAccounts", { ids: others.join(", ") })}>{t("possibleAccounts", { count: others.length })}</span>}
                      </td>
                      {!hero && (
                        <td className="px-3 py-2">
                          <span className="flex flex-wrap gap-1">{e.top_hero_ids.slice(0, 3).map((h) => <Chip key={h}>{names.get(h) ?? `#${h}`}</Chip>)}</span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">{t("positions", { from: fmtNum((page - 1) * PAGE_SIZE + 1), to: fmtNum(Math.min(page * PAGE_SIZE, entries.length)), total: fmtNum(entries.length) })}</p>
            <Pagination page={page} pages={pages} href={(p) => link(region, p)} />
          </div>
          <p className="text-xs text-ink-muted">{t("note")}</p>
        </>
      )}
    </div>
  );
}
