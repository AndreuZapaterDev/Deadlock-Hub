import type { Metadata } from "next";
import { Suspense } from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { HeroCard } from "@/components/hero/hero-card";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { DIFFICULTY, HERO_TYPE } from "@/lib/labels";
import { getHeroes } from "@/lib/lookup";
import { slugify } from "@/lib/slug";

export const metadata: Metadata = { title: "Héroes", description: "Todos los héroes de Deadlock: estadísticas base, arma y habilidades." };

type Params = { q?: string; type?: string; difficulty?: string; gun?: string };

export default async function HeroesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", type = "", difficulty = "", gun = "" } = await searchParams;
  const all = await getHeroes();
  const guns = [...new Set(all.map((h) => h.gun_tag).filter((g): g is string => !!g))].sort();

  const term = q.toLowerCase();
  const heroes = all
    .filter((h) => (!type || h.hero_type === type) && (!difficulty || String(h.complexity) === difficulty) && (!gun || h.gun_tag === gun))
    .filter((h) => !term || [h.name, h.description.role, h.gun_tag, ...h.tags].some((s) => s?.toLowerCase().includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-8">
      <PosterHeader title="Héroes" subtitle={`${all.length} héroes jugables, cada uno con su estilo`} />
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            { name: "q", label: "Buscar", type: "search", placeholder: "Nombre, rol o etiqueta" },
            { name: "type", label: "Tipo", type: "select", options: Object.entries(HERO_TYPE).map(([value, label]) => ({ value, label })) },
            { name: "difficulty", label: "Dificultad", type: "select", options: Object.entries(DIFFICULTY).map(([value, label]) => ({ value, label })) },
            { name: "gun", label: "Arma", type: "select", options: guns.map((g) => ({ value: g, label: g })) },
          ]}
        />
      </Suspense>
      <p className="text-sm text-ink-muted" aria-live="polite">{heroes.length} {heroes.length === 1 ? "héroe" : "héroes"}</p>
      {heroes.length === 0 ? (
        <EmptyState title="Ningún héroe coincide" hint="Prueba con otra búsqueda o quita algún filtro." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {heroes.map((h, i) => (
            <Reveal key={h.id} delay={(i % 3) * 0.08}>
              <HeroCard hero={h} href={`/heroes/${slugify(h.name)}`} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
