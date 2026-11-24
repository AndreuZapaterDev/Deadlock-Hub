import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { loadBigDays } from "@/lib/meta-data";
import { loadPatches } from "@/lib/patch-data";
import { isBigDay } from "@/lib/patches";

export const metadata: Metadata = { title: "Parches", description: "Notas de parche de Deadlock: changelog del foro y noticias de Steam, con los grandes días marcados." };
export const revalidate = 3600;

const date = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export default async function PatchesPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const sp = await searchParams;
  const [res, bigDays] = await Promise.all([loadPatches(), loadBigDays()]);
  const patches = res.ok ? res.data.filter((p) => !sp.source || p.source === sp.source) : [];

  return (
    <div className="space-y-8">
      <PosterHeader compact title="Parches" subtitle="Changelog del foro y noticias de Steam" />
      <div className="flex flex-wrap items-end gap-3">
        <Suspense>
          <FilterBar fields={[{ name: "source", label: "Fuente", type: "select", allLabel: "Todas", options: [{ value: "forum", label: "Foro (changelog)" }, { value: "steam", label: "Noticias de Steam" }] }]} />
        </Suspense>
        <Button href="/patches/diff" variant="secondary">Ver los cambios de números</Button>
      </div>
      {!res.ok ? (
        <ErrorState title="No se han podido cargar los parches" hint="La API no responde ahora mismo. Vuelve a intentarlo en un momento." />
      ) : patches.length === 0 ? (
        <EmptyState title="No hay parches con ese filtro" />
      ) : (
        <ul className="space-y-3">
          {patches.map((p) => (
            <li key={p.id}>
              <Link href={`/patches/${p.id}`} className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass">
                <Card className="flex flex-wrap items-center gap-x-3 gap-y-1 transition-colors hover:bg-brass/10">
                  <h2 className="min-w-0 flex-1 font-display text-lg font-black leading-tight">{p.title || "Sin título"}</h2>
                  {isBigDay(p, bigDays) && <Chip tone="apricot">Gran actualización</Chip>}
                  <Chip tone={p.source === "forum" ? "teal" : "neutral"}>{p.source === "forum" ? "Foro" : "Steam"}</Chip>
                  <time dateTime={p.date} className="text-sm tabular-nums text-ink-muted">{date(p.date)}</time>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
