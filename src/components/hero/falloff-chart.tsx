import { useTranslations } from "next-intl";
import type { FalloffPoint } from "@/lib/hero-stats";

const W = 400;
const H = 150;
const PAD = { l: 34, r: 10, t: 10, b: 26 };

/**
 * Cuánto daño hace el arma según la distancia: 100 % cerca y baja hasta un mínimo a partir de cierta distancia.
 * Es una aproximación lineal (ver `falloffCurve`).
 */
export function FalloffChart({ points, maxMeters = 40 }: { points: FalloffPoint[]; maxMeters?: number }) {
  const t = useTranslations("heroUi");
  const x = (m: number) => PAD.l + (m / maxMeters) * (W - PAD.l - PAD.r);
  const y = (s: number) => PAD.t + (1 - s) * (H - PAD.t - PAD.b);
  const line = points.map((p) => `${x(p.m)},${y(p.scale)}`).join(" ");
  const area = `${x(points[0].m)},${y(0)} ${line} ${x(points[points.length - 1].m)},${y(0)}`;
  const min = Math.min(...points.map((p) => p.scale));
  const end = points.find((p) => p.scale === min)!;
  const start = points.find((p) => p.scale < 1);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("falloffAria", { min: Math.round(min * 100), meters: Math.round(end.m) })} className="w-full">
        {[0, 0.5, 1].map((s) => (
          <g key={s}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(s)} y2={y(s)} stroke="var(--brass)" strokeOpacity={0.25} />
            <text x={PAD.l - 6} y={y(s) + 4} textAnchor="end" fontSize={10} fill="var(--ink-muted)">{Math.round(s * 100)}%</text>
          </g>
        ))}
        {[0, 10, 20, 30, 40].filter((m) => m <= maxMeters).map((m) => (
          <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">{m} m</text>
        ))}
        <polygon points={area} fill="var(--accent)" fillOpacity={0.18} />
        <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {start && <circle cx={x(points[points.indexOf(start) - 1]?.m ?? 0)} cy={y(1)} r={3.5} fill="var(--brass)" />}
        <circle cx={x(end.m)} cy={y(end.scale)} r={3.5} fill="var(--brass)" />
      </svg>
      <figcaption className="mt-1 text-xs text-ink-muted">Daño según la distancia (aproximado): {Math.round(min * 100)} % a partir de {Math.round(end.m)} m.</figcaption>
    </figure>
  );
}
