import Image from "next/image";
import Link from "next/link";
import { SectionTitle } from "@/components/ui/section-title";
import { fmtPct } from "@/lib/format";
import { getItemIndex } from "@/lib/lookup";
import type { Hero, PopularItem } from "@/lib/types";

const PHASES = [
  ["early_game", "Inicio de la partida"],
  ["mid_game", "Mitad de la partida"],
  ["late_game", "Final de la partida"],
] as const;

/** Objetos más comprados por este héroe en cada fase, con su porcentaje de uso y su win rate (datos de la propia ficha del héroe). */
export async function PopularItems({ hero }: { hero: Hero }) {
  const pop = hero.popular_items;
  const phases = PHASES.map(([key, label]) => ({ label, items: (pop?.[key] ?? []).slice(0, 6) })).filter((p) => p.items.length > 0);
  if (phases.length === 0) return null;
  const { byClass } = await getItemIndex();

  const row = (p: PopularItem) => {
    const item = byClass.get(p.class_name);
    const name = item?.name ?? p.class_name.replace(/^upgrade_/, "").replaceAll("_", " ");
    const content = (
      <>
        {item?.image_webp ? <Image src={item.image_webp} alt="" width={28} height={28} unoptimized className="size-7 shrink-0 object-contain" /> : <span aria-hidden className="size-7 shrink-0 rounded-sm bg-brass/20" />}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="text-xs tabular-nums text-ink-muted" title="Porcentaje de partidas en las que se compra">{p.pick_pct.toFixed(1)} %</span>
        <span className={`w-14 text-right text-xs font-semibold tabular-nums ${p.winrate_pct >= 50 ? "text-sage-ink" : "text-rose-ink"}`} title="Win rate con este objeto">{fmtPct(p.winrate_pct / 100)}</span>
      </>
    );
    return (
      <li key={p.item_id}>
        {item ? <Link href={`/items/${item.class_name}`} className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-brass/10">{content}</Link> : <div className="flex items-center gap-2 px-2 py-1.5 text-sm">{content}</div>}
      </li>
    );
  };

  return (
    <section aria-labelledby="items" className="scroll-mt-40 space-y-4">
      <SectionTitle id="items">Objetos más comprados</SectionTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        {phases.map((ph) => (
          <div key={ph.label} className="rounded-md border border-brass/30 bg-surface p-3 shadow-card">
            <h3 className="mb-1 flex items-baseline justify-between px-2 font-display text-base font-black uppercase">
              {ph.label}
              <span className="text-[10px] font-normal normal-case tracking-normal text-ink-muted">uso · win rate</span>
            </h3>
            <ul>{ph.items.map(row)}</ul>
          </div>
        ))}
      </div>
    </section>
  );
}
