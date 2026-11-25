import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BuildCard } from "@/components/builds/build-card";
import { CAT_COLOR, catVar, ItemIcon, TierPips } from "@/components/item/item-tile";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ErrorState } from "@/components/ui/feedback";
import { apiErrorHint } from "@/lib/api-error-hint";
import { PosterHeader } from "@/components/ui/poster-header";
import { RateMeter } from "@/components/ui/rate-meter";
import { SectionTitle } from "@/components/ui/section-title";
import { adjustedWinRate } from "@/lib/analytics";
import { categoriesOf, categoryMix, linkify, orderSteps, shopItemsOf, totalCost } from "@/lib/builds";
import { loadBuild, loadBuildList, loadBuildTags } from "@/lib/builds-data";
import { loadItemStats } from "@/lib/meta-data";
import { encodeBuild } from "@/lib/build-planner";
import { fmtNum, fmtPct, timeAgo } from "@/lib/format";
import { byId, getHeroNames, getItems } from "@/lib/lookup";
import { loadNames } from "@/lib/player-data";
import { slugify } from "@/lib/slug";

const int = (v: string) => (/^\d{1,12}$/.test(v) ? Number(v) : null);

export async function generateMetadata({ params }: { params: Promise<{ heroId: string; buildId: string }> }): Promise<Metadata> {
  const { heroId, buildId } = await params;
  const [h, b] = [int(heroId), int(buildId)];
  if (h === null || b === null) return {};
  const r = await loadBuild(h, b);
  return r.ok ? { title: r.data.hero_build.name } : { title: (await getTranslations("builds"))("buildFallback") };
}

