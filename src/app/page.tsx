import Link from "next/link";
import { Sigil } from "@/components/deco";
import { HeroCard } from "@/components/hero/hero-card";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { getSource } from "@/lib/api";
import { fmtPct } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { byId, getHeroes } from "@/lib/lookup";
import type { HeroStat } from "@/lib/types";

type GameStats = { total_matches: number; total_players: number; avg_duration_s: number };

const TILES = [
  { href: "/heroes", title: "Héroes", text: "Habilidades, estadísticas base y lore de cada uno.", accent: "bg-lilac" },
  { href: "/items", title: "Objetos", text: "La tienda completa por categoría y tier.", accent: "bg-apricot" },
  { href: "/tier-list", title: "Tier list", text: "Quién gana más ahora mismo, por rango y parche.", accent: "bg-sage" },
  { href: "/build-planner", title: "Build planner", text: "Monta tu build y calcula el coste en almas.", accent: "bg-teal" },
];


export default async function Home() {
  const api = getSource();
  const [heroes, stats, game, live] = await Promise.all([
    getHeroes(),
    api.get<HeroStat[]>("/v1/analytics/hero-stats").then((r) => r.data),
    api.get<GameStats[]>("/v1/analytics/game-stats").then((r) => r.data[0]),
    api.get<{ match_id: number; spectators: number }[]>("/v1/matches/active").then((r) => r.data),
  ]);
  const heroById = byId(heroes);
  const top = stats
    .filter((s) => s.matches > 0 && heroById.has(s.hero_id))
    .map((s) => ({ hero: heroById.get(s.hero_id)!, rate: s.wins / s.matches }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);

  const figures = [
    { value: game.total_matches, kind: "num" as const, label: "partidas analizadas" },
    { value: game.total_players, kind: "num" as const, label: "jugadores distintos" },
    { value: heroes.length, kind: "num" as const, label: "héroes jugables" },
    { value: game.avg_duration_s, kind: "duration" as const, label: "duración media" },
  ];

  return (
    <div className="space-y-14">
      <PosterHeader title="Deadlock Hub" subtitle="Todo sobre Deadlock en un solo sitio: héroes, objetos, estadísticas y tu perfil">
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/players">Busca tu cuenta</Button>
          <Button href="/heroes" variant="secondary">Ver héroes</Button>
        </div>
      </PosterHeader>

      <Link href="/live" className="group flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-sm border border-accent/60 bg-accent/10 px-4 py-2.5 text-sm transition-colors hover:bg-accent/20">
        <span aria-hidden className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" /><span className="relative inline-flex size-2.5 rounded-full bg-accent" /></span>
        <span><strong className="font-display text-base font-black">{live.length}</strong> partidas en directo ahora mismo</span>
        <span className="link-brass font-semibold">Ver en directo</span>
      </Link>

      <dl className="grid grid-cols-2 gap-y-6 border-y-4 border-double border-brass/60 py-6 lg:grid-cols-4">
        {figures.map((f, i) => (
          <div key={f.label} className={`px-4 text-center ${i > 0 ? "lg:border-l lg:border-brass/40" : ""} ${i % 2 === 1 ? "border-l border-brass/40 lg:border-l" : ""}`}>
            <dd className="font-display text-3xl font-black sm:text-4xl"><CountUp value={f.value} kind={f.kind} /></dd>
            <dt className="mt-1 font-serif text-sm italic text-ink-muted">{f.label}</dt>
          </div>
        ))}
      </dl>

      <section aria-labelledby="top-heroes" className="space-y-5">
        <SectionTitle id="top-heroes">Los héroes con más victorias</SectionTitle>
        <div className="grid gap-6 sm:grid-cols-3">
          {top.map(({ hero, rate }, i) => (
            <Reveal key={hero.id} variant="curtain" delay={i * 0.14} className="space-y-2">
              <HeroCard hero={hero} href={`/heroes/${slugify(hero.name)}`} />
              <p className="text-center text-sm text-ink-muted"><span className="font-semibold text-sage-ink">{fmtPct(rate)}</span> de victorias</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-label="Accesos rápidos" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t, i) => (
          <Reveal key={t.href} delay={i * 0.08} className="h-full"><Link href={t.href} className="shine group relative block h-full overflow-hidden rounded-md border border-brass/40 bg-surface p-5 pt-6 shadow-card transition-transform duration-300 hover:-translate-y-0.5">
            <span aria-hidden className={`absolute inset-x-0 top-0 h-1.5 ${t.accent}`} />
            <Sigil className="absolute -bottom-8 -right-8 h-32 w-32 opacity-20 transition-all duration-700 group-hover:rotate-45 group-hover:opacity-40" />
            <h3 className="relative font-display text-lg font-black uppercase tracking-[0.06em]">{t.title}</h3>
            <p className="relative mt-2 text-sm text-ink-muted">{t.text}</p>
          </Link></Reveal>
        ))}
      </section>
    </div>
  );
}
