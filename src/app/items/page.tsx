import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { catVar, ItemTile, TierPips } from "@/components/item/item-tile";
import { CATEGORIES, CATEGORY, Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { fmtNum, fmtPct } from "@/lib/format";
import { getLanguage } from "@/lib/language";
import { groupWinRate, usageMap } from "@/lib/item-meta";
import { getItems } from "@/lib/lookup";
import { loadItemStats } from "@/lib/meta-data";
import type { Category, Item } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("itemsPage");
  return { title: t("title"), description: t("metaDesc") };
}

type Params = { q?: string; cat?: string; tier?: string; kind?: string; comp?: string; sort?: string };

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", cat = "", tier = "", kind = "", comp = "", sort = "" } = await searchParams;
  const term = q.toLowerCase();
  const [lang, t, tc, tt] = await Promise.all([getLanguage(), getTranslations("itemsPage"), getTranslations("common"), getTranslations("heroes")]);
  const [allItems, statsRes] = await Promise.all([getItems(), loadItemStats({})]);
  const usage = statsRes.ok ? usageMap(statsRes.data) : new Map<number, { winRate: number; matches: number }>();
  const order = (a: Item, b: Item) => {
    const by = sort === "winrate" ? (usage.get(b.id)?.winRate ?? -1) - (usage.get(a.id)?.winRate ?? -1) : sort === "matches" ? (usage.get(b.id)?.matches ?? -1) - (usage.get(a.id)?.matches ?? -1) : 0;
    return by || a.name.localeCompare(b.name);
  };
  const shop = allItems.filter((i) => i.type === "upgrade" && i.shopable && i.item_slot_type && i.item_tier && i.item_tier <= 4);

  const matches = shop.filter(
    (i) =>
      (!tier || String(i.item_tier) === tier) &&
      (!kind || (kind === "active" ? i.is_active_item : !i.is_active_item)) &&
      (!comp || (comp === "yes" ? !!i.component_items?.length : !i.component_items?.length)) &&
      (!term || i.name.toLowerCase().includes(term)),
  );
  const items = matches.filter((i) => !cat || i.item_slot_type === cat);
  // Pestañas de categoría: conservan el resto de filtros y muestran cuántos objetos hay en cada una con ellos.
  const tabHref = (c: string) => {
    const next = new URLSearchParams(Object.entries({ q, tier, kind, comp, sort, cat: c }).filter(([, v]) => v));
    return next.size ? `/items?${next}` : "/items";
  };
  const visibleCats = CATEGORIES.filter((c) => !cat || c === cat);

  return (
    <div className="space-y-8">
      <PosterHeader title={t("title")} subtitle={t("subtitle", { count: shop.length })} />
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            { name: "q", label: t("search"), type: "search", placeholder: t("searchPlaceholder") },
            { name: "cat", label: t("category"), type: "select", options: CATEGORIES.map((c) => ({ value: c, label: tc(c) })) },
            { name: "tier", label: t("tier"), type: "select", options: [1, 2, 3, 4].map((n) => ({ value: String(n), label: tt("tierN", { tier: n }) })) },
            { name: "kind", label: t("kind"), type: "select", options: [{ value: "active", label: t("active") }, { value: "passive", label: t("passive") }] },
            { name: "comp", label: t("components"), type: "select", options: [{ value: "yes", label: t("withComp") }, { value: "no", label: t("noComp") }] },
            ...(usage.size ? [{ name: "sort", label: t("sortBy"), type: "select" as const, allLabel: t("sortName"), options: [{ value: "winrate", label: t("sortWin") }, { value: "matches", label: t("sortUsed") }] }] : []),
          ]}
        />
      </Suspense>
      <nav aria-label={t("category")} className="flex flex-wrap gap-2">
        {[{ value: "", label: t("all"), n: matches.length }, ...CATEGORIES.map((c) => ({ value: c as string, label: tc(c), n: matches.filter((i) => i.item_slot_type === c).length }))].map((tab) => {
          const on = cat === tab.value;
          return (
            <Link
              key={tab.value}
              href={tabHref(tab.value)}
              replace
              scroll={false}
              aria-current={on ? "page" : undefined}
              style={catVar((tab.value || undefined) as Category | undefined)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${on ? "border-(--c) bg-(--c) text-night" : "border-(--c)/50 hover:bg-(--c)/15"}`}
            >
              {tab.value && <span aria-hidden className={`size-2 rotate-45 ${on ? "bg-night" : "bg-(--c)"}`} />}
              {tab.label}
              <span className={`text-xs tabular-nums ${on ? "text-night/80" : "text-ink-muted"}`}>{tab.n}</span>
            </Link>
          );
        })}
      </nav>
      <p className="text-sm text-ink-muted" aria-live="polite">{t.rich(items.length === shop.length ? "count" : "countOf", { count: items.length, total: shop.length, b: (c) => <strong className="text-ink">{c}</strong> })}</p>

      {items.length === 0 ? (
        <EmptyState title={t("noMatch")} hint={t("noMatchHint")} />
      ) : (
        <div className={`grid gap-6 ${visibleCats.length === 1 ? "" : "lg:grid-cols-3"}`}>
          {visibleCats.map((c) => {
            const list = items.filter((i) => i.item_slot_type === c);
            const avg = groupWinRate(usage, list.map((i) => i.id));
            return (
              <section key={c} aria-label={tc(c)} style={catVar(c)} className="space-y-5 rounded-xl border border-(--c)/30 border-t-4 border-t-(--c) bg-panel/60 p-3 pt-4 sm:p-4">
                <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span aria-hidden className="size-3 rotate-45 bg-(--c)" />
                  <span className="font-display text-2xl font-black">{tc(c)}</span>
                  <Chip tone={CATEGORY[c].tone}>{list.length}</Chip>
                  {avg !== null && <span className="ml-auto text-xs text-ink-muted">{t.rich("avgWin", { value: fmtPct(avg), b: (c) => <strong className="text-ink tabular-nums">{c}</strong> })}</span>}
                </h2>
                {[1, 2, 3, 4].map((n) => {
                  const group = list.filter((i) => i.item_tier === n).sort(order);
                  if (!group.length) return null;
                  return (
                    <div key={n} className="space-y-2">
                      <h3 className="flex items-center gap-2 border-b border-(--c)/30 pb-1.5 text-sm font-bold">
                        <TierPips tier={n} />
                        <span>{tt("tierN", { tier: n })}</span>
                        <span className="ml-auto font-normal tabular-nums text-ink-muted"><span aria-hidden className="text-(--c)">◆</span> {t("soulsEach", { count: fmtNum(group[0].cost ?? 0) })}</span>
                      </h3>
                      <div className={`grid grid-cols-[minmax(0,1fr)] gap-2 ${visibleCats.length === 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
                        {group.map((i) => <ItemTile key={i.id} item={i} lang={lang} usage={usage.get(i.id)} />)}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
