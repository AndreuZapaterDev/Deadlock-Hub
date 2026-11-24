import Link from "next/link";
import { Sunburst } from "@/components/deco";
import { Chip, type Tone } from "@/components/ui/chip";
import { FeaturedCard } from "@/components/ui/card";
import { Tilt } from "@/components/motion/tilt";
import type { Hero } from "@/lib/types";

// Color de los rayos de cada héroe (sobre el panel verde petróleo del retrato).
const ACCENTS: { tone: Tone; color: string }[] = [
  { tone: "rose", color: "var(--accent)" },
  { tone: "apricot", color: "var(--apricot)" },
  { tone: "sage", color: "var(--sage)" },
  { tone: "lilac", color: "var(--lilac)" },
  { tone: "teal", color: "var(--brass)" },
];
export const heroPastel = (id: number) => ACCENTS[id % ACCENTS.length];
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// Siluetas provisionales mientras no haya retratos reales: busto + una pieza que cambia con el id
// (cabeza, chistera, capucha, sombrero de ala ancha, cresta). Cada héroe mantiene siempre la suya.
const HEAD: ((props: object) => React.ReactNode)[] = [
  () => null,
  () => (<><rect x="36" y="6" width="28" height="22" rx="2" /><rect x="28" y="26" width="44" height="5" rx="2" /></>),
  () => <path d="M27 66C22 30 36 14 50 14s28 16 23 52z" />,
  () => (<><ellipse cx="50" cy="28" rx="31" ry="5" /><rect x="38" y="12" width="24" height="17" rx="3" /></>),
  () => <rect x="45" y="12" width="10" height="20" rx="4" />,
];

/** Silueta de personaje con contorno de luz del color del héroe. */
function Silhouette({ id, color }: { id: number; color: string }) {
  const Head = HEAD[id % HEAD.length];
  return (
    <svg aria-hidden viewBox="0 0 100 100" className="breathe absolute bottom-0 left-1/2 h-[90%] -translate-x-1/2 drop-shadow-[0_0_6px_rgb(0_0_0/0.5)]" fill="var(--night)" stroke={color} strokeWidth="1.4" strokeLinejoin="round">
      <path d="M8 100C8 74 26 64 50 64s42 10 42 36z" />
      <circle cx="50" cy="44" r="17" />
      <Head />
    </svg>
  );
}

/** Retrato provisional (modo mock: no se cargan imágenes remotas): rayos + trama de puntos + silueta. `arch` = ventana en arco. */
export function HeroPortrait({ hero, className = "h-40", small, arch }: { hero: Pick<Hero, "id" | "name">; className?: string; small?: boolean; arch?: boolean }) {
  const p = heroPastel(hero.id);
  return (
    <div role="img" aria-label={`Retrato de ${hero.name}`} className={`relative isolate flex items-end justify-center overflow-hidden bg-poster ${arch ? "arch" : "rounded-sm"} ${className}`}>
      <Sunburst color={p.color} strength={arch ? 0.85 : 0.7} className={arch ? "rays-hover" : undefined} />
      <div aria-hidden className="halftone absolute inset-0 opacity-30 [mask-image:linear-gradient(to_top,black,transparent_70%)]" />
      {small ? <span className="relative mb-1 font-display text-sm font-black text-cream">{initials(hero.name)}</span> : <Silhouette id={hero.id} color={p.color} />}
    </div>
  );
}

/** Ficha de cartel: retrato en arco, cinta roja con el nombre, rol en cursiva y etiquetas tipo pegatina. */
export function HeroCard({ hero, href }: { hero: Hero; href?: string }) {
  const p = heroPastel(hero.id);
  const body = (
    <FeaturedCard>
      <div className="px-3 pt-2"><HeroPortrait hero={hero} arch className="h-48" /></div>
      <div className="ribbon relative z-10 -mx-3 mt-5 bg-accent px-8 py-2 text-center shadow-card">
        <h3 className="font-display text-2xl font-black uppercase tracking-[0.05em] text-on-accent">{hero.name}</h3>
      </div>
      {hero.description.role && <p className="mt-3 text-center font-serif text-sm italic text-ink-muted">{hero.description.role}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5 pb-1">
        <Chip tone={p.tone}>{hero.hero_type}</Chip>
        {hero.tags.map((t, i) => (
          <span key={t} className={`inline-block rounded-sm bg-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-on-accent ${i % 2 ? "rotate-[1.5deg]" : "-rotate-[1.5deg]"}`}>{t}</span>
        ))}
      </div>
    </FeaturedCard>
  );
  return href ? <Tilt><Link href={href} className="group block">{body}</Link></Tilt> : body;
}
