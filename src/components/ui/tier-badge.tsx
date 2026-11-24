import type { Tier } from "@/lib/analytics";

// El color va solo en el borde (como la insignia de rango): la letra siempre es `ink` sobre `surface`, así el contraste no depende del tema.
const RING: Record<Tier, string> = {
  S: "border-brass", A: "border-sage", B: "border-teal", C: "border-apricot", D: "border-rose",
};

export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "size-16 text-3xl" : size === "sm" ? "size-8 text-sm" : "size-11 text-xl";
  return (
    <span role="img" aria-label={`Tier ${tier}`} className={`inline-grid shrink-0 place-items-center rounded-full border-4 bg-surface font-display font-black ${RING[tier]} ${sz}`}>
      {tier}
    </span>
  );
}
