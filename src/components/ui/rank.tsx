/** Puesto en una lista: el primero con medalla de latón llena, los dos siguientes con aro, el resto en discreto. */
export function Rank({ n }: { n: number }) {
  return (
    <span aria-hidden className={`grid size-6 shrink-0 place-items-center rounded-full font-display text-xs font-black tabular-nums ${n === 1 ? "bg-brass text-night" : n <= 3 ? "border border-brass text-brass" : "text-ink-muted"}`}>{n}</span>
  );
}
