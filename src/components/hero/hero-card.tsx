import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Sunburst } from "@/components/deco";
import { Chip, type Tone } from "@/components/ui/chip";
import { FeaturedCard } from "@/components/ui/card";
import { Tilt } from "@/components/motion/tilt";
import { CompareToggle } from "@/components/hero/compare-tray";
import { TierBadge } from "@/components/ui/tier-badge";
import type { Tier } from "@/lib/analytics";
import { fmtPct } from "@/lib/format";
import { heroTypeLabel } from "@/lib/labels";
import { getHeroImages } from "@/lib/lookup";
import { slugify } from "@/lib/slug";
import type { Hero } from "@/lib/types";
import { initials } from "@/lib/format";

// Color de los rayos de cada héroe (sobre el panel verde petróleo del retrato).
const ACCENTS: { tone: Tone; color: string }[] = [
  { tone: "rose", color: "var(--accent)" },
  { tone: "apricot", color: "var(--apricot)" },
  { tone: "sage", color: "var(--sage)" },
  { tone: "lilac", color: "var(--lilac)" },
  { tone: "teal", color: "var(--brass)" },
];
// Cada clase tiene su color: así se distingue de un vistazo quién es luchador, asesino, etc.
const TYPE_ACCENT: Record<string, { tone: Tone; color: string }> = {
  brawler: { tone: "apricot", color: "var(--apricot)" },
  assassin: { tone: "lilac", color: "var(--lilac)" },
  marksman: { tone: "rose", color: "var(--accent)" },
  healer: { tone: "sage", color: "var(--sage)" },
  mystic: { tone: "teal", color: "var(--brass)" },
};
/** Color del héroe según su clase; si no se conoce la clase (listas con solo id y nombre), uno estable según el id. */
export const heroPastel = (hero: { id: number; hero_type?: string }) => (hero.hero_type && TYPE_ACCENT[hero.hero_type]) || ACCENTS[hero.id % ACCENTS.length];

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

/** Retrato: la imagen real si hay imágenes remotas (API real) y existe; si no, el placeholder con rayos, trama de puntos y silueta. `arch` = ventana en arco. */
export async function HeroPortrait({ hero, className = "h-40", small, arch, priority }: { hero: Pick<Hero, "id" | "name"> & { hero_type?: string }; className?: string; small?: boolean; arch?: boolean; priority?: boolean }) {
  const t = await getTranslations("heroUi");
  const p = heroPastel(hero);
  const imgs = (await getHeroImages()).get(hero.id);
  const src = small ? imgs?.small ?? imgs?.card : imgs?.card ?? imgs?.small;
  return (
    <div role="img" aria-label={t("portraitOf", { name: hero.name })} className={`relative isolate flex items-end justify-center overflow-hidden bg-poster ${arch ? "arch" : "rounded-sm"} ${className}`}>
      <Sunburst color={p.color} strength={arch ? 0.85 : 0.7} className={arch ? "rays-hover" : undefined} />
      <div aria-hidden className="halftone absolute inset-0 opacity-30 [mask-image:linear-gradient(to_top,black,transparent_70%)]" />
      {src ? (
        // Los retratos ya vienen en webp: sin pasar por el optimizador (ahorra cuota en Vercel).
        <Image src={src} alt="" fill unoptimized priority={priority} sizes={small ? "48px" : "320px"} className={small ? "object-cover" : "object-contain object-bottom"} />
      ) : small ? (
        <span className="relative mb-1 font-display text-sm font-black text-cream">{initials(hero.name)}</span>
      ) : (
        <Silhouette id={hero.id} color={p.color} />
      )}
    </div>
  );
}

/** Ficha de cartel: retrato en arco, cinta roja con el nombre, rol en cursiva y etiquetas tipo pegatina. */
export type HeroCardStat = { tier: Tier; winRate: number; pickRate: number };

/**
 * `stat`: undefined = sin fila de meta (inicio, estilo); null = fila vacía (la lista, para que todas midan lo mismo);
 * objeto = tier, win rate y pick rate. `selectable` añade la casilla «Comparar».
 */
export function HeroCard({ hero, href, stat, selectable, priority, compact }: { hero: Hero; href?: string; stat?: HeroCardStat | null; selectable?: boolean; priority?: boolean; compact?: boolean }) {
  const t = useTranslations("heroUi");
  const tl = useTranslations("labels");
  const p = heroPastel(hero);
  const big = compact ? "text-sm" : "text-base";
  const body = (
    <FeaturedCard fill compact={compact}>
      <div className={`relative pt-2 ${compact ? "px-1" : "px-3"}`}>
        <HeroPortrait hero={hero} arch priority={priority} className={compact ? "h-36" : "h-48"} />
        {/* El tier es lo primero que se busca: va sobre el retrato, a la vista incluso en listas largas. */}
        {stat && <div className={`absolute z-10 drop-shadow-md ${compact ? "left-3 top-3" : "left-5 top-4"}`}><TierBadge tier={stat.tier} size={compact ? "sm" : "md"} /></div>}
      </div>
      <div className={`ribbon relative z-10 bg-accent text-center shadow-card ${compact ? "-mx-1.5 mt-3 px-6 py-1" : "-mx-3 mt-5 px-8 py-2"}`}>
        <h3 title={hero.name} className={`truncate font-display font-black uppercase tracking-[0.05em] text-on-accent ${compact ? "text-lg" : "text-2xl"}`}>{hero.name}</h3>
      </div>
      {stat !== undefined && (
        <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 tabular-nums ${compact ? "mt-2.5 h-10 px-2" : "mt-4 h-12 px-4"}`}>
          {stat && (
            <>
              <div>
                <p className="flex flex-wrap items-baseline gap-x-1 text-xs text-ink-muted">
                  <strong className={`${big} text-ink`}>{fmtPct(stat.winRate)}</strong> {t("wins")}
                </p>
                {/* Barra de 40 % a 60 %: la diferencia entre héroes se ve de un vistazo. */}
                <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-brass/20">
                  <div className="h-full rounded-full bg-brass" style={{ width: `${Math.min(100, Math.max(4, ((stat.winRate - 40) / 20) * 100))}%` }} />
                </div>
              </div>
              <p className="text-right text-xs leading-tight text-ink-muted">
                <strong className={`block ${big} text-ink`}>{fmtPct(stat.pickRate)}</strong>
                {compact ? t("pickShort") : t("inMatches")}
              </p>
            </>
          )}
        </div>
      )}
      {/* Altura fija: todas las tarjetas miden lo mismo. */}
      <div className={`flex flex-wrap content-start justify-center gap-1.5 pb-1 ${compact ? "mt-2 min-h-[3.25rem] px-1" : "mt-3 min-h-[3.25rem] px-3"}`}>
        <Chip tone={p.tone} className={compact ? "px-2 text-[11px] font-semibold" : "font-semibold"}>{heroTypeLabel(tl, hero.hero_type)}</Chip>
        {hero.tags.slice(0, compact ? 1 : 2).map((t) => (
          <span key={t} className={`inline-flex items-center rounded-full border border-brass/50 py-0.5 font-medium capitalize text-ink-muted ${compact ? "px-2 text-[11px]" : "px-2.5 text-xs"}`}>{t.toLowerCase()}</span>
        ))}
      </div>
    </FeaturedCard>
  );
  if (!href) return body;
  return (
    <div className="relative h-full">
      <Tilt className="h-full"><Link href={href} className="group block h-full">{body}</Link></Tilt>
      {selectable && <CompareToggle compact={compact} hero={{ slug: slugify(hero.name), name: hero.name }} />}
    </div>
  );
}
