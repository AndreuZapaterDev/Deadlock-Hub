import Image from "next/image";
import { Card } from "@/components/ui/card";
import { stripHtml } from "@/lib/format";
import { abilityStats, abilityUpgrades } from "@/lib/item-sections";
import type { Item } from "@/lib/types";

/** Ficha de una habilidad: icono (con imágenes remotas), tipo, descripción, datos clave y las tres mejoras T1/T2/T3. */
export function AbilityCard({ ability, n, accent }: { ability: Item; n: number; accent?: string }) {
  const stats = abilityStats(ability);
  const ups = abilityUpgrades(ability);
  const icon = ability.image_webp;
  const ultimate = ability.ability_type === "ultimate";

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-poster font-display text-lg font-black text-cream"
          style={{ borderColor: accent ?? "var(--brass)" }}
        >
          {icon ? <Image src={icon} alt="" width={56} height={56} unoptimized className="size-full object-contain p-1.5" /> : <span aria-hidden>{n}</span>}
          {icon && <span aria-hidden className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-brass text-[11px] font-black text-night">{n}</span>}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-black leading-tight">{ability.name}</h3>
          <p className="text-xs text-ink-muted">{ultimate ? "Definitiva" : "Habilidad"}{ability.activation ? ` · ${ability.activation.replace(/^CITADEL_?/i, "").toLowerCase().replaceAll("_", " ")}` : ""}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed">{stripHtml(ability.description?.desc) || "Sin descripción."}</p>
      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {stats.slice(0, 6).map((s) => (
            <div key={s.label} className="rounded-sm bg-bg/40 px-2.5 py-1.5">
              <dt className="truncate text-[11px] text-ink-muted" title={s.label}>{s.label}</dt>
              <dd className="font-semibold tabular-nums">{s.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {ups.some((u) => u.length) && (
        <ol className="grid gap-2 border-t border-brass/30 pt-3 text-sm sm:grid-cols-3">
          {ups.map((u, t) => u.length > 0 && (
            <li key={t} className="rounded-sm border border-brass/25 p-2">
              <span className="mb-1 block text-xs font-black text-brass">Mejora T{t + 1}</span>
              <span className="text-[13px] leading-snug">{u.map((s) => `${s.label} ${s.text}`).join(" · ")}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
