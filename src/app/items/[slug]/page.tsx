import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FeaturedCard } from "@/components/ui/card";
import { CATEGORY, CategoryChip, Chip } from "@/components/ui/chip";
import { PosterHeader } from "@/components/ui/poster-header";
import { fmtNum, stripHtml } from "@/lib/format";
import { itemSections, plainStats } from "@/lib/item-sections";
import { SECTION_LABEL } from "@/lib/labels";
import { getItemIndex, getItems } from "@/lib/lookup";
import type { Item } from "@/lib/types";

export const revalidate = 43200;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getItems()).filter((i) => i.type === "upgrade").map((i) => ({ slug: i.class_name }));
}

async function find(slug: string) {
  const { byClass } = await getItemIndex();
  const item = byClass.get(slug);
  return item?.type === "upgrade" ? item : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = await find((await params).slug);
  return item ? { title: item.name, description: stripHtml(item.description?.desc).slice(0, 160) } : {};
}

function ItemLink({ item }: { item: Item }) {
  return (
    <Link href={`/items/${item.class_name}`} className="flex items-center justify-between gap-3 rounded-sm border border-brass/30 bg-surface px-3 py-2 text-sm transition-colors hover:bg-brass/10">
      <span className="font-semibold">{item.name}</span>
      <span className="text-xs text-ink-muted">{fmtNum(item.cost ?? 0)} almas</span>
    </Link>
  );
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const item = await find(slug);
  if (!item) notFound();

  const { byClass, usedBy } = await getItemIndex();
  const parts = (item.component_items ?? []).map((c) => byClass.get(c)).filter((i): i is Item => !!i);
  const upgradesTo = (usedBy.get(item.class_name) ?? []).filter((i) => i.type === "upgrade");
  const sections = itemSections(item);
  const fallback = sections.length ? [] : plainStats(item);
  const desc = stripHtml(item.description?.desc);
  const cat = item.item_slot_type;

  return (
    <div className="space-y-12">
      <PosterHeader title={item.name} subtitle={desc ? undefined : "Objeto de la tienda"}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {cat && <CategoryChip category={cat} />}
          {item.item_tier && <Chip>Tier {item.item_tier}</Chip>}
          <Chip>{item.is_active_item ? "Activo" : "Pasivo"}</Chip>
          {item.cost !== undefined && <Chip tone={cat ? CATEGORY[cat].tone : "neutral"}>{fmtNum(item.cost)} almas</Chip>}
          {!item.shopable && <Chip tone="rose">No disponible en la tienda</Chip>}
        </div>
      </PosterHeader>

      <section aria-label="Descripción" className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <FeaturedCard>
          {desc && <p className="max-w-prose text-base leading-relaxed">{desc}</p>}
          {sections.map((s) => (
            <div key={s.type} className="mt-4 space-y-2 border-t border-brass/30 pt-3 first:mt-0 first:border-0 first:pt-0">
              <h3 className="font-display text-lg font-black">{SECTION_LABEL[s.type] ?? s.type}</h3>
              {s.text && s.text !== desc && <p className="text-sm leading-relaxed">{s.text}</p>}
              {s.stats.length > 0 && (
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {s.stats.map((st) => (
                    <div key={st.label} className="flex justify-between gap-3 border-b border-brass/15 py-1">
                      <dt className="text-ink-muted">{st.label}</dt>
                      <dd className="font-semibold tabular-nums">{st.text}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ))}
          {fallback.length > 0 && (
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {fallback.map((st) => (
                <div key={st.label} className="flex justify-between gap-3 border-b border-brass/15 py-1">
                  <dt className="text-ink-muted">{st.label}</dt>
                  <dd className="font-semibold tabular-nums">{st.text}</dd>
                </div>
              ))}
            </dl>
          )}
          {!desc && !sections.length && !fallback.length && <p className="text-ink-muted">Este objeto no tiene descripción publicada.</p>}
          <p className="mt-4 text-xs text-ink-muted">Textos del juego en inglés (datos de ejemplo del modo demo).</p>
        </FeaturedCard>

        <div className="space-y-6">
          <section aria-labelledby="parts" className="space-y-2">
            <h2 id="parts" className="font-display text-lg font-black">Se construye con</h2>
            {parts.length ? parts.map((p) => <ItemLink key={p.id} item={p} />) : <p className="text-sm text-ink-muted">Es un objeto base: no tiene componentes.</p>}
          </section>
          <section aria-labelledby="into" className="space-y-2">
            <h2 id="into" className="font-display text-lg font-black">Se mejora en</h2>
            {upgradesTo.length ? upgradesTo.map((p) => <ItemLink key={p.id} item={p} />) : <p className="text-sm text-ink-muted">No forma parte de ningún otro objeto.</p>}
          </section>
        </div>
      </section>


      <div className="flex justify-center"><Button href="/items" variant="secondary">Volver a la tienda</Button></div>
    </div>
  );
}
