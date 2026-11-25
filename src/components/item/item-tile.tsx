import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { LazyItemTooltip } from "@/components/item/lazy-tooltip";
import { cn } from "@/lib/cn";
import { fmtNum, fmtPct } from "@/lib/format";
import type { Category, Item } from "@/lib/types";

/** Color de cada categoría (el del juego: Weapon naranja, Vitality verde, Spirit violeta). `--c` lo usan los estilos de las tarjetas. */
export const CAT_COLOR: Record<Category, { c: string; ink: string }> = {
  weapon: { c: "var(--apricot)", ink: "text-apricot-ink" },
  vitality: { c: "var(--sage)", ink: "text-sage-ink" },
  spirit: { c: "var(--lilac)", ink: "text-lilac-ink" },
};
export const catVar = (cat?: Category) => ({ "--c": cat ? CAT_COLOR[cat].c : "var(--brass)" }) as React.CSSProperties;

/** Icono de un objeto en un marco oscuro con el color de su categoría (los iconos son claros: sobre fondo oscuro se leen en ambos temas). */
export function ItemIcon({ item, size = 44, className }: { item: Item; size?: number; className?: string }) {
  return (
    <span
      style={{ ...catVar(item.item_slot_type), width: size, height: size }}
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-(--c)/70 bg-[color-mix(in_srgb,var(--c)_24%,#17120d)] shadow-[inset_0_0_14px_color-mix(in_srgb,var(--c)_35%,transparent)]", className)}
    >
      {item.image_webp ?? item.shop_image_webp ? (
        <Image src={(item.image_webp ?? item.shop_image_webp)!} alt="" width={size} height={size} unoptimized className="object-contain p-[12%]" style={{ width: size, height: size }} />
      ) : (
        <span aria-hidden className="font-display text-lg font-black text-cream">{item.name[0]}</span>
      )}
    </span>
  );
}

/** Marca del tier: cuatro rombos, tantos encendidos como el tier. */
export function TierPips({ tier, className }: { tier: number; className?: string }) {
  const t = useTranslations("heroes");
  return (
    <span role="img" aria-label={t("tierN", { tier })} className={cn("inline-flex gap-1", className)}>
      {[1, 2, 3, 4].map((n) => <span key={n} aria-hidden className={cn("size-1.5 rotate-45", n <= tier ? "bg-(--c)" : "bg-ink-muted/30")} />)}
    </span>
  );
}

/** Barra de win rate: 40 % a 60 %, con la marca del 50 % en medio. */
function RateBar({ rate }: { rate: number }) {
  const pos = Math.max(0, Math.min(1, (rate - 0.4) / 0.2)) * 100;
  return (
    <span aria-hidden className="relative mt-1 block h-1 w-14 rounded-full bg-ink-muted/20">
      <span className={cn("absolute inset-y-0 left-0 rounded-full", rate >= 0.5 ? "bg-sage" : "bg-rose")} style={{ width: `${pos}%` }} />
      <span className="absolute -inset-y-0.5 left-1/2 w-px bg-ink/50" />
    </span>
  );
}

/** Objeto de la tienda: icono, nombre, coste, win rate y tipo, con tooltip rico al pasar el ratón o con el teclado. */
export function ItemTile({ item, lang, usage }: { item: Item; lang: string; usage?: { winRate: number } }) {
  const th = useTranslations("heroUi");
  const cat = item.item_slot_type;
  return (
    <LazyItemTooltip id={`tip-${item.id}`} cls={item.class_name} lang={lang} fill>
      <Link
        href={`/items/${item.class_name}`}
        style={catVar(cat)}
        className="group/tile relative flex w-full items-center gap-3 overflow-hidden rounded-lg border border-(--c)/40 bg-linear-to-r from-[color-mix(in_srgb,var(--c)_16%,var(--surface))] to-surface p-2 pr-3 text-left shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-(--c) hover:shadow-pop"
      >
        <ItemIcon item={item} size={46} className="transition-transform duration-150 group-hover/tile:scale-105" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-tight">{item.name}</span>
          <span className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
            <span className="tabular-nums"><span aria-hidden className="text-(--c)">◆</span> {fmtNum(item.cost ?? 0)}</span>
            {item.is_active_item && <span className={cn("rounded-sm bg-(--c)/20 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide", cat && CAT_COLOR[cat].ink)}>Activa</span>}
          </span>
        </span>
        {usage && (
          <span className="shrink-0 text-right" title={th("winRate")}>
            <span className="block text-sm font-black tabular-nums">{fmtPct(usage.winRate)}</span>
            <RateBar rate={usage.winRate} />
          </span>
        )}
      </Link>
    </LazyItemTooltip>
  );
}