export default async function BuildPage({ params }: { params: Promise<{ heroId: string; buildId: string }> }) {
  const { heroId, buildId } = await params;
  const [hid, bid] = [int(heroId), int(buildId)];
  if (hid === null || bid === null) notFound();

  const [t, tc, locale] = await Promise.all([getTranslations("builds"), getTranslations("common"), getLocale()]);
  const res = await loadBuild(hid, bid);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return <ErrorState title={t("detailError")} hint={await apiErrorHint(res.status)} />;
  }

  const build = res.data;
  const h = build.hero_build;
  const [heroNames, items, tags, authors, itemStats, similar] = await Promise.all([
    getHeroNames(), getItems().then(byId), loadBuildTags(), loadNames([h.author_account_id]), loadItemStats({}, h.hero_id),
    loadBuildList({ hero: h.hero_id, sort: "favorites", page: 1 }),
  ]);
  const heroName = heroNames.get(h.hero_id) ?? t("heroFallback", { id: h.hero_id });
  const author = authors.get(h.author_account_id);
  const tagLabel = new Map(tags.map((t) => [t.id, t.label]));
  const categories = categoriesOf(build);
  const steps = orderSteps(build);

  // Enlace al planner con los objetos de tienda de la build, en el orden en que aparecen
  const shopItems = [...new Set(categories.flatMap((c) => c.mods).map((m) => items.get(m.ability_id)).filter((i) => i?.type === "upgrade").map((i) => i!.class_name))];
  const plannerHref = `/build-planner?${encodeBuild(slugify(heroName), shopItems)}`;

  const desc = (h.description ?? "").trim();
  const shop = shopItemsOf(build, items);
  const mix = categoryMix(shop);
  const cost = totalCost(shop);
  // Win rate de cada objeto entre las compras de este héroe
  const meta = new Map(itemStats.ok ? itemStats.data.map((r) => [r.item_id, { rate: r.matches ? r.wins / r.matches : 0, adjusted: adjustedWinRate(r.wins, r.matches), matches: r.matches }]) : []);
  const known = shop.map((i) => meta.get(i.id)).filter((m): m is NonNullable<typeof m> => !!m && m.matches >= 200);
  const avgRate = known.length ? known.reduce((a, m) => a + m.rate, 0) / known.length : null;
  const others = similar.ok ? similar.data.items.filter((b) => b.hero_build.hero_build_id !== h.hero_build_id).slice(0, 3) : [];

  return (
    <div className="space-y-12">

      <PosterHeader title={h.name} subtitle={t("buildOf", { hero: heroName })}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Chip tone="lilac">{heroName}</Chip>
          <Chip>v{h.version}</Chip>
          <Chip>★ {fmtNum(build.num_favorites ?? 0)}</Chip>
          <Chip>{t("updatedAgo", { when: timeAgo(h.last_updated_timestamp, locale) })}</Chip>
          {(h.tags ?? []).map((t) => tagLabel.get(t)).filter((t): t is string => !!t).map((t) => <Chip key={t}>{t}</Chip>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {shopItems.length > 0 && <Button href={plannerHref} variant="secondary">{t("openPlanner")}</Button>}
          <Button href={`/heroes/${slugify(heroName)}`} variant="ghost"><span className="text-cream">{t("viewHero", { hero: heroName })}</span></Button>
        </div>
      </PosterHeader>

      <ul aria-label={t("summary")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { v: String(shop.length), l: t("statItems") },
          { v: cost > 0 ? `◆ ${fmtNum(cost)}` : "—", l: t("statCost") },
          { v: avgRate !== null ? fmtPct(avgRate) : "—", l: t("statWin", { hero: heroName }) },
          { v: fmtNum(build.num_weekly_favorites ?? 0), l: t("statWeekly") },
        ].map((x) => (
          <li key={x.l} className="rounded-md border border-brass/30 bg-surface p-3 text-center shadow-card">
            <p className="font-display text-2xl font-black tabular-nums">{x.v}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{x.l}</p>
          </li>
        ))}
        {mix.total > 0 && (
          <li className="col-span-2 space-y-1.5 rounded-md border border-brass/30 bg-surface p-3 shadow-card lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("mixLabel")}</p>
            <span role="img" aria-label={t("mixAria", { weapon: mix.counts.weapon, vitality: mix.counts.vitality, spirit: mix.counts.spirit })} className="flex h-2.5 overflow-hidden rounded-full bg-ink-muted/20">
              <span className="bg-apricot" style={{ width: `${mix.share.weapon * 100}%` }} />
              <span className="bg-sage" style={{ width: `${mix.share.vitality * 100}%` }} />
              <span className="bg-lilac" style={{ width: `${mix.share.spirit * 100}%` }} />
            </span>
            <p className="flex flex-wrap gap-x-4 text-xs"><span className="text-apricot-ink">{t("catCount", { label: tc("weapon"), count: mix.counts.weapon })}</span><span className="text-sage-ink">{t("catCount", { label: tc("vitality"), count: mix.counts.vitality })}</span><span className="text-lilac-ink">{t("catCount", { label: tc("spirit"), count: mix.counts.spirit })}</span></p>
          </li>
        )}
      </ul>

      <section aria-labelledby="about" className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 id="about" className="font-display text-xl font-black">{t("notes")}</h2>
          {desc ? (
            <p className="max-w-prose whitespace-pre-line text-sm [overflow-wrap:anywhere] leading-relaxed">
              {linkify(desc).map((p, i) => p.type === "link" ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="link-brass font-semibold">{p.value}</a> : p.value)}
            </p>
          ) : (
            <p className="text-sm text-ink-muted">{t("noNotes")}</p>
          )}
        </div>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">{t("importTitle")}</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">{t("buildId")}</dt><dd className="font-mono font-semibold">{h.hero_build_id}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">{t("version")}</dt><dd className="font-mono font-semibold">{h.version}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">{t("author")}</dt><dd><Link href={`/players/${h.author_account_id}`} className="link-brass font-semibold">{author ?? `#${h.author_account_id}`}</Link></dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={String(h.hero_build_id)} label={t("copyId")} />
            <Button href={`/builds?author=${h.author_account_id}`} variant="ghost">{t("moreByAuthor")}</Button>
          </div>
          <p className="text-xs text-ink-muted">{t("importHint")}</p>
        </Card>
      </section>

      <section aria-labelledby="items" className="space-y-4">
        <SectionTitle id="items">{t("itemsByPhase")}</SectionTitle>
        {categories.every((c) => c.mods.length === 0) ? (
          <p className="text-sm text-ink-muted">{t("noItems")}</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.filter((c) => c.mods.length > 0).map((c, i) => (
              <Card key={i} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-black">{c.name}</h3>
                  {totalCost(c.mods.map((m) => items.get(m.ability_id) ?? {})) > 0 && <span className="text-xs tabular-nums text-ink-muted">◆ {fmtNum(totalCost(c.mods.map((m) => items.get(m.ability_id) ?? {})))}</span>}
                </div>
                {c.description && <p className="text-xs text-ink-muted">{c.description}</p>}
                <ol className="space-y-2">
                  {c.mods.map((m, n) => {
                    const it = items.get(m.ability_id);
                    const st = it?.type === "upgrade" ? meta.get(it.id) : undefined;
                    const cat = it?.item_slot_type;
                    return (
                      <li key={n} style={catVar(cat)} className="flex items-center gap-3 rounded-md border border-(--c)/30 bg-[color-mix(in_srgb,var(--c)_8%,var(--surface))] p-1.5 pr-3">
                        <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-brass">{n + 1}</span>
                        {it && <ItemIcon item={it} size={40} />}
                        <span className="min-w-0 flex-1">
                          {it?.type === "upgrade" ? <Link href={`/items/${it.class_name}`} className="link-brass block truncate text-sm font-bold">{it.name}</Link> : <span className="block truncate text-sm font-bold">{it?.name ?? t("itemFallback", { id: m.ability_id })}</span>}
                          <span className="flex items-center gap-2 text-xs text-ink-muted">
                            {it?.item_tier ? <TierPips tier={it.item_tier} /> : null}
                            {it?.cost ? <span className="tabular-nums">◆ {fmtNum(it.cost)}</span> : null}
                            {cat && <span className={CAT_COLOR[cat].ink}>{tc(cat)}</span>}
                          </span>
                          {m.annotation && <span className="block text-xs italic text-ink-muted">«{m.annotation}»</span>}
                        </span>
                        {st && st.matches >= 200 && (
                          <span className="w-14 shrink-0 text-right" title={t("winTitle", { hero: heroName, matches: fmtNum(st.matches) })}>
                            <span className="block text-xs font-black tabular-nums">{fmtPct(st.rate)}</span>
                            <RateMeter rate={st.rate} className="mt-0.5" />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </Card>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted">{t("authorTexts")}</p>
      </section>

      {steps.length > 0 && (
        <section aria-labelledby="order" className="space-y-4">
          <SectionTitle id="order">{t("skillOrder")}</SectionTitle>
          <Card>
            <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-right font-bold tabular-nums text-brass">{i + 1}</span>
                  {items.get(s.ability_id) && <ItemIcon item={items.get(s.ability_id)!} size={28} />}
                  <span className="font-semibold">{items.get(s.ability_id)?.name ?? `#${s.ability_id}`}</span>
                  <span className="text-xs text-ink-muted">{s.currency_type === 2 ? t("unlock") : t("upgradeStep")}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-ink-muted">{t("stepsNote")}</p>
          </Card>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby="similar" className="space-y-4">
          <SectionTitle id="similar">{t("othersOf", { hero: heroName })}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((b) => (
              <BuildCard key={b.hero_build.hero_build_id} build={b} heroId={b.hero_build.hero_id} heroName={heroName} shop={shopItemsOf(b, items)} tags={(b.hero_build.tags ?? []).map((t) => tagLabel.get(t)).filter((t): t is string => !!t).slice(0, 3)} />
            ))}
          </div>
          <Button href={`/builds?hero=${h.hero_id}`} variant="ghost">{t("seeAllOf", { hero: heroName })}</Button>
        </section>
      )}
    </div>
  );
}
