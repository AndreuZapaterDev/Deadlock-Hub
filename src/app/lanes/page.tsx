import type { Metadata } from "next";
import { Suspense } from "react";
import { analyticsFields } from "@/components/filters/analytics-fields";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroChip } from "@/components/hero/hero-chip";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { RateMeter } from "@/components/ui/rate-meter";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { SortableTable } from "@/components/ui/sortable-table";
import { describeFilters, hasFilters, parseFilters } from "@/lib/analytics-filters";
import { fmtNum, fmtPct } from "@/lib/format";
import { LANE_PRIOR, lopsidedDuels, rankDuos, toDuels, toDuos, type DuoStat } from "@/lib/lanes";
import { getHeroes, getRanks } from "@/lib/lookup";
import { loadBigDays, loadLaneDuels, loadLaneDuos } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = { title: "Carriles", description: "Qué parejas de héroes ganan más y menos en el carril, y qué duelos de dúo contra dúo están más desequilibrados." };

const TOP = 10;
const soulsLabel = (n: number) => `${n >= 0 ? "+" : "−"}${fmtNum(Math.abs(Math.round(n)))} almas`;

export default async function LanesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [heroes, ranks, bigDays] = await Promise.all([getHeroes(), getRanks(), loadBigDays()]);
  const sorted = [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  const heroBySlug = new Map(sorted.map((h) => [slugify(h.name), h]));
  const focus = sp.h ? heroBySlug.get(sp.h) : undefined;
  const name = new Map(heroes.map((h) => [h.id, h.name]));
  const tierName = (t: number) => ranks.find((r) => r.tier === t)?.name ?? `Rango ${t}`;
  const types = new Map(heroes.map((h) => [h.id, h.hero_type]));
  const duoName = (ids: number[]) => ids.map((i) => name.get(i) ?? `#${i}`).join(" + ");

  const [duoData, duelData] = await Promise.all([loadLaneDuos(filters, focus?.id), loadLaneDuels(filters, focus?.id)]);

  const duos = duoData.ok ? toDuos(duoData.data).filter((d) => d.ids.every((i) => name.has(i))) : [];
  const duels = duelData.ok ? toDuels(duelData.data, 1, !focus).filter((d) => [...d.a, ...d.b].every((i) => name.has(i))) : [];
  const best = rankDuos(duos, "strong", TOP);
  const worst = rankDuos(duos, "weak", TOP);
  const lopsided = lopsidedDuels(duels, 8);

  const chips = (ids: number[]) => ids.map((id) => <HeroChip key={id} id={id} name={name.get(id)!} heroType={types.get(id)} />);
  const duoRow = (d: DuoStat, rank: number) => (
    <li key={d.ids.join("-")} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-brass/30 bg-surface p-2 shadow-card">
      <span className="w-6 shrink-0 text-center font-display text-base font-black text-ink-muted">{rank}</span>
      <div className="grid min-w-0 flex-1 basis-56 gap-1.5 sm:grid-cols-2">{chips(d.ids)}</div>
      {/* Resultado a la derecha: el win rate se lee primero y la barra permite comparar filas de un vistazo. */}
      <div className="w-full shrink-0 pl-9 sm:w-36 sm:pl-0 sm:text-right">
        <p className={`text-lg font-black leading-none tabular-nums ${d.adjusted >= 0.5 ? "text-sage-ink" : "text-rose-ink"}`}>{fmtPct(d.rate)}</p>
        <RateMeter rate={d.rate} className="my-1.5" />
        <p className="text-xs tabular-nums text-ink-muted">{fmtNum(d.matches)} carriles · {soulsLabel(d.soulDiff)}</p>
      </div>
    </li>
  );

  const heroOptions = sorted.map((h) => ({ value: slugify(h.name), label: h.name }));

  return (
    <div className="space-y-8">
      <PosterHeader compact title="Carriles" subtitle="Qué parejas dominan el carril y cuáles lo sufren" />
      <Suspense fallback={null}>
        <FilterBar fields={[{ name: "h", label: "Con el héroe", type: "select", options: heroOptions, allLabel: "Cualquiera" }, ...analyticsFields(ranks, bigDays)]} />
      </Suspense>
      {(hasFilters(filters) || focus) && (
        <p className="text-sm text-ink-muted">Filtros activos: {[...(focus ? [`con ${focus.name}`] : []), ...describeFilters(filters, tierName)].join(" · ")}</p>
      )}

      {!duoData.ok ? (
        <ErrorState title="No se han podido cargar los carriles" hint={duoData.status === 503 || duoData.status === 429 ? "La API está ocupada. Inténtalo en unos segundos." : "Inténtalo de nuevo en unos minutos."} />
      ) : duos.length === 0 ? (
        <ErrorState title="Sin partidas suficientes" hint="Prueba con menos filtros: hace falta un mínimo de carriles jugados para sacar conclusiones." />
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="best" className="space-y-3 rounded-xl border border-sage/30 border-t-4 border-t-sage bg-panel/60 p-3 sm:p-4">
              <SectionTitle id="best">Parejas más fuertes</SectionTitle>
              <p className="text-sm text-ink-muted">Las que más ganan cuando juegan juntas en el carril.</p>
              <ol className="space-y-2">{best.map((d, i) => duoRow(d, i + 1))}</ol>
            </section>
            <section aria-labelledby="worst" className="space-y-3 rounded-xl border border-rose/30 border-t-4 border-t-rose bg-panel/60 p-3 sm:p-4">
              <SectionTitle id="worst">Parejas más débiles</SectionTitle>
              <p className="text-sm text-ink-muted">Las que más pierden: mejor evitarlas.</p>
              <ol className="space-y-2">{worst.map((d, i) => duoRow(d, i + 1))}</ol>
            </section>
          </div>

          {lopsided.length > 0 && (
            <section aria-labelledby="duels" className="space-y-3">
              <div className="flex items-center gap-3"><SectionTitle id="duels">Duelos más desequilibrados</SectionTitle><Chip tone="apricot">beta</Chip></div>
              <p className="max-w-prose text-sm text-ink-muted">Dúo contra dúo en el mismo carril: los enfrentamientos donde uno de los dos lados gana claramente más.</p>
              <ul className="grid gap-2 md:grid-cols-2">
                {lopsided.map((d) => (
                  <li key={`${d.winner}-${d.loser}`}>
                    <Card className="space-y-2 py-3 text-sm">
                      <div className="grid gap-1.5 sm:grid-cols-2">{chips(d.winner)}</div>
                      <p className="text-center text-xs font-semibold text-ink-muted"><span aria-hidden className="text-sage-ink">▲ </span>gana a<span className="sr-only"> el dúo</span><span aria-hidden className="text-rose-ink"> ▼</span></p>
                      <div className="grid gap-1.5 opacity-80 sm:grid-cols-2">{chips(d.loser)}</div>
                      <p className="border-t border-brass/20 pt-2 text-xs tabular-nums text-ink-muted"><strong className="text-base text-sage-ink">{fmtPct(d.rate)}</strong> win rate · {fmtNum(d.matches)} carriles · {soulsLabel(d.soulDiff)} a los 15 min</p>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="all" className="space-y-3">
            <SectionTitle id="all">Todas las parejas</SectionTitle>
            <SortableTable
              columns={[
                { key: "duo", label: "Pareja" },
                { key: "matches", label: "Carriles", numeric: true },
                { key: "winrate", label: "Win rate", numeric: true },
                { key: "adjusted", label: "Ajustado", numeric: true },
                { key: "souls", label: "Almas a los 15 min", numeric: true },
              ]}
              rows={duos.map((d) => ({ id: d.ids.join("-"), duo: duoName(d.ids), matches: d.matches, winrate: d.rate, adjusted: d.adjusted, souls: Math.round(d.soulDiff) }))}
              initialSort={{ key: "adjusted", dir: "desc" }}
              format={{ matches: "num", winrate: "pct", adjusted: "pct", souls: "num" }}
            />
          </section>

          <Card>
            <details>
              <summary className="cursor-pointer font-semibold">Cómo se calcula</summary>
              <div className="mt-3 max-w-prose space-y-2 text-sm text-ink-muted">
                <p><strong className="text-ink">Carril = dos héroes de tu equipo contra otros dos.</strong> Solo cuentan carriles donde ambos lados eran de dos jugadores; el win rate es el de la partida entera, no solo el del carril.</p>
                <p><strong className="text-ink">Ajustado</strong> = (victorias + {fmtNum(LANE_PRIOR / 2)}) / (carriles + {fmtNum(LANE_PRIOR)}). Evita que una pareja con pocos carriles aparezca arriba por suerte. Las listas se ordenan por este valor.</p>
                <p><strong className="text-ink">Almas a los 15 min</strong> = ventaja media del dúo sobre el dúo rival, medida en el minuto 15 (solo cuentan carriles que llegaron hasta ahí).</p>
                <p>Mínimo de {fmtNum(300)} carriles por pareja. Estadística marcada como inestable por la propia API: úsala como orientación.</p>
              </div>
            </details>
          </Card>
        </>
      )}
    </div>
  );
}
