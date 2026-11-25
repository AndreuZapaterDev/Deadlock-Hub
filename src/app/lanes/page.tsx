import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Fragment, Suspense } from "react";
import { analyticsFields } from "@/components/filters/analytics-fields";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroChip } from "@/components/hero/hero-chip";
import { Explainer, ActiveFilters } from "@/components/ui/explainer";
import { Chip } from "@/components/ui/chip";
import { Rank } from "@/components/ui/rank";
import { RateMeter } from "@/components/ui/rate-meter";
import { ErrorState } from "@/components/ui/feedback";
import { apiErrorHint } from "@/lib/api-error-hint";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { SortableTable } from "@/components/ui/sortable-table";
import { describeFilters, hasFilters, parseFilters } from "@/lib/analytics-filters";
import { fmtNum, fmtPct } from "@/lib/format";
import { LANE_PRIOR, lopsidedDuels, rankDuos, toDuels, toDuos, type DuoStat } from "@/lib/lanes";
import { getHeroes, getRanks } from "@/lib/lookup";
import { loadBigDays, loadLaneDuels, loadLaneDuos } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("lanes");
  return { title: t("title"), description: t("metaDesc") };
}

const TOP = 10;

export default async function LanesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [t, ta, th] = await Promise.all([getTranslations("lanes"), getTranslations("analytics"), getTranslations("heroUi")]);
  const soulsLabel = (n: number) => t("souls", { sign: n >= 0 ? "+" : "−", count: fmtNum(Math.abs(Math.round(n))) });
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [heroes, ranks, bigDays] = await Promise.all([getHeroes(), getRanks(), loadBigDays()]);
  const sorted = [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  const heroBySlug = new Map(sorted.map((h) => [slugify(h.name), h]));
  const focus = sp.h ? heroBySlug.get(sp.h) : undefined;
  const name = new Map(heroes.map((h) => [h.id, h.name]));
  const tierName = (n: number) => ranks.find((r) => r.tier === n)?.name ?? th("rankFallback", { tier: n });
  const types = new Map(heroes.map((h) => [h.id, h.hero_type]));
  const duoName = (ids: number[]) => ids.map((i) => name.get(i) ?? `#${i}`).join(" + ");

  const [duoData, duelData] = await Promise.all([loadLaneDuos(filters, focus?.id), loadLaneDuels(filters, focus?.id)]);

  const duos = duoData.ok ? toDuos(duoData.data).filter((d) => d.ids.every((i) => name.has(i))) : [];
  const duels = duelData.ok ? toDuels(duelData.data, 1, !focus).filter((d) => [...d.a, ...d.b].every((i) => name.has(i))) : [];
  const best = rankDuos(duos, "strong", TOP);
  const worst = rankDuos(duos, "weak", TOP);
  const lopsided = lopsidedDuels(duels, 8);

  const chips = (ids: number[]) => ids.map((id) => <HeroChip key={id} id={id} name={name.get(id)!} heroType={types.get(id)} />);
  // Los dos héroes del dúo unidos por un «+»: se ve que juegan juntos en el mismo carril.
  const duoChips = (ids: number[]) => (
    <div className="grid min-w-0 flex-1 basis-56 items-center gap-1.5 sm:grid-cols-[1fr_auto_1fr]">
      {ids.map((id, i) => (
        <Fragment key={id}>
          {i > 0 && <span aria-hidden className="mx-auto grid size-5 place-items-center rounded-full bg-brass/20 font-display text-xs font-black text-brass">+</span>}
          <HeroChip id={id} name={name.get(id)!} heroType={types.get(id)} />
        </Fragment>
      ))}
    </div>
  );
  const duoRow = (d: DuoStat, rank: number) => (
    <li key={d.ids.join("-")} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-l-4 border-brass/30 bg-surface p-2 shadow-card ${d.adjusted >= 0.5 ? "border-l-sage" : "border-l-rose"}`}>
      <Rank n={rank} />
      {duoChips(d.ids)}
      {/* Resultado a la derecha: el win rate se lee primero y la barra permite comparar filas de un vistazo. */}
      <div className="w-full shrink-0 pl-9 sm:w-36 sm:pl-0 sm:text-right">
        <p className={`font-display text-2xl font-black leading-none tabular-nums ${d.adjusted >= 0.5 ? "text-sage-ink" : "text-rose-ink"}`}>{fmtPct(d.rate)}</p>
        <RateMeter rate={d.rate} className="my-1.5" />
        <p className="text-xs tabular-nums text-ink-muted">{t("lanesCount", { matches: fmtNum(d.matches), souls: soulsLabel(d.soulDiff) })}</p>
      </div>
    </li>
  );

  const heroOptions = sorted.map((h) => ({ value: slugify(h.name), label: h.name }));

  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      <Suspense fallback={null}>
        <FilterBar fields={[{ name: "h", label: t("withHero"), type: "select", options: heroOptions, allLabel: ta("any") }, ...analyticsFields(ranks, bigDays, ta)]} />
      </Suspense>
      <ActiveFilters parts={[...(focus ? [ta("fWith", { name: focus.name })] : []), ...(hasFilters(filters) ? describeFilters(filters, tierName, ta) : [])]} />

      {!duoData.ok ? (
        <ErrorState title={t("loadError")} hint={await apiErrorHint(duoData.status)} />
      ) : duos.length === 0 ? (
        <ErrorState title={t("notEnough")} hint={t("notEnoughHint")} />
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            {([
              { id: "best", title: t("strongest"), hint: t("strongestHint"), mark: "▲", tone: "sage", list: best },
              { id: "worst", title: t("weakest"), hint: t("weakestHint"), mark: "▼", tone: "rose", list: worst },
            ] as const).map((g) => (
              <section key={g.id} aria-labelledby={g.id} className={`overflow-hidden rounded-md border bg-panel/60 shadow-card ${g.tone === "sage" ? "border-sage/40" : "border-rose/40"}`}>
                {/* Cabecera con el color del resultado: verde para quien gana, carmesí para quien pierde */}
                <div className={`flex items-center gap-3 border-b px-4 py-3 ${g.tone === "sage" ? "border-sage/40 bg-sage/15" : "border-rose/40 bg-rose/15"}`}>
                  <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full text-lg text-night ${g.tone === "sage" ? "bg-sage" : "bg-rose"}`}>{g.mark}</span>
                  <div className="min-w-0 flex-1">
                    <SectionTitle id={g.id}>{g.title}</SectionTitle>
                    <p className="mt-0.5 text-sm text-ink-muted">{g.hint}</p>
                  </div>
                </div>
                <ol className="space-y-2 p-3 sm:p-4">{g.list.map((d, i) => duoRow(d, i + 1))}</ol>
              </section>
            ))}
          </div>

          {lopsided.length > 0 && (
            <section aria-labelledby="duels" className="space-y-3">
              <div className="flex items-center gap-3"><SectionTitle id="duels">{t("duels")}</SectionTitle><Chip tone="apricot">{t("beta")}</Chip></div>
              <p className="max-w-prose text-sm text-ink-muted">{t("duelsNote")}</p>
              <ul className="grid gap-2 md:grid-cols-2">
                {lopsided.map((d) => (
                  <li key={`${d.winner}-${d.loser}`} className="overflow-hidden rounded-md border border-brass/30 bg-surface shadow-card">
                    {/* Dos lados enfrentados: el dúo que gana en verde, el que pierde en carmesí, con un «VS» en medio */}
                    <div className="grid items-stretch">
                      <div className="space-y-1.5 border-b-2 border-sage bg-sage/10 p-3">
                        <p className="text-xs font-semibold text-sage-ink"><span aria-hidden>▲ </span>{t("win")}</p>
                        <div className="grid gap-1.5 sm:grid-cols-2">{chips(d.winner)}</div>
                      </div>
                      <div className="relative z-10 grid h-0 place-items-center">
                        <span className="grid size-9 place-items-center rounded-full border-2 border-brass bg-surface font-display text-xs font-black text-brass shadow-card"><span aria-hidden>VS</span><span className="sr-only">{t("beats")}</span></span>
                      </div>
                      <div className="space-y-1.5 border-t-2 border-rose bg-rose/10 p-3 pt-4">
                        <p className="text-xs font-semibold text-rose-ink"><span aria-hidden>▼ </span>{t("lose")}</p>
                        <div className="grid gap-1.5 sm:grid-cols-2">{chips(d.loser)}</div>
                      </div>
                    </div>
                    <p className="flex flex-wrap items-baseline gap-x-2 border-t border-brass/20 px-3 py-2 text-xs tabular-nums text-ink-muted">{t.rich("duelLine", { rate: fmtPct(d.rate), matches: fmtNum(d.matches), souls: soulsLabel(d.soulDiff), b: (c) => <strong className="font-display text-xl text-sage-ink">{c}</strong> })}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="all" className="space-y-3">
            <SectionTitle id="all">{t("allPairs")}</SectionTitle>
            <SortableTable
              columns={[
                { key: "duo", label: t("colPair") },
                { key: "matches", label: t("colLanes"), numeric: true },
                { key: "winrate", label: t("colWin"), numeric: true },
                { key: "adjusted", label: t("colAdjusted"), numeric: true },
                { key: "souls", label: t("colSouls"), numeric: true },
              ]}
              rows={duos.map((d) => ({ id: d.ids.join("-"), duo: duoName(d.ids), matches: d.matches, winrate: d.rate, adjusted: d.adjusted, souls: Math.round(d.soulDiff) }))}
              initialSort={{ key: "adjusted", dir: "desc" }}
              format={{ matches: "num", winrate: "pct", adjusted: "pct", souls: "num" }}
            />
          </section>

          <Explainer>
                <p>{t.rich("explain1", { b: (c: React.ReactNode) => <strong className="text-ink">{c}</strong> })}</p>
                <p>{t.rich("explain2", { half: fmtNum(LANE_PRIOR / 2), prior: fmtNum(LANE_PRIOR), b: (c: React.ReactNode) => <strong className="text-ink">{c}</strong> })}</p>
                <p>{t.rich("explain3", { b: (c: React.ReactNode) => <strong className="text-ink">{c}</strong> })}</p>
                <p>{t("explain4", { min: fmtNum(300) })}</p>
          </Explainer>
        </>
      )}
    </div>
  );
}
