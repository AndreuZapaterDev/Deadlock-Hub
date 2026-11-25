import { CategoryChip } from "@/components/ui/chip";
import { RichTooltip } from "@/components/ui/tooltip";
import { propText } from "@/lib/item-sections";
import { fmtNum, stripHtml } from "@/lib/format";
import type { Category, Item } from "@/lib/types";

/** Datos mínimos que necesita el tooltip de un objeto (pequeños y serializables: viajan por JSON al pasar el ratón). */
export type TooltipData = {
  name: string;
  cost?: number;
  category?: Category;
  tier?: number;
  active: boolean;
  desc?: string;
  stats: string[];
  components: number;
};

/** Estadísticas legibles de un objeto: solo propiedades con etiqueta y valor distinto de 0. */
function stats(item: Item) {
  return Object.values(item.properties ?? {})
    .filter((p) => p.label && !p.label.startsWith("#") && p.value !== undefined && parseFloat(String(p.value)) !== 0)
    .slice(0, 5)
    .map((p) => `${p.label}: ${propText(p)}`);
}

export function tooltipData(item: Item): TooltipData {
  const desc = stripHtml(item.description?.desc);
  return {
    name: item.name,
    cost: item.cost,
    category: item.item_slot_type,
    tier: item.item_tier,
    active: !!item.is_active_item,
    desc: desc ? (desc.length > 220 ? `${desc.slice(0, 220)}…` : desc) : undefined,
    stats: stats(item),
    components: item.component_items?.length ?? 0,
  };
}

/** Contenido del tooltip. Sin estado ni imports de servidor: lo usan tanto los Server Components como el tooltip que se carga bajo demanda. */
export function ItemTooltipView({ data }: { data: TooltipData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-serif text-base font-semibold leading-tight">{data.name}</p>
        {data.cost !== undefined && <span className="whitespace-nowrap text-sm font-semibold text-apricot-ink">{fmtNum(data.cost)} almas</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        {data.category && <CategoryChip category={data.category} />}
        {data.tier && <span>Tier {data.tier}</span>}
        <span>{data.active ? "Activa" : "Pasivo"}</span>
      </div>
      {data.desc && <p className="text-xs leading-relaxed">{data.desc}</p>}
      {data.stats.length > 0 && (
        <ul className="space-y-0.5 border-t border-brass/30 pt-2 text-xs">
          {data.stats.map((s) => <li key={s}>{s}</li>)}
        </ul>
      )}
      {data.components > 0 && <p className="text-xs text-ink-muted">Se construye con: {data.components} componente(s)</p>}
    </div>
  );
}

export function ItemTooltipContent({ item }: { item: Item }) {
  return <ItemTooltipView data={tooltipData(item)} />;
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
