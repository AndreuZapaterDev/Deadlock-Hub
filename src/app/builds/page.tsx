import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BuildCard } from "@/components/builds/build-card";
import { FilterBar } from "@/components/filters/filter-bar";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/pagination";
import { PosterHeader } from "@/components/ui/poster-header";
import { BUILD_LANGUAGES, hasBuildFilters, parseBuildQuery, shopItemsOf } from "@/lib/builds";
import { loadBuildList, loadBuildTags } from "@/lib/builds-data";
import { byId, getHeroNames, getItems } from "@/lib/lookup";
import { loadNames } from "@/lib/player-data";

export const metadata: Metadata = { title: "Builds", description: "Busca las builds de la comunidad de Deadlock por héroe, etiqueta, idioma o autor." };

export default async function BuildsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [heroNames, tags, items] = await Promise.all([getHeroNames(), loadBuildTags(), getItems().then(byId)]);
  const q = parseBuildQuery(sp, new Set(heroNames.keys()), new Set(tags.map((t) => t.id)));
  const [res, tagLabel] = [await loadBuildList(q), new Map(tags.map((t) => [t.id, t.label]))];
  const authors = res.ok ? await loadNames(res.data.items.map((b) => b.hero_build.author_account_id)) : new Map<number, string>();

  const href = (page: number, extra: Record<string, string | undefined> = {}) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...extra, page: page > 1 ? String(page) : undefined }).filter((e): e is [string, string] => !!e[1]));
    return `/builds${p.size ? `?${p}` : ""}`;
  };

  const heroOptions = [...heroNames].filter(([, n]) => n).sort((a, b) => a[1].localeCompare(b[1])).map(([id, label]) => ({ value: String(id), label }));
  const pages = res.ok ? (res.data.hasMore ? q.page + 1 : q.page) : 1;

  return (
    <div className="space-y-8">
      <PosterHeader compact title="Builds" subtitle="Las builds de la comunidad, por héroe y por popularidad" />
      <Suspense fallback={null}>
        <FilterBar
          fields={[
            { name: "q", label: "Buscar", type: "search", placeholder: "Nombre o descripción" },
            { name: "hero", label: "Héroe", type: "select", options: heroOptions },
            { name: "tag", label: "Etiqueta", type: "select", options: tags.map((t) => ({ value: String(t.id), label: t.label })) },
            { name: "lang", label: "Idioma", type: "select", options: BUILD_LANGUAGES.map((label, i) => ({ value: String(i), label })) },
            { name: "sort", label: "Orden", type: "select", options: [{ value: "weekly", label: "Favoritas esta semana" }, { value: "updated", label: "Más recientes" }], allLabel: "Más populares" },
          ]}
        />
      </Suspense>
      {tags.length > 0 && (
        <nav aria-label="Etiquetas" className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Etiquetas</span>
          {tags.slice(0, 12).map((t) => (
            <Link key={t.id} href={href(1, { tag: q.tag === t.id ? undefined : String(t.id) })} aria-current={q.tag === t.id ? "true" : undefined} className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${q.tag === t.id ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`}>{t.label}</Link>
          ))}
        </nav>
      )}
      {q.author !== undefined && (
        <p className="flex items-center gap-2 text-sm">
          Builds del autor <Link href={`/players/${q.author}`} className="link-brass font-semibold">{authors.get(q.author) ?? `#${q.author}`}</Link>
          <Link href={href(1, { author: undefined })} className="rounded-full border border-brass/50 px-2 py-0.5 text-xs font-semibold hover:bg-brass/15" aria-label="Quitar el filtro de autor">✕ quitar</Link>
        </p>
      )}

      {!res.ok ? (
        <ErrorState title="No se han podido cargar las builds" hint={res.status === 503 || res.status === 429 ? "La API está ocupada. Inténtalo en unos segundos." : "Inténtalo de nuevo en unos minutos."} />
      ) : res.data.items.length === 0 ? (
        <EmptyState title="Ninguna build coincide" hint={hasBuildFilters(q) ? "Prueba con otra búsqueda o quita algún filtro." : "Todavía no hay builds publicadas."} />
      ) : (
        <>
          <p className="text-sm text-ink-muted" aria-live="polite">
            Página {q.page}
            {" · "}{q.sort === "updated" ? "más recientes primero" : q.sort === "weekly" ? "más favoritas esta semana primero" : "más populares primero"}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {res.data.items.map((b) => (
              <BuildCard
                key={b.hero_build.hero_build_id}
                build={b}
                heroId={b.hero_build.hero_id}
                shop={shopItemsOf(b, items)}
                heroName={heroNames.get(b.hero_build.hero_id) ?? `Héroe #${b.hero_build.hero_id}`}
                authorName={authors.get(b.hero_build.author_account_id)}
                tags={(b.hero_build.tags ?? []).map((t) => tagLabel.get(t)).filter((t): t is string => !!t).slice(0, 3)}
              />
            ))}
          </div>
          <Pagination page={q.page} pages={pages} href={(p) => href(p)} />
        </>
      )}
    </div>
  );
}
