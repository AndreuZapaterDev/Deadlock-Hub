import Link from "next/link";
import { HeroPortrait } from "@/components/hero/hero-card";
import { slugify } from "@/lib/slug";

/** Héroe en pequeño con un dato debajo (win rate, partidas…). Enlaza a su ficha. */
export function HeroChip({ id, name, note, tone }: { id: number; name: string; note?: string; tone?: "good" | "bad" }) {
  return (
    <Link href={`/heroes/${slugify(name)}`} className="flex items-center gap-2.5 rounded-md border border-brass/30 bg-surface p-1.5 pr-3 shadow-card transition-colors hover:bg-brass/10">
      <HeroPortrait hero={{ id, name }} small className="h-10 w-10 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{name}</span>
        {note && <span className={`block text-xs tabular-nums ${tone === "good" ? "text-sage-ink" : tone === "bad" ? "text-rose-ink" : "text-ink-muted"}`}>{note}</span>}
      </span>
    </Link>
  );
}
