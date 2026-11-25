import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { analyticsFields } from "@/components/filters/analytics-fields";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroChip } from "@/components/hero/hero-chip";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SortableTable } from "@/components/ui/sortable-table";
import { TierBadge } from "@/components/ui/tier-badge";
import { assignTiers, PRIOR_MATCHES, TIERS } from "@/lib/analytics";
import { describeFilters, hasFilters, parseFilters } from "@/lib/analytics-filters";
import { fmtNum, fmtPct } from "@/lib/format";
const fmtDec = (n: number) => n.toFixed(1).replace(".", ",");
import { getHeroes, getRanks } from "@/lib/lookup";
import { recentDelta, weeklySeries } from "@/lib/hero-trends";
import { loadBigDays, loadHeroMeta, loadHeroStatsWeekly } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = { title: "Tier list", description: "Qué héroes ganan más ahora mismo en Deadlock, ordenados por win rate ajustado." };

export default async function TierListPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const view = sp.view === "table" ? "table" : "tiers";

  // La tendencia semanal no admite filtros (es del meta global), así que solo se pide sin ellos
  const [meta, heroes, ranks, bigDays, weekly] = await Promise.all([loadHeroMeta(filters), getHeroes(), getRanks(), loadBigDays(), hasFilters(filters) ? null : loadHeroStatsWeekly()]);
  const trend = (id: number) => (weekly?.ok ? recentDelta(weeklySeries(weekly.data, id)) : null);
  const trendText = (d: number | null) => (d === null || Math.abs(d) < 0.1 ? "" : ` · ${d > 0 ? "▲ +" : "▼ −"}${fmtDec(Math.abs(d))}`);
  const names = new Map(heroes.map((h) => [h.id, h.name]));
  const tierName = (t: number) => ranks.find((r) => r.tier === t)?.name ?? `Rango ${t}`;

  const href = (v: string) => {
    const q = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => !!e[1] && e[0] !== "view"));
    if (v === "table") q.set("view", "table");
    return `/tier-list${q.size ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <PosterHeader compact title="Tier list" subtitle="Quién gana más ahora mismo" />
      <Suspense fallback={null}>
        <FilterBar fields={analyticsFields(ranks, bigDays)} />
      </Suspense>
      {hasFilters(filters) && <p className="text-sm text-ink-muted">Filtros activos: {describeFilters(filters, tierName).join(" · ")}</p>}

      {!meta.ok ? (
        <ErrorState title="No se han podido cargar las estadísticas" hint={meta.status === 503 || meta.status === 429 ? "La API está ocupada. Inténtalo en unos segundos." : "Inténtalo de nuevo en unos minutos."} />
      ) : (
        (() => {
          const ranked = assignTiers(meta.data.rows.filter((r) => names.has(r.id)).map((r) => ({ ...r, score: r.adjusted })));
          return (
            <>
              {(() => {
                const top = (key: "winRate" | "pickRate" | "banRate" | "kda", label: string, fmt: (n: number) => string) => {
                  const best = [...ranked].filter((r) => r.matches >= 1000).sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0))[0];
                  return best ? { label, id: best.id, value: fmt((best[key] as number) ?? 0) } : null;
                };
                const cards = [top("winRate", "Mayor win rate", fmtPct), top("pickRate", "Más jugado", fmtPct), top("banRate", "Más vetado", fmtPct), top("kda", "Mejor KDA", fmtDec)].filter((c) => c !== null);
                return (
                  <ul aria-label="Destacados" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((c) => (
                      <li key={c.label} className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{c.label}</p>
                        <HeroChip id={c.id} name={names.get(c.id)!} note={c.value} />
                      </li>
                    ))}
                  </ul>
                );
              })()}

              <nav aria-label="Vista" className="flex gap-2">
                {[["tiers", "Por tiers"], ["table", "Tabla"]].map(([v, label]) => (
                  <Link key={v} href={href(v)} aria-current={view === v ? "page" : undefined} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${view === v ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`}>{label}</Link>
                ))}
              </nav>

              {view === "tiers" ? (
                <div className="space-y-3">
                  {TIERS.map((t) => {
                    const list = ranked.filter((r) => r.tier === t);
                    return (
                      <section key={t} aria-label={`Tier ${t}`} className="flex flex-col gap-3 rounded-md border border-brass/30 bg-surface p-3 shadow-card sm:flex-row sm:items-center">
                        <div className="flex shrink-0 items-center gap-3 sm:w-28"><TierBadge tier={t} size="lg" /><span className="text-xs text-ink-muted sm:hidden">{list.length} héroes</span></div>
                        <ul className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {list.map((r) => (
                            <li key={r.id}><HeroChip id={r.id} name={names.get(r.id)!} note={`${fmtPct(r.winRate)} · ${fmtPct(r.pickRate)} pick${trendText(trend(r.id))}`} tone={r.winRate >= 0.5 ? "good" : "bad"} /></li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <SortableTable
                  columns={[
                    { key: "hero", label: "Héroe" },
                    { key: "tier", label: "Tier" },
                    { key: "matches", label: "Partidas", numeric: true },
                    { key: "winrate", label: "Win rate", numeric: true },
                    { key: "adjusted", label: "Ajustado", numeric: true },
                    { key: "pick", label: "Pick rate", numeric: true },
                    { key: "ban", label: "Ban rate", numeric: true },
                    { key: "kda", label: "KDA", numeric: true },
                    ...(weekly?.ok ? [{ key: "trend", label: "Tendencia (pts)", numeric: true }] : []),
                    { key: "souls", label: "Almas/partida", numeric: true },
                  ]}
                  rows={ranked.map((r) => ({
                    id: r.id,
                    href: `/heroes/${slugify(names.get(r.id)!)}`,
                    hero: names.get(r.id)!,
                    tier: r.tier,
                    matches: r.matches,
                    winrate: r.winRate,
                    adjusted: r.adjusted,
                    pick: r.pickRate,
                    ban: r.banRate ?? 0,
                    kda: r.kda,
                    trend: trend(r.id) ?? 0,
                    souls: Math.round(r.soulsPerMatch),
                  }))}
                  initialSort={{ key: "adjusted", dir: "desc" }}
                  format={{ matches: "num", winrate: "pct", adjusted: "pct", pick: "pct", ban: "pct", kda: "dec", souls: "num", trend: "dec" }}
                />
              )}

              <Card>
                <details>
                  <summary className="cursor-pointer font-semibold">Cómo se calcula</summary>
                  <div className="mt-3 max-w-prose space-y-2 text-sm text-ink-muted">
                    <p><strong className="text-ink">Win rate ajustado</strong> = (victorias + {fmtNum(PRIOR_MATCHES / 2)}) / (partidas + {fmtNum(PRIOR_MATCHES)}). Equivale a añadir {fmtNum(PRIOR_MATCHES)} partidas ficticias al 50 %: con pocas partidas el valor se acerca al 50 % (un 3 de 3 no es un 100 %) y con millones apenas cambia.</p>
                    <p><strong className="text-ink">Tiers por posición.</strong> Se ordenan los héroes por win rate ajustado y se reparten por percentil: S el 10 % mejor, A el siguiente 20 %, B el 40 % central, C el 20 % siguiente y D el 10 % peor. Así siempre hay de todo; un tier no significa un win rate concreto.</p>
                    <p><strong className="text-ink">Tendencia</strong> = cambio del win rate en puntos porcentuales: media de las últimas 3 semanas menos la de las anteriores (16 semanas en total). Solo se muestra sin filtros y es una orientación, no una predicción. <strong className="text-ink">Destacados</strong> solo considera héroes con 1.000 partidas o más.</p>
                    <p><strong className="text-ink">Pick rate</strong> = % de partidas en las que se juega el héroe. <strong className="text-ink">Ban rate</strong> = % de partidas en las que se veta. <strong className="text-ink">KDA</strong> = (K + A) / D sobre el total. <strong className="text-ink">Almas/partida</strong> = patrimonio medio al acabar (no hay duración por héroe, así que no se puede dar por minuto).</p>
                  </div>
                </details>
              </Card>
            </>
          );
        })()
      )}
    </div>
  );
}
