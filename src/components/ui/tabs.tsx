"use client";
import { motion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Tab = { id: string; label: string; content: React.ReactNode };

/**
 * Pestañas accesibles: flechas ←/→, Inicio y Fin cambian de pestaña.
 *
 * `syncHash`: la pestaña abierta se guarda en la URL (`#id`) y se restaura al entrar o al pulsar un enlace con ancla. El ancla puede
 * ser la de la pestaña o la de cualquier elemento que esté dentro de ella (`#history` abre la pestaña que contiene ese bloque).
 * `sticky`: la barra de pestañas se queda pegada bajo la cabecera del sitio al hacer scroll.
 */
export function Tabs({ tabs, syncHash, sticky, label }: { tabs: Tab[]; syncHash?: boolean; sticky?: boolean; label?: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const uid = useId(); // varias barras en la misma página (una dentro de otra) no deben compartir ids
  const tabId = (id: string) => `${uid}-tab-${id}`;
  const panelId = (id: string) => `${uid}-panel-${id}`;

  const select = useCallback((id: string, opts?: { focus?: boolean }) => {
    setActive(id);
    if (opts?.focus) refs.current[id]?.focus();
    if (syncHash) {
      try { history.replaceState(null, "", `#${id}`); } catch { /* entornos sin History API: solo no se recuerda */ }
    }
  }, [syncHash]);

  // Al entrar o al cambiar el ancla: abre la pestaña que contiene ese ancla
  useEffect(() => {
    if (!syncHash) return;
    const fromHash = () => {
      const hash = decodeURIComponent(location.hash.slice(1));
      if (!hash) return;
      const direct = tabs.find((t) => t.id === hash);
      if (direct) {
        setActive(direct.id);
        // si dentro hay un elemento con ese mismo id (el título de la sección), se lleva a pantalla
        requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
        return;
      }
      const el = document.getElementById(hash);
      const panel = el?.closest<HTMLElement>("[data-tab-panel]");
      const owner = tabs.find((t) => t.id === panel?.dataset.tabPanel);
      if (owner) {
        setActive(owner.id);
        // el bloque estaba oculto: cuando ya se ve, se lleva a pantalla
        requestAnimationFrame(() => el?.scrollIntoView({ block: "start" }));
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [syncHash, tabs]);

  function onKey(e: React.KeyboardEvent, i: number) {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(tabs[(next + tabs.length) % tabs.length].id, { focus: true });
  }

  return (
    <div>
      <div className={cn(sticky && "-mx-4 bg-bg/90 px-4 backdrop-blur md:sticky md:top-[6.7rem] md:z-30")}>
        {/* sin barra de scroll visible: si no caben, se desliza con el dedo o la rueda (overflow-y oculto: el subrayado no genera scroll vertical) */}
        <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-brass/40 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el; }}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-selected={active === t.id}
              aria-controls={panelId(t.id)}
              tabIndex={active === t.id ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn("relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brass", active === t.id ? "text-ink" : "text-ink-muted hover:text-ink")}
            >
              {t.label}
              {/* el subrayado de latón se desliza de una pestaña a otra */}
              {active === t.id && <motion.span layoutId={`${uid}-underline`} className="absolute inset-x-0 bottom-0 h-0.5 bg-brass" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={panelId(t.id)} data-tab-panel={t.id} aria-labelledby={tabId(t.id)} hidden={active !== t.id} className="pt-6">
          {/* la clave cambia al activarse: el contenido entra con un fundido corto cada vez que se abre la pestaña */}
          <motion.div key={active === t.id ? "on" : "off"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>{t.content}</motion.div>
        </div>
      ))}
    </div>
  );
}
