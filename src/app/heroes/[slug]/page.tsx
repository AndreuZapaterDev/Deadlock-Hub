import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroPortrait, heroPastel } from "@/components/hero/hero-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { fmtDec } from "@/lib/format";
import { abilityStats, abilityUpgrades } from "@/lib/item-sections";
import { difficultyLabel, HERO_STATS, heroTypeLabel, unitsToMeters } from "@/lib/labels";
import { getHeroAbilities, getHeroBySlug, getHeroes, getHeroWeapon } from "@/lib/lookup";
import { slugify } from "@/lib/slug";
import { stripHtml } from "@/lib/format";

export const revalidate = 43200; // 12 h: los assets cambian solo con un parche

export async function generateStaticParams() {
  return (await getHeroes()).map((h) => ({ slug: slugify(h.name) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const hero = await getHeroBySlug((await params).slug);
  return hero ? { title: hero.name, description: hero.description.role } : {};
}

export default async function HeroPage({ params }: { params: Promise<{ slug: string }> }) {
  const hero = await getHeroBySlug((await params).slug);
  if (!hero) notFound();

  const [abilities, weapon, all] = await Promise.all([getHeroAbilities(hero), getHeroWeapon(hero), getHeroes()]);
  const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
  const i = sorted.findIndex((h) => h.id === hero.id);
  const [prev, next] = [sorted[(i - 1 + sorted.length) % sorted.length], sorted[(i + 1) % sorted.length]];
  const w = weapon?.weapon_info;
  const tone = heroPastel(hero.id).tone;

  const baseStats = HERO_STATS.map((s) => ({ ...s, value: hero.starting_stats[s.key]?.value })).filter((s) => s.value !== undefined);
  const weaponRows = w
    ? [
        ["Daño por bala", fmtDec(w.bullet_damage) + (w.bullets > 1 ? ` × ${w.bullets}` : "")],
        ["Daño por segundo", fmtDec(w.damage_per_second)],
        ["Disparos por segundo", fmtDec(w.shots_per_second)],
        ["Cargador", String(w.clip_size)],
        ["Recarga", `${fmtDec(w.reload_duration)} s`],
        ["Daño completo hasta", `${fmtDec(unitsToMeters(w.damage_falloff_start_range))} m`],
        ["Daño mínimo desde", `${fmtDec(unitsToMeters(w.damage_falloff_end_range))} m`],
        ["Alcance máximo", `${Math.round(unitsToMeters(w.range))} m`],
      ]
    : [];

  return (
    <div className="space-y-12">
      <PosterHeader title={hero.name} subtitle={hero.description.role}>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Chip tone={tone}>{heroTypeLabel(hero.hero_type)}</Chip>
          <Chip>Dificultad: {difficultyLabel(hero.complexity)}</Chip>
          {hero.gun_tag && <Chip>{hero.gun_tag}</Chip>}
        </div>
      </PosterHeader>

      <section aria-label="Resumen" className="grid gap-8 md:grid-cols-[18rem_1fr]">
        <HeroPortrait hero={hero} arch className="mx-auto h-72 w-64" />
        <div className="space-y-4">
          {hero.description.lore ? (
            <p className="max-w-prose font-serif text-lg leading-relaxed">{hero.description.lore}</p>
          ) : (
            <p className="text-ink-muted">Este héroe aún no tiene historia publicada.</p>
          )}
          {hero.description.playstyle && (
            <Card>
              <p className="font-semibold">Estilo de juego</p>
              <p className="mt-1 max-w-prose text-sm text-ink-muted">{stripHtml(hero.description.playstyle)}</p>
            </Card>
          )}
          {hero.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {hero.tags.map((t) => <span key={t} className="inline-block rounded-sm bg-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-accent">{t}</span>)}
            </div>
          )}
          <p className="text-xs text-ink-muted">Textos del juego en inglés (datos de ejemplo del modo demo).</p>
        </div>
      </section>

      <section aria-labelledby="stats" className="space-y-4">
        <SectionTitle id="stats">Estadísticas base</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-2 font-semibold">Al empezar la partida</h3>
            <dl className="divide-y divide-brass/20 text-sm">
              {baseStats.map((s) => (
                <div key={s.key} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-ink-muted">{s.label}</dt>
                  <dd className="font-semibold tabular-nums">{s.digits !== undefined ? fmtDec(Number(s.value!.toFixed(s.digits))) : s.value}{s.unit}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {weaponRows.length > 0 && (
            <Card>
              <h3 className="mb-2 font-semibold">Arma principal</h3>
              <dl className="divide-y divide-brass/20 text-sm">
                {weaponRows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-1.5">
                    <dt className="text-ink-muted">{k}</dt>
                    <dd className="font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </section>

      <section aria-labelledby="abilities" className="space-y-4">
        <SectionTitle id="abilities">Habilidades</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          {abilities.map((a, n) => {
            const stats = abilityStats(a);
            const ups = abilityUpgrades(a);
            return (
              <Card key={a.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-brass bg-poster font-display text-lg font-black text-cream">{n + 1}</span>
                  <div>
                    <h3 className="font-display text-lg font-black leading-tight">{a.name}</h3>
                    <p className="text-xs capitalize text-ink-muted">{a.ability_type === "ultimate" ? "Definitiva" : "Habilidad"}</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{stripHtml(a.description?.desc) || "Sin descripción."}</p>
                {stats.length > 0 && (
                  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    {stats.map((s) => (
                      <div key={s.label}><dt className="inline text-ink-muted">{s.label}: </dt><dd className="inline font-semibold">{s.text}</dd></div>
                    ))}
                  </dl>
                )}
                {ups.some((u) => u.length) && (
                  <ol className="space-y-1 border-t border-brass/30 pt-3 text-sm">
                    {ups.map((u, t) => u.length > 0 && (
                      <li key={t} className="flex gap-2">
                        <span className="w-6 shrink-0 font-bold text-brass">T{t + 1}</span>
                        <span>{u.map((s) => `${s.label} ${s.text}`).join(" · ")}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <nav aria-label="Otros héroes" className="flex flex-wrap items-center justify-between gap-3 border-t border-brass/30 pt-6">
        <Link href={`/heroes/${slugify(prev.name)}`} className="link-brass font-semibold">← {prev.name}</Link>
        <Button href="/heroes" variant="secondary">Todos los héroes</Button>
        <Link href={`/heroes/${slugify(next.name)}`} className="link-brass font-semibold">{next.name} →</Link>
      </nav>
    </div>
  );
}
