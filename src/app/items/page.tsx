import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { catVar, ItemTile, TierPips } from "@/components/item/item-tile";
import { CATEGORY, Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { fmtNum, fmtPct } from "@/lib/format";
import { getLanguage } from "@/lib/language";
import { groupWinRate, usageMap } from "@/lib/item-meta";
import { getItems } from "@/lib/lookup";
import { loadItemStats } from "@/lib/meta-data";
import type { Category, Item } from "@/lib/types";

export const metadata: Metadata = { title: "Objetos", description: "La tienda de Deadlock: todos los objetos por categoría y tier." };

type Params = { q?: string; cat?: string; tier?: string; kind?: string; comp?: string; sort?: string };
const CATS: Category[] = ["weapon", "vitality", "spirit"];

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", cat = "", tier = "", kind = "", comp = "", sort = "" } = await searchParams;
  const term = q.toLowerCase();
  const lang = await getLanguage();
  const [allItems, statsRes] = await Promise.all([getItems(), loadItemStats({})]);
  const usage = statsRes.ok ? usageMap(statsRes.data) : new Map<number, { winRate: number; matches: number }>();
  const order = (a: Item, b: Item) => {
    const by = sort === "winrate" ? (usage.get(b.id)?.winRate ?? -1) - (usage.get(a.id)?.winRate ?? -1) : sort === "matches" ? (usage.get(b.id)?.matches ?? -1) - (usage.get(a.id)?.matches ?? -1) : 0;
    return by || a.name.localeCompare(b.name);
  };
  const shop = allItems.filter((i) => i.type === "upgrade" && i.shopable && i.item_slot_type && i.item_tier && i.item_tier <= 4);

  const items = shop.filter(
    (i) =>
      (!cat || i.item_slot_type === cat) &&
      (!tier || String(i.item_tier) === tier) &&
      (!kind || (kind === "active" ? i.is_active_item : !i.is_active_item)) &&
      (!comp || (comp === "yes" ? !!i.component_items?.length : !i.component_items?.length)) &&
      (!term || i.name.toLowerCase().includes(term)),
  );
  const visibleCats = CATS.filter((c) => !cat || c === cat);

  return (
    <div className="space-y-8">
      <PosterHeader title="Objetos" subtitle={`${shop.length} objetos en la tienda, en tres categorías`} />
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            { name: "q", label: "Buscar", type: "search", placeholder: "Nombre del objeto" },
            { name: "cat", label: "Categoría", type: "select", options: CATS.map((c) => ({ value: c, label: CATEGORY[c].label })) },
            { name: "tier", label: "Tier", type: "select", options: [1, 2, 3, 4].map((t) => ({ value: String(t), label: `Tier ${t}` })) },
            { name: "kind", label: "Tipo", type: "select", options: [{ value: "active", label: "Activo" }, { value: "passive", label: "Pasivo" }] },
            { name: "comp", label: "Componentes", type: "select", options: [{ value: "yes", label: "Con componentes" }, { value: "no", label: "Sin componentes" }] },
            ...(usage.size ? [{ name: "sort", label: "Ordenar por", type: "select" as const, allLabel: "Nombre (A–Z)", options: [{ value: "winrate", label: "Win rate" }, { value: "matches", label: "Más usados" }] }] : []),
          ]}
        />
      </Suspense>
      <p className="text-sm text-ink-muted" aria-live="polite">{items.length} {items.length === 1 ? "objeto" : "objetos"}</p>

      {items.length === 0 ? (
        <EmptyState title="Ningún objeto coincide" hint="Prueba con otra búsqueda o quita algún filtro." />
      ) : (
        <div className={`grid gap-6 ${visibleCats.length === 1 ? "" : "lg:grid-cols-3"}`}>
          {visibleCats.map((c) => {
            const list = items.filter((i) => i.item_slot_type === c);
            const avg = groupWinRate(usage, list.map((i) => i.id));
            return (
              <section key={c} aria-label={CATEGORY[c].label} style={catVar(c)} className="space-y-5 rounded-xl border border-(--c)/30 border-t-4 border-t-(--c) bg-panel/60 p-3 pt-4 sm:p-4">
                <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span aria-hidden className="size-3 rotate-45 bg-(--c)" />
                  <span className="font-display text-2xl font-black">{CATEGORY[c].label}</span>
                  <Chip tone={CATEGORY[c].tone}>{list.length}</Chip>
                  {avg !== null && <span className="ml-auto text-xs text-ink-muted">Win rate medio <strong className="text-ink tabular-nums">{fmtPct(avg)}</strong></span>}
                </h2>
                {[1, 2, 3, 4].map((t) => {
                  const group = list.filter((i) => i.item_tier === t).sort(order);
                  if (!group.length) return null;
                  return (
                    <div key={t} className="space-y-2">
                      <h3 className="flex items-center gap-2 border-b border-(--c)/30 pb-1.5 text-sm font-bold">
                        <TierPips tier={t} />
                        <span>Tier {t}</span>
                        <span className="ml-auto font-normal tabular-nums text-ink-muted"><span aria-hidden className="text-(--c)">◆</span> {fmtNum(group[0].cost ?? 0)} almas</span>
                      </h3>
                      <div className={`grid grid-cols-[minmax(0,1fr)] gap-2 ${visibleCats.length === 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
                        {group.map((i) => <ItemTile key={i.id} item={i} lang={lang} usage={usage.get(i.id)} />)}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
