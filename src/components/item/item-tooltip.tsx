import { CategoryChip } from "@/components/ui/chip";
import { RichTooltip } from "@/components/ui/tooltip";
import { propText } from "@/lib/item-sections";
import { fmtNum, stripHtml } from "@/lib/format";
import type { Item } from "@/lib/types";

/** Estadísticas legibles de un objeto: solo propiedades con etiqueta y valor distinto de 0. */
function stats(item: Item) {
  return Object.values(item.properties ?? {})
    .filter((p) => p.label && !p.label.startsWith("#") && p.value !== undefined && parseFloat(String(p.value)) !== 0)
    .slice(0, 5)
    .map((p) => `${p.label}: ${propText(p)}`);
}

export function ItemTooltipContent({ item }: { item: Item }) {
  const desc = stripHtml(item.description?.desc);
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-serif text-base font-semibold leading-tight">{item.name}</p>
        {item.cost !== undefined && <span className="whitespace-nowrap text-sm font-semibold text-apricot-ink">{fmtNum(item.cost)} almas</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        {item.item_slot_type && <CategoryChip category={item.item_slot_type} />}
        {item.item_tier && <span>Tier {item.item_tier}</span>}
        <span>{item.is_active_item ? "Activo" : "Pasivo"}</span>
      </div>
      {desc && <p className="text-xs leading-relaxed">{desc.length > 220 ? `${desc.slice(0, 220)}…` : desc}</p>}
      {stats(item).length > 0 && (
        <ul className="space-y-0.5 border-t border-brass/30 pt-2 text-xs">
          {stats(item).map((s) => <li key={s}>{s}</li>)}
        </ul>
      )}
      {item.component_items && item.component_items.length > 0 && <p className="text-xs text-ink-muted">Se construye con: {item.component_items.length} componente(s)</p>}
    </div>
  );
}

export function ItemTooltip({ item }: { item: Item }) {
  return (
    <RichTooltip id={`tip-${item.id}`} content={<ItemTooltipContent item={item} />}>
      <span className="inline-flex items-center gap-2 rounded-sm border border-brass/40 bg-surface px-3 py-1.5 text-sm font-medium">
        {item.name}
      </span>
    </RichTooltip>
  );
}
