import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CAT_COLOR, catVar, ItemIcon, TierPips } from "@/components/item/item-tile";
import { PatchHistory } from "@/components/patch/patch-history";
import { Button } from "@/components/ui/button";
import { FeaturedCard } from "@/components/ui/card";
import { CATEGORY, CategoryChip, Chip } from "@/components/ui/chip";
import { PosterHeader } from "@/components/ui/poster-header";
import { fmtDuration, fmtNum, fmtPct, stripHtml } from "@/lib/format";
import { winRate } from "@/lib/analytics";
import { SectionTitle } from "@/components/ui/section-title";
import { groupWinRate, usageMap, winRank } from "@/lib/item-meta";
import { loadItemStats } from "@/lib/meta-data";
import { itemSections, plainStats } from "@/lib/item-sections";
import { sectionLabel } from "@/lib/labels";
import { getItemIndex, getItems } from "@/lib/lookup";
import type { Item } from "@/lib/types";

export const revalidate = 1800; // la ficha incluye estadísticas de uso (30 min)
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getItems()).filter((i) => i.type === "upgrade").map((i) => ({ slug: i.class_name }));
}

async function find(slug: string) {
  const { byClass } = await getItemIndex();
  const item = byClass.get(slug);
  return item?.type === "upgrade" ? item : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await find((await params).slug);
  return item ? { title: item.name, description: stripHtml(item.description?.desc).slice(0, 160) } : {};
}

function ItemLink({ item }: { item: Item }) {
  return (
    <Link
      href={`/items/${item.class_name}`}
      style={catVar(item.item_slot_type)}
      className="flex items-center gap-3 rounded-lg border border-(--c)/40 bg-linear-to-r from-[color-mix(in_srgb,var(--c)_14%,var(--surface))] to-surface p-2 pr-3 text-sm shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-(--c)"
    >
      <ItemIcon item={item} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold leading-tight">{item.name}</span>
        <span className="text-xs tabular-nums text-ink-muted"><span aria-hidden className="text-(--c)">◆</span> {fmtNum(item.cost ?? 0)}</span>
      </span>
      {item.item_tier && <TierPips tier={item.item_tier} />}
    </Link>
  );
}

