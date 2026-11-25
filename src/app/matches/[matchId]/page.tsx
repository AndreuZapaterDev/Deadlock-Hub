import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LineChartBase } from "@/components/charts/lazy-charts";
import { ProfileProblem } from "@/components/player/profile-problem";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { Tabs } from "@/components/ui/tabs";
import { fmtDuration, fmtNum } from "@/lib/format";
import { byId, getHeroNames, getItems } from "@/lib/lookup";
import { loadMatch } from "@/lib/match-data";
import { loadNames } from "@/lib/player-data";
import { gameModeLabel, matchModeLabel } from "@/lib/player-stats";
import { getSource } from "@/lib/api";
import type { MatchPlayer } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("matchPage"))("title") };
}

const last = (p: MatchPlayer) => p.stats.at(-1);

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const [t, tm, locale] = await Promise.all([getTranslations("matchPage"), getTranslations("modes"), getLocale()]);
  // Los equipos son 0 y 1; la API no dice cuál es cada facción, así que se llaman A y B.
  const TEAM = [t("teamA"), t("teamB")];
  const raw = (await params).matchId;
  if (!/^\d{1,12}$/.test(raw)) notFound();
  const matchId = Number(raw);

  const data = await loadMatch(matchId);
  if (data.state !== "ok") return <ProfileProblem state={data.state} subject={t("matchN", { id: matchId })} backHref="/players" backLabel={t("goPlayers")} />;
  const { match, accolades } = data;

  const [heroNames, items, names, map] = await Promise.all([
    getHeroNames(),
    getItems().then(byId),
    loadNames(match.players.map((p) => p.account_id)),
    getSource().get<{ radius: number }>("/v1/assets/map").then((r) => r.data),
  ]);
  const hero = (id: number) => heroNames.get(id) ?? t("heroFallback", { id });
  // La lista de `items` de un jugador mezcla objetos de tienda con las mejoras de sus habilidades: aquí solo cuentan los objetos
  const shopItems = (p: MatchPlayer) => p.items.filter((i) => items.get(i.item_id)?.type === "upgrade");
  const who = (p: MatchPlayer) => names.get(p.account_id) ?? `#${p.account_id}`;
  const teams = [0, 1].map((tm2) => match.players.filter((p) => p.team === tm2).sort((a, b) => b.net_worth - a.net_worth));

  // Ventaja de almas: suma de net_worth por equipo en cada instante registrado
  const steps = Math.min(...match.players.map((p) => p.stats.length));
  const soulDiff = Array.from({ length: steps }, (_, i) => {
    const sum = (team: number) => match.players.filter((p) => p.team === team).reduce((a, p) => a + (p.stats[i]?.net_worth ?? 0), 0);
    return { t: fmtDuration(match.players[0].stats[i].time_stamp_s), value: sum(1) - sum(0) };
  });

  // Objetivos destruidos, acumulados por equipo (`team` es el dueño del objetivo destruido)
  const objs = [...match.objectives].filter((o) => o.destroyed_time_s > 0).sort((a, b) => a.destroyed_time_s - b.destroyed_time_s);
  const objCurve = [{ t: "0:00", a: 0, b: 0 }];
  const cnt = [0, 0];
  for (const o of objs) {
    cnt[o.team] = (cnt[o.team] ?? 0) + 1;
    objCurve.push({ t: fmtDuration(o.destroyed_time_s), a: cnt[0], b: cnt[1] });
  }

  const winner = match.winning_team;
  const R = map.radius;
  const deaths = match.players.flatMap((p) => (p.death_details ?? []).map((d) => ({ x: d.death_pos.x, y: d.death_pos.y, team: p.team, t: d.game_time_s, hero: hero(p.hero_id) })));
  const avgBadge = [match.average_badge_team0, match.average_badge_team1];

  return (
    <div className="space-y-12">

      <PosterHeader title={t("matchN", { id: matchId })} subtitle={`${gameModeLabel(match.game_mode, tm)} · ${matchModeLabel(match.match_mode, tm)}`}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Chip tone="sage">{t("winnerChip", { team: TEAM[winner] })}</Chip>
          <Chip>{t("durationChip", { time: fmtDuration(match.duration_s) })}</Chip>
          <Chip>{new Date(match.start_time * 1000).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</Chip>
          {avgBadge.some((b) => b) && <Chip>{t("avgRank", { ranks: avgBadge.filter(Boolean).join(" / ") })}</Chip>}
        </div>
      </PosterHeader>

      <Tabs syncHash sticky label={t("tabsLabel")} tabs={[
        { id: "board", label: t("tabBoard"), content: (
      <section aria-labelledby="board" className="space-y-6">
        <SectionTitle id="board">{t("tabBoard")}</SectionTitle>
        {teams.map((list, ti) => (
          <div key={ti} className="space-y-2">
            <h3 className="flex items-center gap-2 font-display text-xl font-black">{TEAM[ti]} {ti === winner ? <Chip tone="sage">{t("victory")}</Chip> : <Chip tone="rose">{t("defeat")}</Chip>}</h3>
            <div className="overflow-x-auto rounded-md border border-brass/30">
              <table className="w-full min-w-4xl border-collapse text-sm">
                <thead className="bg-brass/10 text-left">
                  <tr>
                    {[t("colHero"), t("colPlayer"), t("colKda"), t("colSouls"), t("colLastHits"), t("colLevel"), t("colHeroDamage"), t("colObjDamage"), t("colHealing"), t("colItems")].map((h, i) => (
                      <th key={h} scope="col" className={`whitespace-nowrap px-3 py-2 font-semibold ${i === 0 ? "sticky left-0 z-10 bg-surface" : ""} ${i >= 2 && i <= 8 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => {
                    const s = last(p);
                    const final = [...new Set(shopItems(p).filter((i) => i.sold_time_s === 0).map((i) => items.get(i.item_id)?.name ?? `#${i.item_id}`))];
                    return (
                      <tr key={p.account_id + "-" + p.hero_id} className="border-t border-brass/20 hover:bg-brass/5">
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-1.5 font-semibold">{hero(p.hero_id)}</td>
                        <td className="whitespace-nowrap px-3 py-1.5"><Link href={`/players/${p.account_id}`} className="link-brass">{who(p)}</Link></td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{p.kills} / {p.deaths} / {p.assists}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{fmtNum(p.net_worth)}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{p.last_hits} / {p.denies}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{p.level}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{s ? fmtNum(s.player_damage) : "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{s ? fmtNum(s.boss_damage) : "—"}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{s ? fmtNum(s.player_healing) : "—"}</td>
                        <td className="max-w-64 px-3 py-1.5 text-xs text-ink-muted" title={final.join(", ")}><span className="line-clamp-2">{final.join(", ")}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

        ) },
        { id: "charts", label: t("tabCharts"), content: (
          <div className="space-y-12">
      <section aria-labelledby="charts" className="space-y-5">
        <SectionTitle id="charts">{t("howItWent")}</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-1 font-semibold">{t("soulLead")}</h3>
            <p className="mb-2 text-xs text-ink-muted">{t("soulLeadNote", { a: TEAM[0], b: TEAM[1] })}</p>
            <LineChartBase data={soulDiff} xKey="t" series={[{ key: "value", label: `${TEAM[1]} − ${TEAM[0]}` }]} />
          </Card>
          <Card>
            <h3 className="mb-1 font-semibold">{t("objectivesDestroyed")}</h3>
            <p className="mb-2 text-xs text-ink-muted">{t("objectivesNote")}</p>
            <LineChartBase data={objCurve} xKey="t" step series={[{ key: "a", label: t("objectivesOf", { team: TEAM[0] }) }, { key: "b", label: t("objectivesOf", { team: TEAM[1] }) }]} />
          </Card>
        </div>
      </section>

      {deaths.length > 0 && (
        <section aria-labelledby="deaths" className="space-y-4">
          <SectionTitle id="deaths">{t("deathsMap")}</SectionTitle>
          <Card className="mx-auto max-w-2xl">
            <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} role="img" aria-label={t("deathsAria", { count: deaths.length })} className="w-full">
              <circle r={R} fill="none" stroke="var(--brass)" strokeOpacity={0.5} strokeWidth={40} />
              <circle r={R / 2} fill="none" stroke="var(--brass)" strokeOpacity={0.2} strokeWidth={30} strokeDasharray="120 160" />
              <path d={`M${-R} 0H${R}M0 ${-R}V${R}`} stroke="var(--brass)" strokeOpacity={0.2} strokeWidth={30} />
              {deaths.map((d, i) => (
                <circle key={i} cx={d.x} cy={-d.y} r={190} fill={d.team === 0 ? "var(--apricot)" : "var(--teal)"} fillOpacity={0.75} stroke="var(--surface)" strokeWidth={30}>
                  <title>{`${d.hero} · ${fmtDuration(d.t)} · ${TEAM[d.team]}`}</title>
                </circle>
              ))}
            </svg>
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm">
              <span className="flex items-center gap-2"><span aria-hidden className="size-3 rounded-full bg-apricot" /> {t("deathsOf", { team: TEAM[0] })}</span>
              <span className="flex items-center gap-2"><span aria-hidden className="size-3 rounded-full bg-teal" /> {t("deathsOf", { team: TEAM[1] })}</span>
            </div>
            <p className="mt-2 text-center text-xs text-ink-muted">{t("deathsNote")}</p>
          </Card>
        </section>
      )}
          </div>
        ) },
        { id: "accolades", label: t("tabAccolades"), content: (
      <section aria-labelledby="accolades" className="space-y-4">
        <SectionTitle id="accolades">{t("accolades")}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {match.players.filter((p) => p.accolades?.length).map((p) => (
            <Card key={p.account_id + "-" + p.hero_id} className="space-y-2">
              <p className="font-semibold">{hero(p.hero_id)} <span className="text-xs font-normal text-ink-muted">· {who(p)}</span></p>
              <div className="flex flex-wrap gap-1.5">
                {p.accolades!.slice(0, 4).map((a) => <Chip key={a.accolade_id}>{accolades.get(a.accolade_id) ?? `#${a.accolade_id}`} · {fmtNum(a.accolade_stat_value)}</Chip>)}
              </div>
            </Card>
          ))}
        </div>
      </section>

        ) },
        { id: "buys", label: t("tabBuys"), content: (
      <section aria-labelledby="buys" className="space-y-4">
        <SectionTitle id="buys">{t("buysPerPlayer")}</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-2">
          {match.players.map((p) => (
            <details key={p.account_id + "-" + p.hero_id} className="rounded-md border border-brass/30 bg-surface px-4 py-2 shadow-card">
              <summary className="cursor-pointer py-1 font-semibold">{hero(p.hero_id)} <span className="text-xs font-normal text-ink-muted">{t("buysSummary", { count: shopItems(p).length, team: TEAM[p.team] })}</span></summary>
              <ol className="mt-2 space-y-0.5 pb-2 text-sm">
                {[...shopItems(p)].sort((a, b) => a.game_time_s - b.game_time_s).map((i, n) => (
                  <li key={n} className="flex gap-3">
                    <span className="w-12 shrink-0 tabular-nums text-ink-muted">{fmtDuration(i.game_time_s)}</span>
                    <span>{items.get(i.item_id)?.name ?? `#${i.item_id}`}{i.sold_time_s > 0 && <span className="text-xs text-ink-muted"> {t("soldAt", { time: fmtDuration(i.sold_time_s) })}</span>}</span>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </section>
        ) },
      ]} />
    </div>
  );
}
