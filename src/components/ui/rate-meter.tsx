import { cn } from "@/lib/cn";

/** Barra de win rate: escala de 40 % a 60 % con la marca del 50 % en medio. Verde si gana más de lo que pierde, rojo si no. Decorativa (el valor va en texto al lado). */
export function RateMeter({ rate, className }: { rate: number; className?: string }) {
  const pos = Math.max(0, Math.min(1, (rate - 0.4) / 0.2)) * 100;
  return (
    <span aria-hidden className={cn("relative block h-1.5 w-full rounded-full bg-ink-muted/20", className)}>
      <span className={cn("absolute inset-y-0 left-0 rounded-full", rate >= 0.5 ? "bg-sage" : "bg-rose")} style={{ width: `${pos}%` }} />
      <span className="absolute -inset-y-0.5 left-1/2 w-px bg-ink/50" />
    </span>
  );
}
