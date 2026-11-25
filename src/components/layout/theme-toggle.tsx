"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/** Interruptor Día/Noche. El tema inicial lo fija un script en <head> antes de pintar (sin parpadeo). */
export function ThemeToggle({ dayLabel, nightLabel }: { dayLabel: string; nightLabel: string }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    // lectura única del tema ya aplicado por el script de <head>
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const apply = () => { document.documentElement.dataset.theme = next; };
    const root = document.documentElement.style;
    // View Transitions API: el nuevo tema se expande en círculo desde el botón. Sin soporte o con movimiento reducido: cambio directo.
    const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition;
    if (vt && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const r = e.currentTarget.getBoundingClientRect();
      root.setProperty("--vt-x", `${r.left + r.width / 2}px`);
      root.setProperty("--vt-y", `${r.top + r.height / 2}px`);
      // radio exacto hasta la esquina más lejana: la animación termina cuando el borde sale de la pantalla
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      root.setProperty("--vt-max", `${Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy))}px`);
      vt.call(document, apply);
    } else apply();
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch { /* modo privado: solo no se recuerda */ }
  }

  const night = theme === "dark";
  return (
    <button type="button" onClick={toggle} aria-pressed={night} className="rounded-sm border border-brass/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-brass/15">
      {night ? nightLabel : dayLabel}
    </button>
  );
}

export const themeInitScript = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme="dark"}catch(e){document.documentElement.dataset.theme="dark"}`;
