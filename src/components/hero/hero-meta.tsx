import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BarChartBase, SankeyChart } from "@/components/charts/lazy-charts";
import { HeroChip } from "@/components/hero/hero-chip";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { SectionTitle } from "@/components/ui/section-title";
import { TierBadge } from "@/components/ui/tier-badge";
import { assignTiers, bestPartners, rankMatchups, winRate } from "@/lib/analytics";
import { fmtDec, fmtNum, fmtPct } from "@/lib/format";
import { byId, getHeroes, getItems } from "@/lib/lookup";
import { loadCounters, loadFlow, loadHeroDeep, loadHeroMeta, loadLeaderboard, loadSynergy } from "@/lib/meta-data";
import { buildFlowSankey } from "@/lib/sankey";
import { slugify } from "@/lib/slug";
import type { Hero, Item } from "@/lib/types";
import { Panel } from "@/components/ui/panel";
import { Rank } from "@/components/ui/rank";
import { Stat } from "@/components/ui/stat";

const ABILITY_COLOR = ["bg-apricot", "bg-lilac", "bg-sage", "bg-teal"];

/** Estadísticas de meta de una ficha de héroe: win/pick/ban, orden de habilidades, builds, flujo de objetos, counters, sinergias y leaderboard. */
export type MetaPart = "meta" | "order" | "builds" | "flow" | "matchups" | "board";

