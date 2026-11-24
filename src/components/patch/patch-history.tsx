import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SectionTitle } from "@/components/ui/section-title";
import { loadPatchDiff } from "@/lib/patch-data";

const arrow = { buff: "▲", nerf: "▼", neutral: "◆" } as const;
const tone = { buff: "sage", nerf: "rose", neutral: "neutral" } as const;
const val = (v: unknown) => (v === undefined ? "—" : typeof v === "boolean" ? (v ? "sí" : "no") : String(typeof v === "number" ? Math.round(v * 100) / 100 : v));

/**
 * "Historial de cambios" de una ficha: qué números cambiaron en el último parche comparado (ver /patches/diff).
 * No pinta nada si la ficha no cambió. Solo servidor.
 */
export async function PatchHistory({ kind, id, name }: { kind: "heroes" | "items"; id: number; name: string }) {
  const res = await loadPatchDiff();
  if (!res.ok) return null;
  const diff = res.data[kind];
  const change = diff.changed.find((c) => c.id === id);
  const isNew = diff.added.some((a) => a.id === id);
  if (!change && !isNew) return null;

  return (
    <section id="history" aria-labelledby="history-t" className="scroll-mt-40 space-y-4">
      <SectionTitle id="history-t">Historial de cambios</SectionTitle>
      <Card className="space-y-3">
        <p className="text-sm text-ink-muted">
          {res.data.from && res.data.to ? `Versión ${res.data.from} → ${res.data.to}` : "Último parche"}

        </p>
        {isNew && <Chip tone="sage">Nuevo en este parche</Chip>}
        {change && (
          <ul className="space-y-1.5 text-sm">
            {change.changes.slice(0, 8).map((c) => (
              <li key={c.path} className="flex flex-wrap items-baseline gap-x-2">
                <span className="min-w-0 flex-1">{c.label}</span>
                <span className="tabular-nums text-ink-muted">{val(c.old)} → <span className="font-semibold text-ink">{val(c.new)}</span></span>
                <span className={`tabular-nums ${c.direction === "buff" ? "text-sage-ink" : c.direction === "nerf" ? "text-rose-ink" : "text-ink-muted"}`}>
                  <span aria-label={c.direction === "buff" ? "mejora" : c.direction === "nerf" ? "nerf" : "cambio"}>{arrow[c.direction]}</span>
                  {c.pct !== undefined && ` ${c.pct > 0 ? "+" : ""}${c.pct}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {change && change.changes.length > 8 && <p className="text-xs text-ink-muted">y {change.changes.length - 8} cambios más.</p>}
        <Link href={`/patches/diff?kind=${kind}&q=${encodeURIComponent(name)}`} className="inline-block text-sm font-semibold text-teal-ink underline-offset-2 hover:underline">Ver en el comparador de parches →</Link>
        {change && <Chip tone={tone[change.direction]}>{change.direction === "buff" ? "Mejora" : change.direction === "nerf" ? "Nerf" : "Cambios mixtos"}</Chip>}
      </Card>
    </section>
  );
}
