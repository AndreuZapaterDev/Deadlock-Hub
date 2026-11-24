import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { getHeroes, getItems } from "@/lib/lookup";
import { loadPatchDiff, loadVersions } from "@/lib/patch-data";
import type { AssetDiff, Direction, EntityChange, FieldChange, Scalar } from "@/lib/patch-diff";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = { title: "Cambios entre parches", description: "Qué números han cambiado entre dos versiones de Deadlock, calculado automáticamente sobre héroes y objetos." };
export const revalidate = 3600;

type SP = { from?: string; to?: string; kind?: string; dir?: string; q?: string };

const DIR: Record<Direction, { tone: "sage" | "rose" | "neutral"; arrow: string; word: string }> = {
  buff: { tone: "sage", arrow: "▲", word: "mejora" },
  nerf: { tone: "rose", arrow: "▼", word: "nerf" },
  neutral: { tone: "neutral", arrow: "◆", word: "cambio" },
};

const show = (v: Scalar | undefined) => (v === undefined ? "—" : typeof v === "boolean" ? (v ? "sí" : "no") : typeof v === "number" ? String(Math.round(v * 100) / 100) : v);

function Change({ c }: { c: FieldChange }) {
  const d = DIR[c.direction];
  const color = c.direction === "buff" ? "text-sage-ink" : c.direction === "nerf" ? "text-rose-ink" : "text-ink-muted";
  return (
    <tr className="border-t border-brass/15">
      <th scope="row" className="py-1.5 pr-3 text-left font-normal">{c.label}</th>
      <td className="py-1.5 pr-3 text-right tabular-nums text-ink-muted">{show(c.old)}</td>
      <td aria-hidden className="py-1.5 pr-3 text-center text-ink-muted">→</td>
      <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{show(c.new)}</td>
      <td className={`py-1.5 text-right tabular-nums ${color}`}>
        <span aria-label={d.word}>{d.arrow}</span>
        {c.pct !== undefined && ` ${c.pct > 0 ? "+" : ""}${c.pct}%`}
      </td>
    </tr>
  );
}

function EntityCard({ e, href }: { e: EntityChange; href?: string }) {
  const d = DIR[e.direction];
  return (
    <Card className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 font-display text-lg font-black leading-tight">{href ? <Link href={href} className="hover:text-brass">{e.name}</Link> : e.name}</h3>
        <Chip tone={d.tone}>{d.arrow} {e.direction === "neutral" ? "Mixto" : d.word}</Chip>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Cambios de {e.name}</caption>
          <tbody>{e.changes.map((c) => <Change key={c.path} c={c} />)}</tbody>
        </table>
      </div>
    </Card>
  );
}

function names(list: { name: string }[]) {
  return list.map((x) => x.name).join(", ");
}

function Section({ title, diff, hrefs, filter }: { title: string; diff: AssetDiff; hrefs: Map<number | string, string>; filter: (e: EntityChange) => boolean }) {
  const changed = diff.changed.filter(filter);
  return (
    <section className="space-y-4" aria-label={title}>
      <SectionTitle>{title}</SectionTitle>
      {changed.length === 0 && diff.added.length === 0 && diff.removed.length === 0 ? (
        <EmptyState title="Sin cambios con estos filtros" />
      ) : (
        <>
          {diff.added.length > 0 && <p className="text-sm"><Chip tone="sage">Nuevos</Chip> <span className="ml-1">{names(diff.added)}</span></p>}
          {diff.removed.length > 0 && <p className="text-sm"><Chip tone="rose">Eliminados</Chip> <span className="ml-1">{names(diff.removed)}</span></p>}
          <div className="grid gap-4 lg:grid-cols-2">{changed.map((e) => <EntityCard key={e.id} e={e} href={hrefs.get(e.id)} />)}</div>
        </>
      )}
    </section>
  );
}

export default async function PatchDiffPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [versions, heroes, items] = await Promise.all([loadVersions(), getHeroes(), getItems()]);
  const from = Number(sp.from) || undefined;
  const to = Number(sp.to) || undefined;
  const res = await loadPatchDiff(from, to);

  const q = (sp.q ?? "").trim().toLowerCase();
  const filter = (e: EntityChange) =>
    (!q || e.name.toLowerCase().includes(q)) && (sp.dir === "buff" ? e.direction === "buff" : sp.dir === "nerf" ? e.direction === "nerf" : true);

  const heroHref = new Map<number | string, string>(heroes.map((h) => [h.id, `/heroes/${slugify(h.name)}`]));
  const itemHref = new Map<number | string, string>(items.map((i) => [i.id, `/items/${i.class_name}`]));
  const opts = versions.slice(0, 60).map((v) => ({ value: String(v.version), label: `${v.version} · ${v.date.slice(0, 10)}` }));

  return (
    <div className="space-y-8">
      <PosterHeader compact title="Cambios entre parches" subtitle="Qué números han cambiado, sin depender de las notas oficiales" />
      <Suspense>
        <FilterBar
          fields={[
            { name: "from", label: "Desde la versión", type: "select", allLabel: "Anterior", options: opts },
            { name: "to", label: "Hasta la versión", type: "select", allLabel: "Última", options: opts },
            { name: "kind", label: "Mostrar", type: "select", allLabel: "Héroes y objetos", options: [{ value: "heroes", label: "Solo héroes" }, { value: "items", label: "Solo objetos" }] },
            { name: "dir", label: "Tipo de cambio", type: "select", allLabel: "Todos", options: [{ value: "buff", label: "Solo mejoras" }, { value: "nerf", label: "Solo nerfs" }] },
            { name: "q", label: "Buscar", type: "search", placeholder: "Héroe u objeto…" },
          ]}
        />
      </Suspense>
      {!res.ok ? (
        <ErrorState title="No se han podido comparar las versiones" hint="Puede que la API no tenga los datos de esa versión o que esté ocupada." />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Héroes con cambios", res.data.heroes.changed.length],
              ["Objetos con cambios", res.data.items.changed.length],
              ["Objetos nuevos", res.data.items.added.length],
              ["Objetos eliminados", res.data.items.removed.length],
            ].map(([label, n]) => (
              <Card key={label as string}>
                <dd className="font-display text-3xl font-black tabular-nums">{n}</dd>
                <dt className="text-xs italic text-ink-muted">{label}</dt>
              </Card>
            ))}
          </dl>
          {res.data.from && res.data.to && <p className="text-sm text-ink-muted">Versión {res.data.from} → {res.data.to}{res.data.widened && " · la versión anterior no cambiaba nada, así que se compara con la previa al último gran día"}</p>}
          {sp.kind !== "items" && <Section title="Héroes" diff={res.data.heroes} hrefs={heroHref} filter={filter} />}
          {sp.kind !== "heroes" && <Section title="Objetos" diff={res.data.items} hrefs={itemHref} filter={filter} />}
        </>
      )}
    </div>
  );
}
