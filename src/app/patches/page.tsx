import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroPortrait } from "@/components/hero/hero-card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { getHeroes } from "@/lib/lookup";
import { loadBigDays } from "@/lib/meta-data";
import { loadPatches } from "@/lib/patch-data";
import { effectiveDate, excerpt, groupByMonth, isBigDay, mentionedNames, readingMinutes } from "@/lib/patches";

export const metadata: Metadata = { title: "Parches", description: "Notas de parche de Deadlock: changelog del foro y noticias de Steam, con los grandes días marcados." };
export const revalidate = 3600;

const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
const dayOnly = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
const monthTitle = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
const MAX_FACES = 6;

type Sp = { source?: string; big?: string; q?: string };

export default async function PatchesPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const [res, bigDays, heroes] = await Promise.all([loadPatches(), loadBigDays(), getHeroes()]);
  const q = (sp.q ?? "").trim().toLowerCase();

  const all = res.ok ? res.data : [];
  const enriched = all.map((p) => {
    const text = excerpt(p.html, Number.POSITIVE_INFINITY);
    return { p, text, big: isBigDay(p, bigDays), day: effectiveDate(p) };
  });
  const shown = enriched.filter((e) => (!sp.source || e.p.source === sp.source) && (sp.big !== "1" || e.big) && (!q || e.p.title.toLowerCase().includes(q) || e.text.toLowerCase().includes(q)));
  const groups = groupByMonth(shown.map((e) => ({ ...e, title: e.p.title, date: e.p.date })));
  const bigCount = enriched.filter((e) => e.big).length;
  const latest = enriched[0];

  return (
    <div className="space-y-8">
      <PosterHeader compact title="Parches" subtitle="Changelog del foro y noticias de Steam" />
      <div className="flex flex-wrap items-end gap-3">
        <Suspense>
          <FilterBar
            fields={[
              { name: "q", label: "Buscar", type: "search", placeholder: "Héroe, objeto, palabra…" },
              { name: "source", label: "Fuente", type: "select", allLabel: "Todas", options: [{ value: "forum", label: "Foro (changelog)" }, { value: "steam", label: "Noticias de Steam" }] },
              { name: "big", label: "Importancia", type: "select", allLabel: "Todos", options: [{ value: "1", label: "Solo grandes actualizaciones" }] },
            ]}
          />
        </Suspense>
        <Button href="/patches/diff" variant="secondary">Ver los cambios de números</Button>
      </div>

      {res.ok && (
        <p className="text-sm text-ink-muted" aria-live="polite">
          {shown.length} de {all.length} parches · {bigCount} grandes actualizaciones{latest && <> · el último, el {longDate(latest.day)}</>}
        </p>
      )}

      {!res.ok ? (
        <ErrorState title="No se han podido cargar los parches" hint="La API no responde ahora mismo. Vuelve a intentarlo en un momento." />
      ) : shown.length === 0 ? (
        <EmptyState title="No hay parches con esos filtros" hint="Prueba con otra búsqueda o quita algún filtro." />
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.month} aria-labelledby={`m-${g.month}`} className="space-y-3">
              <h2 id={`m-${g.month}`} className="flex items-center gap-3 font-display text-xl font-black capitalize">
                {monthTitle(g.month)}
                <span aria-hidden className="h-px flex-1 bg-brass/40" />
                <span className="text-sm font-semibold normal-case text-ink-muted">{g.items.length}</span>
              </h2>
              <ol className="relative space-y-3 border-l-2 border-brass/40 pl-5">
                {g.items.map(({ p, text, big, day }) => {
                  const faces = heroes.filter((h) => mentionedNames(text, [h.name]).length > 0);
                  return (
                    <li key={p.id} className="relative">
                      <span aria-hidden className={`absolute -left-[1.62rem] top-5 size-3 rounded-full border-2 ${big ? "border-accent bg-accent" : "border-brass bg-bg"}`} />
                      <Link href={`/patches/${p.id}`} className={`block space-y-2 rounded-md border bg-surface p-4 shadow-card transition duration-150 hover:-translate-y-0.5 hover:shadow-pop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${big ? "border-accent/60" : "border-brass/30 hover:border-brass"}`}>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="min-w-0 flex-1 font-display text-lg font-black leading-tight">{p.title || "Sin título"}</h3>
                          {big && <Chip tone="apricot">Gran actualización</Chip>}
                          <Chip tone={p.source === "forum" ? "teal" : "neutral"}>{p.source === "forum" ? "Foro" : "Steam"}</Chip>
                          <time dateTime={p.date} className="text-sm tabular-nums text-ink-muted">{dayOnly(day)}</time>
                        </div>
                        {text && <p className="line-clamp-2 text-sm text-ink-muted">{excerpt(p.html, 220)}</p>}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                          {faces.length > 0 && (
                            <span className="flex items-center gap-2">
                              <span className="flex -space-x-2">
                                {faces.slice(0, MAX_FACES).map((h) => <HeroPortrait key={h.id} hero={h} small className="size-7 ring-2 ring-surface" />)}
                              </span>
                              <span>{faces.length === 1 ? faces[0].name : `${faces.length} héroes mencionados`}</span>
                            </span>
                          )}
                          <span>{readingMinutes(text)} min de lectura</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
