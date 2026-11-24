import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { categoriesOf, linkify, orderSteps } from "@/lib/builds";
import { loadBuild, loadBuildTags } from "@/lib/builds-data";
import { encodeBuild } from "@/lib/build-planner";
import { fmtNum, timeAgo } from "@/lib/format";
import { byId, getHeroNames, getItems } from "@/lib/lookup";
import { loadNames } from "@/lib/player-data";
import { slugify } from "@/lib/slug";

const int = (v: string) => (/^\d{1,12}$/.test(v) ? Number(v) : null);

export async function generateMetadata({ params }: { params: Promise<{ heroId: string; buildId: string }> }): Promise<Metadata> {
  const { heroId, buildId } = await params;
  const [h, b] = [int(heroId), int(buildId)];
  if (h === null || b === null) return {};
  const r = await loadBuild(h, b);
  return r.ok ? { title: r.data.hero_build.name } : { title: "Build" };
}

export default async function BuildPage({ params }: { params: Promise<{ heroId: string; buildId: string }> }) {
  const { heroId, buildId } = await params;
  const [hid, bid] = [int(heroId), int(buildId)];
  if (hid === null || bid === null) notFound();

  const res = await loadBuild(hid, bid);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return <ErrorState title="No se ha podido cargar la build" hint={res.status === 503 || res.status === 429 ? "La API está ocupada. Inténtalo en unos segundos." : "Inténtalo de nuevo en unos minutos."} />;
  }

  const build = res.data;
  const h = build.hero_build;
  const [heroNames, items, tags, authors] = await Promise.all([getHeroNames(), getItems().then(byId), loadBuildTags(), loadNames([h.author_account_id])]);
  const heroName = heroNames.get(h.hero_id) ?? `Héroe #${h.hero_id}`;
  const author = authors.get(h.author_account_id);
  const tagLabel = new Map(tags.map((t) => [t.id, t.label]));
  const categories = categoriesOf(build);
  const steps = orderSteps(build);

  // Enlace al planner con los objetos de tienda de la build, en el orden en que aparecen
  const shopItems = [...new Set(categories.flatMap((c) => c.mods).map((m) => items.get(m.ability_id)).filter((i) => i?.type === "upgrade").map((i) => i!.class_name))];
  const plannerHref = `/build-planner?${encodeBuild(slugify(heroName), shopItems)}`;

  const desc = (h.description ?? "").trim();

  return (
    <div className="space-y-12">

      <PosterHeader title={h.name} subtitle={`Build de ${heroName}`}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Chip tone="lilac">{heroName}</Chip>
          <Chip>v{h.version}</Chip>
          <Chip>★ {fmtNum(build.num_favorites ?? 0)}</Chip>
          <Chip>Actualizada {timeAgo(h.last_updated_timestamp)}</Chip>
          {(h.tags ?? []).map((t) => tagLabel.get(t)).filter((t): t is string => !!t).map((t) => <Chip key={t}>{t}</Chip>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {shopItems.length > 0 && <Button href={plannerHref} variant="secondary">Abrir en el planner</Button>}
          <Button href={`/heroes/${slugify(heroName)}`} variant="ghost"><span className="text-cream">Ver {heroName}</span></Button>
        </div>
      </PosterHeader>

      <section aria-labelledby="about" className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 id="about" className="font-display text-xl font-black">Notas del autor</h2>
          {desc ? (
            <p className="max-w-prose whitespace-pre-line text-sm [overflow-wrap:anywhere] leading-relaxed">
              {linkify(desc).map((p, i) => p.type === "link" ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="link-brass font-semibold">{p.value}</a> : p.value)}
            </p>
          ) : (
            <p className="text-sm text-ink-muted">El autor no ha escrito ninguna nota.</p>
          )}
        </div>
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-black">Importar en el juego</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">ID de la build</dt><dd className="font-mono font-semibold">{h.hero_build_id}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Versión</dt><dd className="font-mono font-semibold">{h.version}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-muted">Autor</dt><dd><Link href={`/players/${h.author_account_id}`} className="link-brass font-semibold">{author ?? `#${h.author_account_id}`}</Link></dd></div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={String(h.hero_build_id)} label="Copiar ID" />
            <Button href={`/builds?author=${h.author_account_id}`} variant="ghost">Más builds de este autor</Button>
          </div>
          <p className="text-xs text-ink-muted">Usa el ID para encontrar la build en el navegador de builds del juego. Los pasos exactos de importación dependen del juego.</p>
        </Card>
      </section>

      <section aria-labelledby="items" className="space-y-4">
        <SectionTitle id="items">Objetos por fase</SectionTitle>
        {categories.every((c) => c.mods.length === 0) ? (
          <p className="text-sm text-ink-muted">Esta build no incluye objetos.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.filter((c) => c.mods.length > 0).map((c, i) => (
              <Card key={i} className="space-y-2">
                <h3 className="font-display text-lg font-black">{c.name}</h3>
                {c.description && <p className="text-xs text-ink-muted">{c.description}</p>}
                <ol className="space-y-1.5">
                  {c.mods.map((m, n) => {
                    const it = items.get(m.ability_id);
                    return (
                      <li key={n} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                        <span className="w-5 text-right font-bold tabular-nums text-brass">{n + 1}</span>
                        {it?.type === "upgrade" ? <Link href={`/items/${it.class_name}`} className="link-brass font-semibold">{it.name}</Link> : <span className="font-semibold">{it?.name ?? `Objeto #${m.ability_id}`}</span>}
                        {m.annotation && <span className="text-xs italic text-ink-muted">«{m.annotation}»</span>}
                      </li>
                    );
                  })}
                </ol>
              </Card>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted">Los textos y las notas son los del autor, tal como los publicó.</p>
      </section>

      {steps.length > 0 && (
        <section aria-labelledby="order" className="space-y-4">
          <SectionTitle id="order">Orden de habilidades</SectionTitle>
          <Card>
            <ol className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-baseline gap-2 text-sm">
                  <span className="w-6 text-right font-bold tabular-nums text-brass">{i + 1}</span>
                  <span className="font-semibold">{items.get(s.ability_id)?.name ?? `#${s.ability_id}`}</span>
                  <span className="text-xs text-ink-muted">{s.currency_type === 2 ? "desbloquear" : "mejorar"}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-ink-muted">«Desbloquear» y «mejorar» se deducen del tipo de punto que gasta cada paso (2 y 1 respectivamente en los datos).</p>
          </Card>
        </section>
      )}
    </div>
  );
}
