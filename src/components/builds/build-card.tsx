import Link from "next/link";
import { HeroPortrait } from "@/components/hero/hero-card";
import { ItemIcon } from "@/components/item/item-tile";
import { Chip } from "@/components/ui/chip";
import { categoryMix, isFresh, totalCost, type BuildEntry } from "@/lib/builds";
import { fmtNum, timeAgo } from "@/lib/format";
import type { Category, Item } from "@/lib/types";

const MIX_COLOR: Record<Category, string> = { weapon: "bg-apricot", vitality: "bg-sage", spirit: "bg-lilac" };
const ICONS = 8;

/** Tarjeta de una build en el buscador: héroe, favoritos, objetos con icono, reparto por categoría, etiquetas y autor. Enlaza al detalle. */
export function BuildCard({ build, heroId, heroName, authorName, tags, shop }: { build: BuildEntry; heroId: number; heroName: string; authorName?: string; tags: string[]; shop: Item[] }) {
  const h = build.hero_build;
  const mix = categoryMix(shop);
  const weekly = build.num_weekly_favorites ?? 0;
  return (
    <Link href={`/builds/${h.hero_id}/${h.hero_build_id}`} className="group flex h-full flex-col gap-3 rounded-md border border-brass/30 bg-surface p-4 shadow-card transition duration-150 hover:-translate-y-0.5 hover:border-brass hover:shadow-pop">
      <div className="flex items-start gap-3">
        <HeroPortrait hero={{ id: heroId, name: heroName }} small className="size-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-display text-lg font-black leading-tight">{h.name}</h3>
          <p className="truncate text-xs text-ink-muted">{heroName} · {authorName ?? `Autor #${h.author_account_id}`}</p>
        </div>
        <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-brass" title="Veces marcada como favorita">
          ★ {fmtNum(build.num_favorites ?? 0)}
          {weekly > 0 && <span className="block text-xs font-medium text-sage-ink" title="Favoritos de esta semana">▲ {fmtNum(weekly)}</span>}
        </span>
      </div>

      {shop.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-1">
            {shop.slice(0, ICONS).map((it) => <ItemIcon key={it.id} item={it} size={32} />)}
            {shop.length > ICONS && <span className="grid size-8 place-items-center rounded-md border border-brass/40 text-xs font-bold text-ink-muted">+{shop.length - ICONS}</span>}
          </div>
          {mix.total > 0 && (
            <span aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-ink-muted/20">
              {(Object.keys(MIX_COLOR) as Category[]).map((c) => <span key={c} className={MIX_COLOR[c]} style={{ width: `${mix.share[c] * 100}%` }} />)}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-ink-muted">Sin objetos de tienda.</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {isFresh(build) && <Chip tone="sage">Nueva</Chip>}
        {tags.map((t) => <Chip key={t}>{t}</Chip>)}
      </div>
      <p className="mt-auto text-xs text-ink-muted">
        {shop.length} objetos{totalCost(shop) > 0 && ` · ◆ ${fmtNum(totalCost(shop))}`} · v{h.version} · {timeAgo(h.last_updated_timestamp)}
      </p>
    </Link>
  );
}
