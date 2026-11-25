/** Recuadro con una cifra grande y su etiqueta (partidas, jugadores, win rate…). Franja de latón arriba y degradado cálido. */
export function Stat({ value, label, hint, children }: { value: string; label: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-md border border-brass/30 bg-surface bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--brass)_16%,transparent),transparent_65%)] px-3 pb-4 pt-5 text-center shadow-card">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-brass" />
      <p className="font-display text-3xl font-black tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-1.5 text-sm text-ink-muted">{label}</p>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      {children}
    </div>
  );
}
