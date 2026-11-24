import { cn } from "@/lib/cn";
import type { Category } from "@/lib/types";

export const TONES = {
  neutral: "bg-brass/15 text-ink",
  sage: "bg-sage/25 text-sage-ink dark:bg-sage/12",
  apricot: "bg-apricot/25 text-apricot-ink dark:bg-apricot/12",
  lilac: "bg-lilac/25 text-lilac-ink dark:bg-lilac/12",
  rose: "bg-rose/25 text-rose-ink dark:bg-rose/12",
  teal: "bg-teal/25 text-teal-ink dark:bg-teal/12",
} as const;
export type Tone = keyof typeof TONES;

export function Chip({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}

// Categorías de objetos con la asociación del juego: Weapon naranja, Vitality verde, Spirit violeta.
export const CATEGORY: Record<Category, { tone: Tone; label: string }> = {
  weapon: { tone: "apricot", label: "Arma" },
  vitality: { tone: "sage", label: "Vitalidad" },
  spirit: { tone: "lilac", label: "Espíritu" },
};

export function CategoryChip({ category }: { category: Category }) {
  const c = CATEGORY[category];
  return <Chip tone={c.tone}>{c.label}</Chip>;
}
