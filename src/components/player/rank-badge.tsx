/** Insignia provisional de rango: círculo con el tier y el color que da la API, y 6 rombos con el subrango marcado. */
export function RankBadge({ tier, sub, name, color, size = "md" }: { tier: number; sub?: number; name: string; color: string; size?: "md" | "lg" }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center rounded-full border-4 bg-surface font-display font-black ${size === "lg" ? "size-16 text-2xl" : "size-12 text-lg"}`}
        style={{ borderColor: color }}
      >
        {tier}
      </span>
      <div>
        <p className="font-display text-lg font-black leading-tight">{name}</p>
        {sub !== undefined && (
          <div className="mt-1 flex items-center gap-1" role="img" aria-label={`Subrango ${sub} de 6`}>
            {Array.from({ length: 6 }, (_, i) => <span key={i} aria-hidden className={`size-1.5 rotate-45 ${i < sub ? "bg-brass" : "bg-brass/25"}`} />)}
          </div>
        )}
      </div>
    </div>
  );
}
