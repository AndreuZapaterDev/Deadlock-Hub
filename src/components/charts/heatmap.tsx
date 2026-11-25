import { useTranslations } from "next-intl";
import { DelegatedLinks } from "@/components/charts/heatmap-links";
import { fmtPct } from "@/lib/format";

/**
 * Heatmap de win rate (0..1). Rosa por debajo de 50 %, verde por encima.
 * `values[fila][columna]`; null = sin datos (p. ej. el mismo héroe). `cellHref` convierte cada celda con dato en un enlace;
 * `selected` resalta una celda.
 *
 * Es la página con más DOM de la web (44×44 celdas), así que cada celda cuesta lo mínimo: UN nodo (cuadrícula CSS `role="grid"` en
 * vez de `<table>` con `<td>` + `<a>`), una clase de color prefabricada en globals.css (`hm-t0`…`hm-t14`, sin `style` por celda), un
 * `<a>` normal en vez de `<Link>` (que se hidrata uno a uno) y la navegación sin recarga en un único manejador (`DelegatedLinks`).
 * No hay `title`: el nombre accesible va en `aria-label`.
 */
export function Heatmap({ rows, cols, values, cellHref, selected, label }: {
  rows: string[];
  cols: string[];
  values: (number | null)[][];
  cellHref?: (row: number, col: number) => string;
  selected?: [number, number] | null;
  label?: string;
}) {
  const t = useTranslations("counters");
  const level = (v: number) => Math.round((Math.min(Math.abs(v - 0.5) / 0.1, 1) * 70) / 5); // 0..14: satura a ±10 puntos
  return (
    <div className="overflow-x-auto">
      <DelegatedLinks>
        <div role="grid" aria-label={label ?? t("heatmapLabel")} className="hm-grid text-xs" style={{ "--cols": cols.length } as React.CSSProperties}>
          <div role="row" className="contents">
            <div role="presentation" />
            {cols.map((c) => <div key={c} role="columnheader" className="px-1 pb-1 font-medium text-ink-muted [writing-mode:vertical-rl] rotate-180">{c}</div>)}
          </div>
          {rows.map((r, i) => (
            <div key={r} role="row" className="contents">
              <div role="rowheader" className="sticky left-0 z-10 whitespace-nowrap bg-bg pr-2 text-right font-medium leading-8">{r}</div>
              {values[i].map((v, j) => {
                if (v === null) return <div key={j} role="gridcell" className="hm-empty">·</div>;
                const cls = `hm-cell ${v >= 0.5 ? "hm-pos" : "hm-neg"} hm-t${level(v)}${selected?.[0] === i && selected?.[1] === j ? " hm-sel" : ""}`;
                const aria = t("cellAria", { row: r, col: cols[j], rate: fmtPct(v) });
                const text = Math.round(v * 100);
                return cellHref ? (
                  <a key={j} role="gridcell" data-nav href={cellHref(i, j)} className={cls} aria-label={aria}>{text}</a>
                ) : (
                  <div key={j} role="gridcell" className={cls} aria-label={aria}>{text}</div>
                );
              })}
            </div>
          ))}
        </div>
      </DelegatedLinks>
    </div>
  );
}
