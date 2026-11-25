import { fmtDec } from "@/lib/format";
import { useTranslations } from "next-intl";
import type { StatPosition } from "@/lib/hero-stats";

export type StatRow = { label: string; text: string; pos?: StatPosition; /** true si un valor más bajo es mejor (recarga, por ejemplo) */ lowerIsBetter?: boolean };

/**
 * Lista de estadísticas con una barra que sitúa al héroe entre todos los demás (de la mínima a la máxima) y una marca en la media.
 * Debajo: puesto entre los héroes y diferencia con la media. Sin JavaScript.
 */
export function StatBars({ rows }: { rows: StatRow[] }) {
  const t = useTranslations("common");
  return (
    <dl className="divide-y divide-brass/20 text-sm">
      {rows.map((r) => {
        const p = r.pos;
        const rank = p && (r.lowerIsBetter ? p.of - p.rank + 1 : p.rank);
        const better = p && (r.lowerIsBetter ? p.vsAvg < 0 : p.vsAvg > 0);
        const avgPct = p && p.max > p.min ? ((p.avg - p.min) / (p.max - p.min)) * 100 : 50;
        return (
          <div key={r.label} className="py-2">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">{r.label}</dt>
              <dd className="font-semibold tabular-nums">{r.text}</dd>
            </div>
            {p && p.max > p.min && (
              <div className="mt-1.5" title={t("rankTitle", { rank: rank ?? 0, of: p.of })}>
                <div className="relative h-1.5 rounded-full bg-brass/15">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-brass" style={{ width: `${Math.max(p.pct, 3)}%` }} />
                  <div aria-hidden className="absolute -top-0.5 h-2.5 w-0.5 bg-ink/60" style={{ left: `${avgPct}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] tabular-nums text-ink-muted">
                  {t("rankOf", { rank: rank ?? 0, of: p.of })}{" "}
                  <span className={Math.abs(p.vsAvg) < 1 ? "" : better ? "text-sage-ink" : "text-rose-ink"}>
                    {Math.abs(p.vsAvg) < 1 ? t("onAverage") : t("vsAverage", { sign: p.vsAvg > 0 ? "+" : "−", delta: fmtDec(Math.abs(p.vsAvg)) })}
                  </span>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </dl>
  );
}
