import type { Metadata } from "next";
import { BarChartBase } from "@/components/charts/charts";
import { Reveal } from "@/components/motion/reveal";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { getSource } from "@/lib/api";
import { fmtNum, fmtPct } from "@/lib/format";
import { getRanks, getSeasons } from "@/lib/lookup";

export const metadata: Metadata = { title: "Rangos", description: "Los 12 rangos de Deadlock, cuántos jugadores hay en cada uno y las temporadas ranked." };
export const revalidate = 43200;

type Badge = { badge_level: number; unique_players: number };
const date = (unix: number) => new Date(unix * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export default async function RanksPage() {
  const [ranks, seasons, dist] = await Promise.all([
    getRanks(),
    getSeasons(),
    getSource().get<Badge[]>("/v1/analytics/badge-distribution").then((r) => r.data),
  ]);

  // badge_level = tier * 10 + subrango (ver DATA_REPORT.md): jugadores por tier
  const perTier = new Map<number, number>();
  for (const b of dist) perTier.set(Math.floor(b.badge_level / 10), (perTier.get(Math.floor(b.badge_level / 10)) ?? 0) + b.unique_players);
  const total = [...perTier.values()].reduce((a, b) => a + b, 0);
  const chart = ranks.filter((r) => perTier.has(r.tier)).map((r) => ({ name: r.name, value: perTier.get(r.tier) ?? 0 }));

  return (
    <div className="space-y-12">
      <PosterHeader title="Rangos" subtitle="Doce escalones, seis subrangos cada uno" />

      <section aria-labelledby="ladder" className="space-y-5">
        <SectionTitle id="ladder">La escalera</SectionTitle>
        <div role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ranks.map((r, i) => {
            const n = perTier.get(r.tier);
            return (
              <Reveal key={r.tier} delay={(i % 4) * 0.07}>
                <div role="listitem">
                  <Card className="flex items-center gap-4">
                    {/* insignia provisional: el borde usa el color del rango que da la API */}
                    <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full border-4 bg-surface font-display text-xl font-black" style={{ borderColor: r.color }}>{r.tier}</span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-black leading-tight">{r.name}</h3>
                      <p className="text-xs text-ink-muted">{n ? `${fmtNum(n)} jugadores · ${fmtPct(n / total)}` : "Sin datos de jugadores"}</p>
                      <div aria-hidden className="mt-1.5 flex gap-1">
                        {Array.from({ length: 6 }, (_, s) => <span key={s} className="size-1.5 rotate-45 bg-brass" />)}
                      </div>
                    </div>
                  </Card>
                </div>
              </Reveal>
            );
          })}
        </div>
        <p className="text-xs text-ink-muted">Las insignias reales se mostrarán al conectar la API; mientras tanto, cada rango se identifica con su número y su color.</p>
      </section>

      <section aria-labelledby="dist" className="space-y-4">
        <SectionTitle id="dist">Jugadores por rango</SectionTitle>
        <Card>
          <BarChartBase data={chart} height={300} />
          <p className="mt-2 text-xs text-ink-muted">{fmtNum(total)} jugadores con rango en los datos de ejemplo.</p>
        </Card>
      </section>

      <section aria-labelledby="seasons" className="space-y-4">
        <SectionTitle id="seasons">Temporadas ranked</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {seasons.map((s) => (
            <Card key={s.class_name} className="space-y-2">
              <h3 className="font-display text-xl font-black">{s.name}</h3>
              {s.intervals?.map((iv, i) => <p key={i} className="text-sm">{date(iv.start_timestamp)} → {date(iv.end_timestamp)}</p>)}
              <dl className="grid grid-cols-3 gap-2 border-t border-brass/30 pt-3 text-center text-sm">
                {[["Partidas de calibración", s.calibration_matches], ["Victorias mínimas", s.min_wins], ["Victorias con un héroe", s.min_hero_wins]].map(([k, v]) => (
                  <div key={String(k)}><dd className="font-display text-xl font-black">{v ?? "—"}</dd><dt className="text-xs text-ink-muted">{k}</dt></div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
