import Link from "next/link";
import { BarChartBase, SankeyChart } from "@/components/charts/charts";
import { HeroChip } from "@/components/hero/hero-chip";
import { Card } from "@/components/ui/card";
import { DemoNote } from "@/components/ui/demo-note";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { SectionTitle } from "@/components/ui/section-title";
import { TierBadge } from "@/components/ui/tier-badge";
import { assignTiers, bestPartners, rankMatchups, winRate } from "@/lib/analytics";
import { fmtDec, fmtNum, fmtPct } from "@/lib/format";
import { byId, getHeroes, getItems } from "@/lib/lookup";
import { hasHeroSpecificData, loadCounters, loadFlow, loadHeroDeep, loadHeroMeta, loadLeaderboard, loadSynergy } from "@/lib/meta-data";
import { buildFlowSankey } from "@/lib/sankey";
import { slugify } from "@/lib/slug";
import type { Hero, Item } from "@/lib/types";

const ABILITY_COLOR = ["bg-apricot", "bg-lilac", "bg-sage", "bg-teal"];

function Stat({ value, label, children }: { value: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-brass/30 bg-surface p-4 text-center shadow-card">
      <p className="font-display text-3xl font-black">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
      {children}
    </div>
  );
}

/** Estadísticas de meta de una ficha de héroe: win/pick/ban, orden de habilidades, builds, flujo de objetos, counters, sinergias y leaderboard. */
export async function HeroMeta({ hero, abilities }: { hero: Hero; abilities: Item[] }) {
  const specific = hasHeroSpecificData(hero.id);
  const [meta, counters, synergy, deep, flow, board, heroes, items] = await Promise.all([
    loadHeroMeta({}),
    loadCounters({}),
    loadSynergy({}),
    specific ? loadHeroDeep(hero.id) : Promise.resolve(null),
    specific ? loadFlow(hero.id, {}) : Promise.resolve(null),
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
      <section aria-labelledby="meta" className="space-y-4">
        <SectionTitle id="meta">Estadísticas del meta</SectionTitle>
        {mine ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat value={fmtPct(mine.winRate)} label="Win rate">
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-ink-muted"><TierBadge tier={mine.tier} size="sm" /> Puesto {mine.rank} de {ranked.length}</div>
            </Stat>
            <Stat value={fmtPct(mine.pickRate)} label="Pick rate" />
            <Stat value={mine.banRate === null ? "—" : fmtPct(mine.banRate)} label="Ban rate" />
            <Stat value={fmtDec(mine.kda)} label="KDA medio" />
          </div>
        ) : (
          <ErrorState title="No se han podido cargar las estadísticas de este héroe" />
        )}
        <DemoNote>Los datos de ejemplo son un único periodo, así que la tendencia por parche y el rendimiento por rango (gráficas) no están disponibles; con la API real se activan.</DemoNote>
        <p className="text-xs text-ink-muted">Ver todos los héroes en la <Link href="/tier-list" className="link-brass font-semibold">tier list</Link>.</p>
      </section>

      <section aria-labelledby="order" className="space-y-4">
        <SectionTitle id="order">Orden de habilidades</SectionTitle>
        {!specific ? (
          <EmptyState title="Sin datos de ejemplo para este héroe" hint="El modo demo solo incluye el orden de habilidades, las builds y el flujo de objetos de Infernus. Con la API real estarán para todos los héroes." />
        ) : order.length && orderIsThisHero ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              {order.map((o, i) => (
                <Card key={i} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Orden {i + 1}</span>
                    <span className="text-ink-muted">{fmtPct(winRate(o.wins, o.matches))} · {fmtNum(o.matches)} partidas</span>
                  </div>
                  <ol className="flex flex-wrap gap-1" aria-label={`Orden de subida: ${o.abilities.map((a) => abilityIndex.get(a) ?? "?").join(", ")}`}>
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
                <h3 className="mb-2 font-semibold">Win rate según la habilidad que se maximiza primero</h3>
                <BarChartBase data={maxFirst} percent height={240} />
              </Card>
            )}
          </div>
        ) : (
          <EmptyState title="Sin datos de orden de habilidades" hint="No hay partidas suficientes con estos filtros." />
        )}
      </section>

      <section aria-labelledby="builds" className="space-y-4">
        <SectionTitle id="builds">Builds populares</SectionTitle>
        {!specific ? (
          <EmptyState title="Sin datos de ejemplo para este héroe" hint="El modo demo solo incluye las builds de Infernus." />
        ) : builds.length ? (
          <div className="overflow-x-auto rounded-md border border-brass/30">
            <table className="w-full min-w-lg border-collapse text-sm">
              <thead className="bg-brass/10 text-left"><tr><th scope="col" className="px-3 py-2 font-semibold">Build</th><th scope="col" className="px-3 py-2 text-right font-semibold">Partidas</th><th scope="col" className="px-3 py-2 text-right font-semibold">Win rate</th><th scope="col" className="px-3 py-2 text-right font-semibold">Jugadores</th></tr></thead>
              <tbody>
                {builds.map((b) => (
                  <tr key={b.hero_build_id} className="border-t border-brass/20">
                    <td className="px-3 py-2 font-semibold"><Link href={`/builds/${hero.id}/${b.hero_build_id}`} className="link-brass">{deep?.buildNames.get(b.hero_build_id) ?? `Build #${b.hero_build_id}`}</Link></td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(b.matches)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtPct(winRate(b.wins, b.matches))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtNum(b.players)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin builds con datos" />
        )}
        <p className="text-xs text-ink-muted">Solo las builds publicadas tienen nombre; el resto se identifica por su número. Busca más en el <Link href={`/builds?hero=${hero.id}`} className="link-brass font-semibold">buscador de builds</Link> o pruébalas en el <Link href={`/build-planner?h=${slugify(hero.name)}`} className="link-brass font-semibold">planner</Link>.</p>
      </section>

      <section aria-labelledby="flow" className="space-y-4">
        <SectionTitle id="flow">Objetos por fase</SectionTitle>
        {!specific ? (
          <EmptyState title="Sin datos de ejemplo para este héroe" hint="El modo demo solo incluye el flujo de objetos de Infernus." />
        ) : sankey && sankey.nodes.length ? (
          <Card>
            <p className="mb-2 text-xs text-ink-muted">Los 4 objetos más comprados en cada fase de la partida (de izquierda a derecha) y cómo se pasa de uno a otro.</p>
            <SankeyChart data={sankey} />
          </Card>
        ) : (
          <ErrorState title="No se ha podido cargar el flujo de objetos" />
        )}
      </section>

      <section aria-labelledby="matchups" className="space-y-4">
        <SectionTitle id="matchups">Counters y sinergias</SectionTitle>
        {!counters.ok || !synergy.ok ? (
          <ErrorState title="No se han podido cargar los enfrentamientos" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {([["Fuerte contra", strong, "good"], ["Débil contra", weak, "bad"], ["Mejores compañeros", partners, "good"]] as const).map(([title, rows, tone]) => (
              <div key={title} className="space-y-2">
                <h3 className="font-display text-lg font-black">{title}</h3>
                <ul className="space-y-2">
                  {rows.map((r) => <li key={r.id}><HeroChip id={r.id} name={name.get(r.id) ?? `#${r.id}`} note={`${fmtPct(r.rate)} · ${fmtNum(r.matches)} partidas`} tone={tone} /></li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted">Solo se cuentan enfrentamientos con 1.000 partidas o más. Matriz completa en <Link href={`/counters?a=${slugify(hero.name)}`} className="link-brass font-semibold">counters</Link>.</p>
      </section>

      <section aria-labelledby="board" className="space-y-4">
        <SectionTitle id="board">Leaderboard de {hero.name}</SectionTitle>
        {!board.ok ? (
          <ErrorState title="No se ha podido cargar el leaderboard" />
        ) : top10.length ? (
          <>
            <ol className="divide-y divide-brass/20 rounded-md border border-brass/30 bg-surface">
              {top10.map((e) => (
                <li key={e.rank} className="flex items-center gap-4 px-3 py-2">
                  <span className="w-8 text-right font-display text-lg font-black tabular-nums">{e.rank}</span>
                  {e.possible_account_ids[0] ? <Link href={`/players/${e.possible_account_ids[0]}`} className="link-brass font-semibold">{e.account_name}</Link> : <span className="font-semibold">{e.account_name}</span>}
                  {e.possible_account_ids.length > 1 && <span className="text-xs text-ink-muted">+{e.possible_account_ids.length - 1} cuentas posibles</span>}
                </li>
              ))}
            </ol>
            <p className="text-xs"><Link href={`/leaderboard?hero=${slugify(hero.name)}`} className="link-brass font-semibold">Ver el leaderboard completo</Link> · región: Europa</p>
          </>
        ) : (
          <EmptyState title="Aún no hay clasificación de este héroe" />
        )}
        <DemoNote>El mock solo guarda el leaderboard de Infernus en Europa: cualquier héroe muestra esa misma lista de ejemplo.</DemoNote>
      </section>
    </>
  );
}
