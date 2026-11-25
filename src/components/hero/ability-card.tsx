import Image from "next/image";
import { useTranslations } from "next-intl";
import { stripHtml } from "@/lib/format";
import { abilityStats, abilityUpgrades } from "@/lib/item-sections";
import type { Item } from "@/lib/types";

/** Ficha de una habilidad: cabecera con el color del héroe, icono, descripción, datos clave y las tres mejoras T1/T2/T3. */
export function AbilityCard({ ability, n, accent }: { ability: Item; n: number; accent?: string }) {
  const t = useTranslations("heroUi");
  const stats = abilityStats(ability);
  const ups = abilityUpgrades(ability);
  const icon = ability.image_webp;
  const ultimate = ability.ability_type === "ultimate";
  const color = accent ?? "var(--brass)";

  return (
    <article style={{ "--a": color } as React.CSSProperties} className="overflow-hidden rounded-md border border-(--a)/40 bg-surface shadow-card">
      {/* Cabecera: velo del color del héroe, icono con aro y el número de la habilidad */}
      <header className="flex items-center gap-4 border-b border-(--a)/30 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--a)_22%,transparent),transparent_75%)] p-4">
        <span className="relative grid size-16 shrink-0 place-items-center rounded-full border-2 border-(--a) bg-poster font-display text-xl font-black text-cream shadow-card">
          {icon ? <Image src={icon} alt="" width={64} height={64} unoptimized className="size-full rounded-full object-contain p-2" /> : <span aria-hidden>{n}</span>}
          {icon && <span aria-hidden className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-brass text-xs font-black text-night ring-2 ring-surface">{n}</span>}
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-xl font-black leading-tight">{ability.name}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
            <span className={`rounded-sm px-1.5 py-0.5 font-bold ${ultimate ? "bg-accent text-on-accent" : "bg-brass/20 text-ink"}`}>{ultimate ? t("ultimate") : t("ability")}</span>
            {ability.activation && <span>{ability.activation.replace(/^CITADEL_?/i, "").toLowerCase().replaceAll("_", " ")}</span>}
          </p>
        </div>
      </header>
      <div className="space-y-4 p-4">
        <p className="text-sm leading-relaxed">{stripHtml(ability.description?.desc) || t("noDescription")}</p>
        {stats.length > 0 && (
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {stats.slice(0, 6).map((s) => (
              <div key={s.label} className="rounded-sm border-l-2 border-(--a) bg-bg/40 px-2.5 py-1.5">
                <dt className="truncate text-[11px] text-ink-muted" title={s.label}>{s.label}</dt>
                <dd className="font-display text-base font-black tabular-nums">{s.text}</dd>
              </div>
            ))}
          </dl>
        )}
        {ups.some((u) => u.length) && (
          <ol className="grid gap-2 border-t border-brass/30 pt-4 text-sm sm:grid-cols-3">
            {ups.map((u, tier) => u.length > 0 && (
              <li key={tier} className="rounded-sm border border-brass/25 bg-brass/[0.05] p-2.5">
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-brass">
                  <span aria-hidden className="grid size-5 place-items-center rounded-full bg-brass font-display text-[11px] text-night">{tier + 1}</span>
                  {t("upgradeT", { n: tier + 1 })}
                </span>
                <span className="text-[13px] leading-snug">{u.map((s) => `${s.label} ${s.text}`).join(" · ")}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}