/** Flecha entre pasos del camino de construcción. */
function Arrow({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-muted" aria-hidden>
      <span className="h-px flex-1 bg-brass/30" />
      <span>↓ {label}</span>
      <span className="h-px flex-1 bg-brass/30" />
    </p>
  );
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const item = await find(slug);
  if (!item) notFound();

  const [{ byClass, usedBy }, t, tl, tc, th] = await Promise.all([getItemIndex(), getTranslations("itemPage"), getTranslations("labels"), getTranslations("common"), getTranslations("heroes")]);
  const parts = (item.component_items ?? []).map((c) => byClass.get(c)).filter((i): i is Item => !!i);
  const upgradesTo = (usedBy.get(item.class_name) ?? []).filter((i) => i.type === "upgrade");
  const sections = itemSections(item);
  const fallback = sections.length ? [] : plainStats(item);
  const desc = stripHtml(item.description?.desc);
  const cat = item.item_slot_type;
  const usageRes = await loadItemStats({});
  const usage = usageRes.ok ? usageRes.data.find((r) => r.item_id === item.id) : undefined;
  // Comparación con los objetos de su misma categoría y tier
  const peers = (await getItems()).filter((i) => i.type === "upgrade" && i.shopable && i.item_slot_type === cat && i.item_tier === item.item_tier);
  const peerIds = peers.map((p) => p.id);
  const um = usageRes.ok ? usageMap(usageRes.data) : new Map<number, { winRate: number; matches: number }>();
  const rank = winRank(um, peerIds, item.id);
  const peerAvg = groupWinRate(um, peerIds);
  const similar = peers.filter((p) => p.id !== item.id).sort((a, b) => (um.get(b.id)?.winRate ?? 0) - (um.get(a.id)?.winRate ?? 0)).slice(0, 6);

  return (
    <div className="space-y-12">
      <PosterHeader
        title={item.name}
        subtitle={desc ? undefined : t("shopItem")}
        color={cat ? `color-mix(in srgb, ${CAT_COLOR[cat].c} 24%, var(--poster-ray))` : undefined}
      >
        <ItemIcon item={item} size={96} className="mx-auto mb-3 rounded-xl" />
        <div className="flex flex-wrap items-center justify-center gap-2">
          {cat && <CategoryChip category={cat} />}
          {item.item_tier && <Chip>{th("tierN", { tier: item.item_tier })}</Chip>}
          <Chip>{item.is_active_item ? t("active") : t("passive")}</Chip>
          {item.cost !== undefined && <Chip tone={cat ? CATEGORY[cat].tone : "neutral"}>{t("souls", { count: fmtNum(item.cost) })}</Chip>}
          {!item.shopable && <Chip tone="rose">{t("notInShop")}</Chip>}
        </div>
      </PosterHeader>

      <section aria-label={t("description")} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <FeaturedCard>
          {desc && <p className="max-w-prose text-base leading-relaxed">{desc}</p>}
          {sections.map((s) => (
            <div key={s.type} className="mt-4 space-y-2 border-t border-brass/30 pt-3 first:mt-0 first:border-0 first:pt-0">
              <h3 className="font-display text-lg font-black">{sectionLabel(tl, s.type)}</h3>
              {s.text && s.text !== desc && <p className="text-sm leading-relaxed">{s.text}</p>}
              {s.stats.length > 0 && (
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {s.stats.map((st) => (
                    <div key={st.label} className="flex justify-between gap-3 border-b border-brass/15 py-1">
                      <dt className="text-ink-muted">{st.label}</dt>
                      <dd className="font-semibold tabular-nums">{st.text}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
          {fallback.length > 0 && (
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {fallback.map((st) => (
                <div key={st.label} className="flex justify-between gap-3 border-b border-brass/15 py-1">
                  <dt className="text-ink-muted">{st.label}</dt>
                  <dd className="font-semibold tabular-nums">{st.text}</dd>
                </div>
              ))}
            </dl>
          )}
          {!desc && !sections.length && !fallback.length && <p className="text-ink-muted">{t("noDescription")}</p>}
        </FeaturedCard>

        <div className="space-y-6">
          <section aria-label={t("buildPath")} className="space-y-2 rounded-xl border border-brass/30 bg-panel/60 p-3" style={catVar(cat)}>
            <h2 id="parts" className="font-display text-lg font-black">{t("builtWith")}</h2>
            {parts.length ? parts.map((p) => <ItemLink key={p.id} item={p} />) : <p className="text-sm text-ink-muted">{t("baseItem")}</p>}
            <Arrow label={t("leadsTo")} />
            <div style={catVar(cat)} className="flex items-center gap-3 rounded-lg border-2 border-(--c) bg-[color-mix(in_srgb,var(--c)_14%,var(--surface))] p-2 pr-3">
              <ItemIcon item={item} size={40} />
              <span className="font-display text-base font-black">{item.name}</span>
            </div>
            <Arrow label={t("upgradesIn")} />
            <h2 id="into" className="sr-only">{t("upgradesInTitle")}</h2>
            {upgradesTo.length ? upgradesTo.map((p) => <ItemLink key={p.id} item={p} />) : <p className="text-sm text-ink-muted">{t("noParent")}</p>}
          </section>
        </div>
      </section>


      <section aria-labelledby="usage" className="space-y-4">
        <SectionTitle id="usage">{t("usageStats")}</SectionTitle>
        {usage ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              [fmtPct(winRate(usage.wins, usage.matches)), t("winRate")],
              [fmtNum(usage.matches), t("matches")],
              [fmtNum(usage.players), t("players")],
              [fmtDuration(usage.avg_buy_time_s), t("avgBuy")],
              [fmtPct(usage.matches ? usage.sold / usage.matches : 0, 0), t("soldLater")],
            ].map(([v, l]) => (
              <div key={l} style={catVar(cat)} className="rounded-lg border border-(--c)/40 border-t-4 border-t-(--c) bg-surface p-4 text-center shadow-card"><p className="font-display text-2xl font-black">{v}</p><p className="mt-1 text-sm text-ink-muted">{l}</p></div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{usageRes.ok ? t("noUsage") : t("usageError")}</p>
        )}
        {usage && rank && (
          <p className="text-sm">
            {t.rich("rankLine", { pos: rank.pos, of: rank.of, tier: item.item_tier ?? 0, category: cat ? tc(cat) : "—", avg: peerAvg !== null ? t("rankAvg", { avg: fmtPct(peerAvg) }) : "", b: (c) => <strong>{c}</strong> })}
          </p>
        )}
        <p className="text-xs text-ink-muted">{t("usageNote")}</p>
      </section>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="space-y-3">
          <SectionTitle id="similar">{t("similar")}</SectionTitle>
          <p className="text-sm text-ink-muted">{t("similarNote")}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((p) => <ItemLink key={p.id} item={p} />)}
          </div>
        </section>
      )}

      <PatchHistory kind="items" id={item.id} name={item.name} />

      <div className="flex justify-center"><Button href="/items" variant="secondary">{t("backToShop")}</Button></div>
    </div>
  );
}
