"use client";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";

export type Column = { key: string; label: string; numeric?: boolean };
type Row = Record<string, string | number> & { id: string | number };

/**
 * Tabla ordenable y compacta. Primera columna fija con scroll horizontal (móvil).
 * Las filas llevan valores planos (serializables); el formato lo decide `format`.
 */
export function SortableTable({ columns, rows, initialSort, format }: { columns: Column[]; rows: Row[]; initialSort?: { key: string; dir: "asc" | "desc" }; format?: Record<string, "pct" | "num" | "dec" | "ago"> }) {
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: "asc" as const });
  const sorted = useMemo(() => {
    const k = sort.key;
    return [...rows].sort((a, b) => {
      const [x, y] = [a[k], b[k]];
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
      return sort.dir === "asc" ? c : -c;
    });
  }, [rows, sort]);

  const show = (key: string, v: string | number) =>
    typeof v === "number" && format?.[key] === "pct" ? new Intl.NumberFormat("es-ES", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)
    : typeof v === "number" && format?.[key] === "dec" ? new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v)
    : typeof v === "number" && format?.[key] === "ago" ? timeAgo(v)
    : typeof v === "number" ? new Intl.NumberFormat("es-ES").format(v) : v;

  return (
    <div className="overflow-x-auto rounded-md border border-brass/30">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-brass/10">
          <tr>
            {columns.map((c, i) => (
              <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("whitespace-nowrap px-3 py-2 font-semibold", c.numeric ? "text-right" : "text-left", i === 0 && "sticky left-0 z-10 bg-surface")}>
                <button type="button" onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key && s.dir === "desc" ? "asc" : "desc" }))} className="inline-flex items-center gap-1 hover:text-lilac-ink">
                  {c.label}
                  <span aria-hidden className="text-xs text-brass">{sort.key === c.key ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            // `layout`: al reordenar, cada fila se desliza a su nueva posición con un resorte
            <motion.tr layout transition={{ type: "spring", stiffness: 420, damping: 38 }} key={r.id} className="border-t border-brass/20 hover:bg-brass/5">
              {columns.map((c, i) => (
                <td key={c.key} className={cn("whitespace-nowrap px-3 py-1.5", c.numeric && "text-right", i === 0 && "sticky left-0 z-10 bg-surface font-medium")}>{show(c.key, r[c.key])}</td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