/** `parts`: qué bloques pinta (la ficha los reparte en varias pestañas; los datos van en caché, así que repetir la llamada no repite las peticiones). */
export async function HeroMeta({ hero, abilities, parts }: { hero: Hero; abilities: Item[]; parts: MetaPart[] }) {
  const show = (p: MetaPart) => parts.includes(p);
  const [t, th, tp] = await Promise.all([getTranslations("heroMeta"), getTranslations("heroPage"), getTranslations("tierList")]);
  const [meta, counters, synergy, deep, flow, board, heroes, items] = await Promise.all([
    loadHeroMeta({}),
    loadCounters({}),
    loadSynergy({}),
    loadHeroDeep(hero.id),
    loadFlow(hero.id, {}),
    loadLeaderboard("Europe", hero.id),
    getHeroes(),
    getItems().then(byId),
  ]);
  const name = new Map(heroes.map((h) => [h.id, h.name]));
  const itemName = (id: number) => items.get(id)?.name ?? `#${id}`;

  const ranked = meta.ok ? assignTiers(meta.data.rows.filter((r) => name.has(r.id)).map((r) => ({ ...r, score: r.adjusted }))) : [];
  const mine = ranked.find((r) => r.id === hero.id);

  const abilityIndex = new Map(abilities.map((a, i) => [a.id, i + 1]));
  const order = deep ? [...deep.abilityOrder].sort((a, b) => b.matches - a.matches).slice(0, 3) : [];
  const orderIsThisHero = order.some((o) => o.abilities.some((id) => abilityIndex.has(id)));
  const maxFirst = deep && orderIsThisHero ? deep.maxFirst.filter((m) => abilityIndex.has(m.ability_id)).map((m) => ({ name: itemName(m.ability_id), value: winRate(m.wins, m.matches) })) : [];
  const builds = deep ? [...deep.builds].filter((b) => b.hero_id === hero.id).sort((a, b) => b.matches - a.matches).slice(0, 5) : [];
  const sankey = flow?.ok ? buildFlowSankey(flow.data, itemName) : null;

  const strong = counters.ok ? rankMatchups(counters.data, hero.id, "strong") : [];
  const weak = counters.ok ? rankMatchups(counters.data, hero.id, "weak") : [];
  const partners = synergy.ok ? bestPartners(synergy.data, hero.id) : [];
  const top10 = board.ok ? board.data.slice(0, 10) : [];

  return (
    <>
      {show("meta") && (
      <section aria-labelledby="meta" className="space-y-4">
        <SectionTitle id="meta">{th("metaStats")}</SectionTitle>
        {mine ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat value={fmtPct(mine.winRate)} label={tp("colWin")}>
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-ink-muted"><TierBadge tier={mine.tier} size="sm" /> {t("rankOf", { rank: mine.rank, total: ranked.length })}</div>
            </Stat>
            <Stat value={fmtPct(mine.pickRate)} label={tp("colPick")} />
            <Stat value={mine.banRate === null ? "—" : fmtPct(mine.banRate)} label={tp("colBan")} />
            <Stat value={fmtDec(mine.kda)} label={t("kdaAvg")} />
          </div>
        ) : (
          <ErrorState title={t("statsError")} />
        )}
        <p className="text-xs text-ink-muted">{t.rich("seeAllIn", { link: (c) => <Link href="/tier-list" className="link-brass font-semibold">{c}</Link> })}</p>
      </section>
      )}

      {show("order") && (
      <section aria-labelledby="order" className="space-y-4">
        <SectionTitle id="order">{th("abilityOrder")}</SectionTitle>
        {order.length && orderIsThisHero ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {order.map((o, i) => (
                <Card key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{t("orderN", { n: i + 1 })}</span>
                    <span className="text-ink-muted">{t("orderMatches", { rate: fmtPct(winRate(o.wins, o.matches)), matches: fmtNum(o.matches) })}</span>
                  </div>
                  <ol className="flex flex-wrap gap-1" aria-label={t("orderAria", { list: o.abilities.map((a) => abilityIndex.get(a) ?? "?").join(", ") })}>
                    {o.abilities.map((a, n) => {
                      const k = abilityIndex.get(a);
                      return <li key={n} className={`grid size-7 place-items-center rounded-sm text-sm font-black text-night ${k ? ABILITY_COLOR[k - 1] : "bg-brass/30"}`}>{k ?? "?"}</li>;
                    })}
                  </ol>
                </Card>
              ))}
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
                {abilities.map((a, i) => <li key={a.id} className="flex items-center gap-1.5"><span className={`size-3 rounded-sm ${ABILITY_COLOR[i]}`} /> {i + 1}. {a.name}</li>)}
              </ul>
            </div>
            {maxFirst.length > 0 && (
              <Card>
                <h3 className="mb-2 font-semibold">{t("maxFirstTitle")}</h3>
                <BarChartBase data={maxFirst} percent height={240} />
              </Card>
            )}
          </div>
        ) : (
          <EmptyState title={t("noOrder")} hint={t("noOrderHint")} />
        )}
      </section>
      )}

      {show("builds") && (
      <section aria-labelledby="builds" className="space-y-4">
        <SectionTitle id="builds">{t("popularBuilds")}</SectionTitle>
        {builds.length ? (
          <div className="overflow-x-auto rounded-md border border-brass/30">
            <table className="w-full min-w-lg border-collapse text-sm">
              <thead className="bg-brass/10 text-left"><tr><th scope="col" className="px-3 py-2 font-semibold">{t("colBuild")}</th><th scope="col" className="px-3 py-2 text-right font-semibold">{t("colMatches")}</th><th scope="col" className="px-3 py-2 text-right font-semibold">{t("colWin")}</th><th scope="col" className="px-3 py-2 text-right font-semibold">{t("colPlayers")}</th></tr></thead>
              <tbody>
                {builds.map((b) => (
                  <tr key={b.hero_build_id} className="border-t border-brass/20">
                    <td className="px-3 py-2 font-semibold"><Link href={`/builds/${hero.id}/${b.hero_build_id}`} className="link-brass">{deep?.buildNames.get(b.hero_build_id) ?? t("buildFallback", { id: b.hero_build_id })}</Link></td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(b.matches)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPct(winRate(b.wins, b.matches))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(b.players)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={t("noBuilds")} />
        )}
        <p className="text-xs text-ink-muted">{t.rich("buildsNote", { search: (c) => <Link href={`/builds?hero=${hero.id}`} className="link-brass font-semibold">{c}</Link>, planner: (c) => <Link href={`/build-planner?h=${slugify(hero.name)}`} className="link-brass font-semibold">{c}</Link> })}</p>
      </section>
      )}

      {show("flow") && (
      <section aria-labelledby="flow" className="space-y-4">
        <SectionTitle id="flow">{t("itemsByPhase")}</SectionTitle>
        {sankey && sankey.nodes.length ? (
          <Card>
            <p className="mb-2 text-xs text-ink-muted">{t("flowNote")}</p>
            <SankeyChart data={sankey} />
          </Card>
        ) : (
          <ErrorState title={t("flowError")} />
        )}
      </section>
      )}

      {show("matchups") && (
      <section aria-labelledby="matchups" className="space-y-4">
        <SectionTitle id="matchups">{t("matchups")}</SectionTitle>
        {!counters.ok || !synergy.ok ? (
          <ErrorState title={t("matchupsError")} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {([[t("strongAgainst"), strong, "good"], [t("weakAgainst"), weak, "bad"], [t("bestPartners"), partners, "good"]] as const).map(([title, rows, tone]) => (
              <Panel key={title} title={title}>
                <ul className="space-y-2">
                  {rows.map((r, i) => <li key={r.id} className="flex items-center gap-2"><Rank n={i + 1} /><div className="min-w-0 flex-1"><HeroChip id={r.id} name={name.get(r.id) ?? `#${r.id}`} note={t("chipNote", { rate: fmtPct(r.rate), matches: fmtNum(r.matches) })} tone={tone} /></div></li>)}
                </ul>
              </Panel>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted">{t.rich("matchupsNote", { link: (c) => <Link href={`/counters?a=${slugify(hero.name)}`} className="link-brass font-semibold">{c}</Link> })}</p>
      </section>
      )}

      {show("board") && (
      <section aria-labelledby="board" className="space-y-4">
        <SectionTitle id="board">{t("boardOf", { name: hero.name })}</SectionTitle>
        {!board.ok ? (
          <ErrorState title={t("boardError")} />
        ) : top10.length ? (
          <>
            <ol className="divide-y divide-brass/20 rounded-md border border-brass/30 bg-surface">
              {top10.map((e) => (
                <li key={e.rank} className="flex items-center gap-4 px-3 py-2">
                  <Rank n={e.rank} />
                  {e.possible_account_ids[0] ? <Link href={`/players/${e.possible_account_ids[0]}`} className="link-brass font-semibold">{e.account_name}</Link> : <span className="font-semibold">{e.account_name}</span>}
                  {e.possible_account_ids.length > 1 && <span className="text-xs text-ink-muted">{t("possibleAccounts", { count: e.possible_account_ids.length - 1 })}</span>}
                </li>
              ))}
            </ol>
            <p className="text-xs"><Link href={`/leaderboard?hero=${slugify(hero.name)}`} className="link-brass font-semibold">{t("fullBoard")}</Link> · {t("region")}</p>
          </>
        ) : (
          <EmptyState title={t("noBoard")} />
        )}
      </section>
      )}
    </>
  );
}
