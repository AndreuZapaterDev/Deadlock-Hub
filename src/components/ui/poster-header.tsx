import { Fragment } from "react";
import { Divider, SigilWire, Sunburst } from "@/components/deco";
import { SpinEmblem } from "@/components/motion/spin-emblem";

/**
 * Cartel de portada, como la carátula del juego: panel verde petróleo, rayos tonales, trama de puntos,
 * cable con símbolos ocultos colgando, emblema de rueda sobre disco bermellón y título en serif crema.
 * Marco escalonado dorado y bombillas de marquesina abajo.
 * Es el elemento más fuerte de la web: úsalo una vez por página.
 *
 * `compact`: variante para páginas de datos (tablas, matrices, filtros). Sin cable ni emblema y con el título más pequeño,
 * para que el contenido quede a la vista nada más entrar.
 */
export function PosterHeader({ title, subtitle, color = "var(--poster-ray)", compact, children }: { title: string; subtitle?: string; color?: string; compact?: boolean; children?: React.ReactNode }) {
  return (
    <header className="cv-auto stepped bg-brass p-px shadow-card [--cv-h:340px]">
      <div className={`poster-surface stepped relative isolate overflow-hidden bg-poster px-6 text-center text-cream ${compact ? "pb-3 pt-3 sm:pb-5 sm:pt-5" : "pb-8 pt-4"}`}>
        <Sunburst animate color={color} strength={1} className="rays-drift" />
        {/* trama de puntos que se desvanece hacia arriba */}
        <div aria-hidden className="halftone absolute inset-0 opacity-40 [mask-image:linear-gradient(to_top,black,transparent_75%)]" />
        {/* velo radial: deja los rayos en los bordes y una zona calmada donde va el texto */}
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_55%_75%_at_50%_48%,var(--poster)_40%,transparent_100%)]" />
        {!compact && <SigilWire className="aspect-[1000/120] min-h-28 !text-cream-muted dark:!text-brass" />}
        <div className={`relative ${compact ? "pt-1" : "pt-10"}`}>
          {/* emblema crema sobre disco bermellón, como el logo de la portada */}
          {!compact && (
            <div className="mx-auto mb-4 grid size-24 place-items-center rounded-full bg-accent text-cream ring-2 ring-brass ring-offset-4 ring-offset-poster halo">
              <SpinEmblem className="size-16 !text-cream" />
            </div>
          )}
          <h1 aria-label={title} className={`font-display font-black uppercase tracking-[0.06em] [perspective:600px] ${compact ? "text-3xl sm:text-5xl" : "text-4xl sm:text-6xl"}`}>
            {/* letra a letra con CSS (sin JS): el texto sigue en el HTML y el lector de pantalla lee aria-label */}
            {title.split(" ").map((word, wi, words) => {
              const start = words.slice(0, wi).join(" ").length + (wi > 0 ? 1 : 0);
              return (
                <Fragment key={wi}>
                  {wi > 0 && " "}
                  <span className="inline-block whitespace-nowrap">
                    {[...word].map((c, i) => <span key={i} aria-hidden className="letter" style={{ "--i": start + i } as React.CSSProperties}>{c}</span>)}
                  </span>
                </Fragment>
              );
            })}
          </h1>
          {subtitle && <p className={`mx-auto max-w-xl font-serif italic text-cream-muted ${compact ? "mt-1 text-base sm:text-lg" : "mt-3 text-lg sm:text-xl"}`}>{subtitle}</p>}
          <Divider className={`mx-auto max-w-xs ${compact ? "mt-3 max-sm:hidden" : "mt-5"}`} />
          {children && <div className="mt-5">{children}</div>}
        </div>
        <div className={`bulbs relative mx-auto max-w-[calc(100%-2rem)] ${compact ? "mt-3 max-sm:hidden sm:mt-4" : "mt-8"}`} aria-hidden />
      </div>
    </header>
  );
}
