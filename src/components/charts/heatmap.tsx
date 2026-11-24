import Link from "next/link";
import { fmtPct } from "@/lib/format";

/**
 * Heatmap de win rate (0..1). Rosa por debajo de 50 %, verde por encima.
 * Sin JS en cliente. `values[fila][columna]`; null = sin datos (p. ej. el mismo héroe).
 * `cellHref` convierte cada celda con dato en un enlace; `selected` resalta una celda.
 */
export function Heatmap({ rows, cols, values, cellHref, selected, label = "Heatmap de win rate" }: {
  rows: string[];
  cols: string[];
  values: (number | null)[][];
  cellHref?: (row: number, col: number) => string;
  selected?: [number, number] | null;
  label?: string;
}) {
  const bg = (v: number) => {
    const t = Math.min(Math.abs(v - 0.5) / 0.1, 1) * 70; // satura a ±10 puntos
    return `color-mix(in srgb, var(${v >= 0.5 ? "--sage" : "--rose"}) ${t}%, var(--surface))`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5 text-xs" aria-label={label}>
        <thead>
          <tr>
            <th />
            {cols.map((c) => <th key={c} scope="col" className="px-1 pb-1 font-medium text-ink-muted [writing-mode:vertical-rl] rotate-180">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r}>
              <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-bg pr-2 text-right font-medium">{r}</th>
              {values[i].map((v, j) => {
                const isSel = selected?.[0] === i && selected?.[1] === j;
                const text = v === null ? "·" : Math.round(v * 100);
                return (
                  <td
                    key={j}
                    title={v === null ? "Sin datos" : `${r} vs ${cols[j]}: ${fmtPct(v)}`}
                    className={`h-8 w-9 rounded-sm text-center text-ink ${isSel ? "outline-2 outline-offset-1 outline-brass" : ""}`}
                    style={{ background: v === null ? "transparent" : bg(v) }}
                  >
                    {cellHref && v !== null ? <Link href={cellHref(i, j)} scroll={false} className="flex h-full w-full items-center justify-center" aria-label={`${r} contra ${cols[j]}: ${fmtPct(v)}`}>{text}</Link> : text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
