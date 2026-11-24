"use client";
import { useEffect, useState } from "react";

export type NavSection = { id: string; label: string };

const OFFSET = 170; // altura de la cabecera fija + este menú

/**
 * Navegación fija de la ficha: enlaces a cada sección y la que se está leyendo queda marcada.
 * La sección activa es la última cuyo borde superior ya ha pasado bajo las cabeceras fijas (se recalcula al hacer scroll).
 * Solo muestra las secciones que existen en la página: algunas llegan después por streaming (meta, objetos populares) o no siempre
 * están (historial de cambios), así que la lista se vuelve a calcular al hacer scroll y cuando cambia el DOM.
 */
export function HeroNav({ sections }: { sections: NavSection[] }) {
  const [present, setPresent] = useState<string[]>(() => sections.map((s) => s.id));
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    let pending = 0;
    const update = () => {
      pending = 0;
      const found = sections.filter((s) => document.getElementById(s.id));
      const ids = found.map((s) => s.id);
      setPresent((prev) => (prev.length === ids.length && prev.every((id, i) => id === ids[i]) ? prev : ids));
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let current = found[0]?.id;
      for (const s of found) {
        if (document.getElementById(s.id)!.getBoundingClientRect().top <= OFFSET) current = s.id;
      }
      setActive(atBottom ? found[found.length - 1]?.id : current);
    };
    const schedule = () => { if (!pending) pending = requestAnimationFrame(update); };
    const first = requestAnimationFrame(update);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Las secciones que llegan por streaming añaden nodos al DOM después de montar: se observa el contenido principal.
    const mo = new MutationObserver(schedule);
    mo.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(first);
      if (pending) cancelAnimationFrame(pending);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      mo.disconnect();
    };
  }, [sections]);

  return (
    <nav aria-label="Secciones de la ficha" className="-mx-4 overflow-x-auto bg-bg/90 px-4 py-2 shadow-[0_1px_0_var(--brass)] backdrop-blur md:sticky md:top-[6.7rem] md:z-30">
      <ul className="flex min-w-max gap-1 text-sm">
        {sections.filter((s) => present.includes(s.id)).map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className={`block rounded-sm px-3 py-1.5 font-semibold transition-colors ${active === s.id ? "bg-ink text-bg" : "text-ink-muted hover:bg-brass/15 hover:text-ink"}`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
