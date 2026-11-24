import { fmtPct } from "@/lib/format";

/**
 * Heatmap de win rate (0..1). Rosa por debajo de 50 %, verde por encima.
 * Sin JS en cliente. `values[fila][columna]`; null = sin datos (p. ej. el mismo héroe).
 */
export function Heatmap({ rows, cols, values }: { rows: string[]; cols: string[]; values: (number | null)[][] }) {
  const bg = (v: number) => {
    const t = Math.min(Math.abs(v - 0.5) / 0.1, 1) * 70; // satura a ±10 puntos
    return `color-mix(in srgb, var(${v >= 0.5 ? "--sage" : "--rose"}) ${t}%, var(--surface))`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5 text-xs" aria-label="Heatmap de win rate">
        <thead>
          <tr>
            <th />
            {cols.map((c) => <th key={c} scope="col" className="px-1 pb-1 font-medium text-ink-muted [writing-mode:vertical-rl] rotate-180">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r}>
              <th scope="row" className="sticky left-0 whitespace-nowrap bg-bg pr-2 text-right font-medium">{r}</th>
              {values[i].map((v, j) => (
                <td key={j} title={v === null ? "Sin datos" : `${r} vs ${cols[j]}: ${fmtPct(v)}`} className="h-8 w-9 rounded-sm text-center text-ink" style={{ background: v === null ? "transparent" : bg(v) }}>
                  {v === null ? "·" : Math.round(v * 100)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
