import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { ItemTile } from "@/components/item/item-tile";
import { CATEGORY, Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { fmtNum } from "@/lib/format";
import { getItems } from "@/lib/lookup";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "Objetos", description: "La tienda de Deadlock: todos los objetos por categoría y tier." };

type Params = { q?: string; cat?: string; tier?: string; kind?: string; comp?: string };
const CATS: Category[] = ["weapon", "vitality", "spirit"];

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", cat = "", tier = "", kind = "", comp = "" } = await searchParams;
  const term = q.toLowerCase();
  const shop = (await getItems()).filter((i) => i.type === "upgrade" && i.shopable && i.item_slot_type && i.item_tier && i.item_tier <= 4);

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
            return (
              <section key={c} aria-label={CATEGORY[c].label} className="space-y-5">
                <h2 className="flex items-center gap-2 font-display text-2xl font-black">
                  {CATEGORY[c].label} <Chip tone={CATEGORY[c].tone}>{list.length}</Chip>
                </h2>
                {[1, 2, 3, 4].map((t) => {
                  const group = list.filter((i) => i.item_tier === t).sort((a, b) => a.name.localeCompare(b.name));
                  if (!group.length) return null;
                  return (
                    <div key={t} className="space-y-2">
                      <h3 className="border-b border-brass/40 pb-1 text-sm font-bold text-ink-muted">Tier {t} · {fmtNum(group[0].cost ?? 0)} almas</h3>
                      <div className={`grid gap-2 ${visibleCats.length === 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
                        {group.map((i) => <ItemTile key={i.id} item={i} />)}
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
