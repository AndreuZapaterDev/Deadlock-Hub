"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type Group = { title: string; links: { href: string; label: string }[] };

/** Escritorio: botón «Más» con el mapa completo del sitio (las secciones que no caben en la fila principal). */
export function NavMore({ label, groups }: { label: string; groups: Group[] }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); root.current?.querySelector("button")?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={root} className="relative shrink-0">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="rounded-sm px-3 py-1.5 font-serif text-[15px] font-bold hover:bg-brass/15">
        {label} <span aria-hidden className="text-brass">▾</span>
      </button>
      {open && (
        <div id={id} className="absolute right-0 top-full z-50 mt-2 grid w-[44rem] max-w-[90vw] grid-cols-4 gap-6 rounded-md border border-brass bg-surface p-5 shadow-pop">
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h2 className="mb-2 font-serif text-sm font-bold italic text-ink-muted">{g.title}</h2>
              <ul className="space-y-1">
                {g.links.map((l) => (
                  <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="block rounded-sm px-2 py-1 text-sm font-semibold hover:bg-brass/15">{l.label}</Link></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
