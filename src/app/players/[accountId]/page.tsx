import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChartBase, LineChartBase } from "@/components/charts/lazy-charts";
import { HeroPortrait } from "@/components/hero/hero-card";
import { MatchRow } from "@/components/match/match-row";
import { FollowButton } from "@/components/player/follows";
import { PlayerList } from "@/components/player/player-list";
import { ProfileProblem } from "@/components/player/profile-problem";
import { RankBadge } from "@/components/player/rank-badge";
import { RefreshButton } from "@/components/player/refresh-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { RateMeter } from "@/components/ui/rate-meter";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { SortableTable } from "@/components/ui/sortable-table";
import { Tabs } from "@/components/ui/tabs";
import { fmtDec, fmtDuration, fmtNum, fmtPct, timeAgo } from "@/lib/format";
import { getHeroNames, getRanks } from "@/lib/lookup";
import { loadNames, loadPlayer } from "@/lib/player-data";
import { cumulativeWinRate, filterHistory, matchesPerDay, matchModeLabel, rankSeries, recentForm, streaks, type ResultFilter } from "@/lib/player-stats";
import { parseAccountId } from "@/lib/steam-id";
import type { Relation } from "@/lib/types";

const PAGE_SIZE = 20;

export async function generateMetadata({ params }: { params: Promise<{ accountId: string }> }): Promise<Metadata> {
  const id = parseAccountId((await params).accountId);
  if (id === null) return {};
  const data = await loadPlayer(id);
  return { title: data.state === "ok" ? data.profile?.personaname ?? `Jugador #${id}` : "Jugador" };
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-md border border-brass/30 bg-surface p-4 text-center shadow-card">
      <p className="font-display text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export default async function PlayerPage({ params, searchParams }: { params: Promise<{ accountId: string }>; searchParams: Promise<{ page?: string; res?: string; hero?: string }> }) {
  const sp = await searchParams;
  const id = parseAccountId((await params).accountId);
  if (id === null) notFound();

  const data = await loadPlayer(id);
  if (data.state !== "ok") return <ProfileProblem state={data.state} subject={`Cuenta #${id}`} />;

  const { profile, rank, region, history, summary, heroes, mates, enemies, builds } = data;
  const [heroNames, ranks] = await Promise.all([getHeroNames(), getRanks()]);
  const name = profile?.personaname ?? `Jugador #${id}`;
  const tier = rank ? ranks.find((r) => r.tier === rank.rank) : undefined;

  // Compañeros y rivales: los más frecuentes y los de mejor récord (mínimo 20 partidas, para que un 1/1 no sea "100 %")
  const top = (rows: Relation[]) => [...rows].sort((a, b) => b.matches - a.matches).slice(0, 12);
  const best = (rows: Relation[]) => rows.filter((r) => r.matches >= 20).sort((a, b) => b.wins / b.matches - a.wins / a.matches || b.matches - a.matches).slice(0, 12);
  const worst = (rows: Relation[]) => rows.filter((r) => r.matches >= 20).sort((a, b) => a.wins / a.matches - b.wins / b.matches || b.matches - a.matches).slice(0, 12);
  const lists = { mateTop: top(mates), mateBest: best(mates), enemyTop: top(enemies), enemyWorst: worst(enemies) };
  const names = await loadNames(Object.values(lists).flat().map((r) => r.id));

  // Historial filtrado (resultado y héroe, en la URL) y paginado
  const result: ResultFilter = sp.res === "win" || sp.res === "loss" ? sp.res : "all";
  const heroFilter = heroes.find((h) => String(h.hero_id) === sp.hero)?.hero_id;
  const filtered = filterHistory(history, { result, heroId: heroFilter });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages);
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const histHref = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams(Object.entries({ res: sp.res, hero: sp.hero, ...extra }).filter((e): e is [string, string] => !!e[1] && e[1] !== "all"));
    return `/players/${id}${q.size ? `?${q}` : ""}#history`;
  };
  const chip = (active: boolean) => `rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${active ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`;
  const form = recentForm(history, 20);
  const run = streaks(history);

  // Gráficas: solo con lo que devuelve la API
  const winCurve = cumulativeWinRate(history);
  const perDay = matchesPerDay(history, 30);
  const rankCurve = rankSeries(history);
  const rankNames = Object.fromEntries(ranks.map((r) => [r.tier, r.name]));

  const mostPlayed = [...heroes].sort((a, b) => b.matches_played - a.matches_played).slice(0, 8);
  const favorites = [...heroes].sort((a, b) => b.matches_played - a.matches_played).slice(0, 3);
  const heroRows = heroes.map((h) => ({
    id: h.hero_id,
    hero: heroNames.get(h.hero_id) ?? `Héroe #${h.hero_id}`,
    matches: h.matches_played,
    winrate: h.matches_played ? h.wins / h.matches_played : 0,
    kda: (h.kills + h.assists) / Math.max(h.deaths, 1),
    souls: Math.round(h.networth_per_min),
    last: h.last_played,
  }));

  return (
    <div className="space-y-12">

      <PosterHeader title={name} subtitle={`Cuenta #${id}${region ? ` · ${region}` : ""}`}>
        <div className="flex flex-wrap items-start justify-center gap-3">
          <FollowButton id={id} name={name} />
          <RefreshButton accountId={id} />
          <Button href={`/players/compare?a=${id}`} variant="secondary">Comparar con…</Button>
          {profile?.profileurl && <a href={profile.profileurl} target="_blank" rel="noopener noreferrer" className="link-brass self-center text-sm font-semibold text-cream">Ver en Steam ↗</a>}
        </div>
      </PosterHeader>

      <section aria-labelledby="summary" className="space-y-5">
        <SectionTitle id="summary">Resumen</SectionTitle>
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <Card className="space-y-3">
            <p className="text-sm text-ink-muted">Rango actual</p>
            {rank && tier ? <RankBadge tier={tier.tier} sub={rank.subrank} name={tier.name} color={tier.color} size="lg" /> : <p className="font-semibold">Sin rango</p>}
            {rank?.last_match && <p className="text-xs text-ink-muted">Última partida {timeAgo(rank.last_match.start_time)}</p>}
          </Card>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat value={fmtNum(summary.matches)} label="Partidas" />
            <Stat value={fmtPct(summary.winRate)} label="Win rate" hint={`${fmtNum(summary.wins)} victorias`} />
            <Stat value={fmtDec(summary.kda)} label="KDA medio" hint="(K + A) / D" />
            <Stat value={fmtNum(Math.round(summary.soulsPerMin))} label="Almas por minuto" />
          </div>
        </div>
        {history.length > 0 && (
          <Card className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">Forma reciente <span className="text-sm font-normal text-ink-muted">(últimas {form.length}, la más reciente a la izquierda)</span></h3>
              <p className="text-sm text-ink-muted">
                Racha actual: <strong className={run.current > 0 ? "text-sage-ink" : "text-rose-ink"}>{run.current > 0 ? `${run.current} victoria${run.current === 1 ? "" : "s"}` : `${-run.current} derrota${run.current === -1 ? "" : "s"}`}</strong> · mejor racha de victorias: <strong className="text-ink">{run.bestWin}</strong> · duración media: <strong className="text-ink">{fmtDuration(summary.avgDuration)}</strong>
              </p>
            </div>
            <ol aria-label="Resultados recientes" className="flex flex-wrap gap-1">
              {form.map((w, i) => <li key={i} title={w ? "Victoria" : "Derrota"} className={`grid size-6 place-items-center rounded-sm text-[11px] font-black text-bg ${w ? "bg-sage" : "bg-rose"}`}>{w ? "V" : "D"}</li>)}
            </ol>
          </Card>
        )}
        {favorites.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            {favorites.map((f) => {
              const rate = f.wins / Math.max(f.matches_played, 1);
              return (
                <Link key={f.hero_id} href={`/heroes?q=${encodeURIComponent(heroNames.get(f.hero_id) ?? "")}`} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-2 pr-4 shadow-card transition-colors hover:bg-brass/10">
                  <HeroPortrait hero={{ id: f.hero_id, name: heroNames.get(f.hero_id) ?? "?" }} small className="h-14 w-14 shrink-0" />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block truncate font-semibold">{heroNames.get(f.hero_id) ?? `Héroe #${f.hero_id}`}</span>
                    <span className="block text-xs text-ink-muted">{fmtNum(f.matches_played)} partidas · {fmtPct(rate, 0)} victorias</span>
                    <RateMeter rate={rate} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
        <p className="text-xs text-ink-muted">Calculado con las {fmtNum(history.length)} partidas que devuelve la API. El historial puede no incluir todas las partidas del jugador.</p>
      </section>

      {history.length > 0 && (
        <section aria-labelledby="charts" className="space-y-5">
          <SectionTitle id="charts">Evolución</SectionTitle>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-2 font-semibold">Win rate acumulado</h3>
              <LineChartBase data={winCurve} xKey="label" series={[{ key: "value", label: "Win rate acumulado" }]} yDomain={["dataMin - 2", "dataMax + 2"]} suffix=" %" />
            </Card>
            <Card>
              <h3 className="mb-2 font-semibold">Partidas por día (últimos 30 días)</h3>
              <BarChartBase data={perDay} />
            </Card>
          </div>
          {rankCurve.length >= 5 && (
            <Card>
              <h3 className="mb-2 font-semibold">Rango en partidas ranked</h3>
              <LineChartBase data={rankCurve} xKey="label" series={[{ key: "value", label: "Rango" }]} yLabels={rankNames} yDomain={[Math.floor(Math.min(...rankCurve.map((p) => p.value))), Math.ceil(Math.max(...rankCurve.map((p) => p.value)))]} />
              <p className="mt-2 text-xs text-ink-muted">Solo con las {rankCurve.length} partidas ranked del historial que incluyen el rango; no se guarda la evolución completa.</p>
            </Card>
          )}
        </section>
      )}

      <section aria-labelledby="history" className="space-y-4">
        <SectionTitle id="history">Historial de partidas</SectionTitle>
        {history.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por resultado">
              {([["all", "Todas"], ["win", "Victorias"], ["loss", "Derrotas"]] as const).map(([v, label]) => (
                <Link key={v} href={histHref({ res: v, page: undefined })} aria-current={result === v ? "true" : undefined} className={chip(result === v)}>{label}</Link>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por héroe">
              <Link href={histHref({ hero: undefined, page: undefined })} aria-current={heroFilter === undefined ? "true" : undefined} className={chip(heroFilter === undefined)}>Todos los héroes</Link>
              {mostPlayed.map((h) => (
                <Link key={h.hero_id} href={histHref({ hero: String(h.hero_id), page: undefined })} aria-current={heroFilter === h.hero_id ? "true" : undefined} className={chip(heroFilter === h.hero_id)}>{heroNames.get(h.hero_id) ?? `#${h.hero_id}`}</Link>
              ))}
            </div>
          </div>
        )}
        {history.length === 0 ? (
          <EmptyState title="Este jugador no tiene partidas" hint="Aún no hay partidas suyas en los datos." />
        ) : filtered.length === 0 ? (
          <EmptyState title="Ninguna partida con ese filtro" hint="Prueba con otro resultado u otro héroe." />
        ) : (
          <>
            <div className="space-y-2">
              {slice.map((m) => <MatchRow key={m.match_id} match={m} hero={{ id: m.hero_id, name: heroNames.get(m.hero_id) ?? `Héroe #${m.hero_id}` }} modeLabel={matchModeLabel(m.match_mode)} />)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">Partidas {fmtNum((page - 1) * PAGE_SIZE + 1)}–{fmtNum(Math.min(page * PAGE_SIZE, filtered.length))} de {fmtNum(filtered.length)}</p>
              <Pagination page={page} pages={pages} href={(p) => histHref({ page: p > 1 ? String(p) : undefined })} />
            </div>
          </>
        )}
      </section>

      {heroRows.length > 0 && (
        <section aria-labelledby="heroes" className="space-y-4">
          <SectionTitle id="heroes">Héroes</SectionTitle>
          <SortableTable
            columns={[
              { key: "hero", label: "Héroe" },
              { key: "matches", label: "Partidas", numeric: true },
              { key: "winrate", label: "Win rate", numeric: true },
              { key: "kda", label: "KDA", numeric: true },
              { key: "souls", label: "Almas/min", numeric: true },
              { key: "last", label: "Última vez", numeric: true },
            ]}
            rows={heroRows}
            initialSort={{ key: "matches", dir: "desc" }}
            format={{ matches: "num", winrate: "pct", kda: "dec", souls: "num", last: "ago" }}
          />
        </section>
      )}

      <section aria-labelledby="people" className="space-y-4">
        <SectionTitle id="people">Compañeros y rivales</SectionTitle>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-display text-lg font-black">Compañeros</h3>
            <Tabs tabs={[
              { id: "mate-top", label: "Más partidas", content: <PlayerList rows={lists.mateTop} names={names} empty="Sin compañeros habituales." /> },
              { id: "mate-best", label: "Mejor win rate", content: <PlayerList rows={lists.mateBest} names={names} empty="Ningún compañero con 20 partidas o más." /> },
            ]} />
          </div>
          <div>
            <h3 className="mb-2 font-display text-lg font-black">Rivales</h3>
            <Tabs tabs={[
              { id: "enemy-top", label: "Más partidas", content: <PlayerList rows={lists.enemyTop} names={names} empty="Sin rivales habituales." /> },
              { id: "enemy-worst", label: "Peor récord", content: <PlayerList rows={lists.enemyWorst} names={names} empty="Ningún rival con 20 partidas o más." /> },
            ]} />
          </div>
        </div>
        <p className="text-xs text-ink-muted">Los nombres se piden a Steam; si un jugador no tiene perfil conocido se muestra solo su ID.</p>
      </section>

      <section aria-labelledby="builds" className="space-y-4">
        <SectionTitle id="builds">Builds publicadas</SectionTitle>
        {builds.length === 0 ? (
          <EmptyState title="Sin builds publicadas" hint="Este jugador aún no ha compartido ninguna build." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {builds.map((b) => (
              <li key={b.hero_build.hero_build_id} className="flex items-center justify-between gap-3 rounded-md border border-brass/30 bg-surface p-3 shadow-card">
                <Link href={`/builds/${b.hero_build.hero_id}/${b.hero_build.hero_build_id}`} className="link-brass min-w-0 truncate font-semibold">{b.hero_build.name}</Link>
                <Chip>{heroNames.get(b.hero_build.hero_id) ?? `Héroe #${b.hero_build.hero_id}`}</Chip>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
