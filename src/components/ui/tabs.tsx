"use client";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Tab = { id: string; label: string; content: React.ReactNode };

/** Pestañas accesibles: flechas ←/→, Inicio y Fin cambian de pestaña. */
export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKey(e: React.KeyboardEvent, i: number) {
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    setActive(t.id);
    refs.current[t.id]?.focus();
  }

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-brass/40">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn("relative whitespace-nowrap px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-colors", active === t.id ? "text-ink" : "text-ink-muted hover:text-ink")}
          >
            {t.label}
            {/* el subrayado de latón se desliza de una pestaña a otra */}
            {active === t.id && <motion.span layoutId="tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 bg-brass" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="pt-4">
          {/* la clave cambia al activarse: el contenido entra con un fundido corto cada vez que se abre la pestaña */}
          <motion.div key={active === t.id ? "on" : "off"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>{t.content}</motion.div>
        </div>
      ))}
    </div>
  );
}
