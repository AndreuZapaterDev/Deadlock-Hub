import { BarChartBase, LineChartBase } from "@/components/charts/lazy-charts";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { fmtNum, fmtPct } from "@/lib/format";
import { recentDelta, tierSeries, tightDomain, weeklySeries } from "@/lib/hero-trends";
import { getRanks } from "@/lib/lookup";
import { loadHeroStatsByRank, loadHeroStatsWeekly } from "@/lib/meta-data";
import type { Hero } from "@/lib/types";

/** Rendimiento del héroe: win rate por rango y evolución semanal (win rate y pick rate). Se oculta si la API no responde o no hay muestra. */
export async function HeroPerformance({ hero }: { hero: Hero }) {
  const [byRank, weekly, ranks] = await Promise.all([loadHeroStatsByRank(), loadHeroStatsWeekly(), getRanks()]);
  const tiers = byRank.ok ? tierSeries(byRank.data, hero.id) : [];
  const weeks = weekly.ok ? weeklySeries(weekly.data, hero.id) : [];
  if (tiers.length < 2 && weeks.length < 3) return null;

  const tierName = (t: number) => ranks.find((r) => r.tier === t)?.name ?? `Rango ${t}`;
  const rankData = tiers.map((p) => ({ name: tierName(p.tier), value: p.winRate }));
  const best = tiers.length ? tiers.reduce((a, b) => (b.winRate > a.winRate ? b : a)) : null;
  const delta = recentDelta(weeks);
  const fmtDay = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
  const weekData = weeks.map((w) => ({ week: fmtDay.format(new Date(w.ts * 1000)), win: +(w.winRate * 100).toFixed(1), pick: +(w.pickRate * 100).toFixed(1) }));
  const winDomain = tightDomain(weekData.map((w) => w.win));
  const pickDomain = tightDomain(weekData.map((w) => w.pick), 0.5);

  return (
    <section aria-labelledby="performance" className="space-y-4">
      <SectionTitle id="performance">Rendimiento</SectionTitle>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-muted">
        {best && (
          <p>
            Mejor rango: <strong className="text-ink">{tierName(best.tier)}</strong> ({fmtPct(best.winRate)} de victorias en {fmtNum(best.matches)} partidas)
          </p>
        )}
        {delta !== null && (
          <p>
            Últimas 3 semanas:{" "}
            <strong className={delta > 0.2 ? "text-sage-ink" : delta < -0.2 ? "text-rose-ink" : "text-ink"}>
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} pts
            </strong>{" "}
            de win rate
          </p>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {tiers.length >= 2 && (
          <Card>
            <h3 className="mb-2 font-display text-lg font-black">Win rate por rango</h3>
            <BarChartBase data={rankData} percent height={240} />
          </Card>
        )}
        {weeks.length >= 3 && (
          <Card>
            <h3 className="mb-2 font-display text-lg font-black">Win rate por semana</h3>
            <LineChartBase data={weekData} xKey="week" series={[{ key: "win", label: "Win rate" }]} yDomain={winDomain} suffix="%" height={240} />
          </Card>
        )}
        {weeks.length >= 3 && (
          <Card className="lg:col-span-2">
            <h3 className="mb-2 font-display text-lg font-black">Pick rate por semana</h3>
            <LineChartBase data={weekData} xKey="week" series={[{ key: "pick", label: "Pick rate" }]} yDomain={pickDomain} suffix="%" height={200} />
          </Card>
        )}
      </div>
    </section>
  );
}
