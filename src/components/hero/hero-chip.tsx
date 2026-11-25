import Link from "next/link";
import { HeroPortrait } from "@/components/hero/hero-card";
import { slugify } from "@/lib/slug";

/** Héroe en pequeño con un dato debajo (win rate, partidas…). Enlaza a su ficha. */
export function HeroChip({ id, name, note, tone, heroType, trend }: { id: number; name: string; note?: string; tone?: "good" | "bad"; heroType?: string; trend?: number | null }) {
  return (
    <Link href={`/heroes/${slugify(name)}`} className="flex items-center gap-2.5 rounded-md border border-brass/30 bg-surface p-1.5 pr-3 shadow-card transition-colors hover:bg-brass/10">
      <HeroPortrait hero={{ id, name, hero_type: heroType }} small className="h-10 w-10 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{name}</span>
        {note && <span className={`block text-xs tabular-nums ${tone === "good" ? "text-sage-ink" : tone === "bad" ? "text-rose-ink" : "text-ink-muted"}`}>{note}</span>}
      </span>
      {trend != null && Math.abs(trend) >= 0.1 && (
        <span title="Cambio del win rate en las últimas semanas (puntos)" className={`ml-auto shrink-0 text-xs font-semibold tabular-nums ${trend > 0 ? "text-sage-ink" : "text-rose-ink"}`}>
          {trend > 0 ? "▲ +" : "▼ −"}{Math.abs(trend).toFixed(1).replace(".", ",")}
        </span>
      )}
    </Link>
  );
}
