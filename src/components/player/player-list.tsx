import Link from "next/link";
import { fmtNum, fmtPct } from "@/lib/format";
import type { Relation } from "@/lib/types";

/** Lista de compañeros o rivales: nombre (o #id si no se conoce), partidas y win rate con barra. Cada fila enlaza al perfil. */
export function PlayerList({ rows, names, empty }: { rows: Relation[]; names: Map<number, string>; empty: string }) {
  if (!rows.length) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-brass/20 rounded-md border border-brass/30 bg-surface">
      {rows.map((r) => {
        const rate = r.matches ? r.wins / r.matches : 0;
        return (
          <li key={r.id}>
            <Link href={`/players/${r.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3 py-2 transition-colors hover:bg-brass/10 sm:grid-cols-[1fr_6rem_8rem]">
              <span className="min-w-0 truncate font-semibold">{names.get(r.id) ?? `#${r.id}`}</span>
              <span className="text-right text-sm tabular-nums text-ink-muted">{fmtNum(r.matches)} partidas</span>
              <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-brass/20" role="img" aria-label={`Win rate ${fmtPct(rate)}`}>
                  <span className={`block h-full ${rate >= 0.5 ? "bg-sage" : "bg-rose"}`} style={{ width: `${Math.round(rate * 100)}%` }} />
                </span>
                <span className="w-12 text-right text-sm font-semibold tabular-nums">{fmtPct(rate, 0)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
