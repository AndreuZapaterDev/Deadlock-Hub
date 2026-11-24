import Link from "next/link";
import { ItemTooltipContent } from "@/components/item/item-tooltip";
import { CATEGORY, Chip } from "@/components/ui/chip";
import { RichTooltip } from "@/components/ui/tooltip";
import { fmtNum } from "@/lib/format";
import type { Item } from "@/lib/types";

const BAR = { weapon: "bg-apricot", vitality: "bg-sage", spirit: "bg-lilac" } as const;

/** Objeto de la tienda: nombre, coste y tipo, con tooltip rico al pasar el ratón o con el teclado. */
export function ItemTile({ item }: { item: Item }) {
  const cat = item.item_slot_type;
  return (
    <RichTooltip id={`tip-${item.id}`} content={<ItemTooltipContent item={item} />} focusable={false} fill>
      <Link href={`/items/${item.class_name}`} className="flex w-full items-center gap-3 rounded-md border border-brass/30 bg-surface py-2 pl-0 pr-3 text-left shadow-card transition-colors hover:bg-brass/10">
        <span aria-hidden className={`h-9 w-1.5 rounded-r-full ${cat ? BAR[cat] : "bg-brass"}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{item.name}</span>
          <span className="block text-xs text-ink-muted">{fmtNum(item.cost ?? 0)} almas</span>
        </span>
        {item.is_active_item && <Chip tone={cat ? CATEGORY[cat].tone : "neutral"}>Activo</Chip>}
      </Link>
    </RichTooltip>
  );
}
