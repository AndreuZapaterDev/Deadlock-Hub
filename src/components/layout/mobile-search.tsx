"use client";
import { useEffect, useRef, useState } from "react";
import { SearchBox } from "@/components/ui/search-box";

/** Lupa del encabezado móvil: despliega el buscador de jugadores debajo de la cabecera. */
export function MobileSearch({ openLabel, label, placeholder }: { openLabel: string; label: string; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) wrap.current?.querySelector("input")?.focus();
  }, [open]);

  return (
    <>
      <button type="button" aria-expanded={open} aria-label={openLabel} onClick={() => setOpen((v) => !v)} className="ml-auto grid size-11 place-items-center rounded-sm border border-brass/50 text-brass hover:bg-brass/15 lg:hidden">
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="7" cy="7" r="5" /><path d="M11 11l4 4" />
        </svg>
      </button>
      {open && (
        <div ref={wrap} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} className="order-last w-full lg:hidden">
          <SearchBox id="header-search" label={label} placeholder={placeholder} />
        </div>
      )}
    </>
  );
}
