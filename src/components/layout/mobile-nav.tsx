"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchBox } from "@/components/ui/search-box";

type Group = { title: string; links: { href: string; label: string }[] };
type Labels = {
  bar: string; home: string; heroes: string; players: string; live: string; more: string;
  menu: string; close: string; searchLabel: string; searchPlaceholder: string; settings: string;
};

const ico = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const ICONS = {
  home: <svg {...ico}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  heroes: <svg {...ico}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg>,
  players: <svg {...ico}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>,
  live: <svg {...ico}><circle cx="12" cy="12" r="2.5" /><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 4.5a10.6 10.6 0 0 1 0 15" /></svg>,
  more: <svg {...ico}><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
};

/**
 * Navegación móvil (hasta `lg`): barra inferior con los 4 destinos más usados y «Más», que abre un panel a pantalla completa con
 * todas las secciones agrupadas. Los ajustes (idioma, tema) llegan como `children` desde el servidor.
 */
export function MobileNav({ labels, groups, children }: { labels: Labels; groups: Group[]; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); moreRef.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  const on = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
  const items = [
    { href: "/", label: labels.home, icon: ICONS.home },
    { href: "/heroes", label: labels.heroes, icon: ICONS.heroes },
    { href: "/players", label: labels.players, icon: ICONS.players },
    { href: "/live", label: labels.live, icon: ICONS.live },
  ];
  const cell = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold leading-tight";

  return (
    <>
      <nav aria-label={labels.bar} className="fixed inset-x-0 bottom-0 z-40 border-t border-brass/60 bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="flex">
          {items.map((i) => (
            <li key={i.href} className="flex flex-1">
              <Link href={i.href} aria-current={on(i.href) ? "page" : undefined} className={`${cell} ${on(i.href) ? "text-accent" : "text-ink-muted"}`}>
                {i.icon}
                <span className="max-w-full truncate">{i.label}</span>
              </Link>
            </li>
          ))}
          <li className="flex flex-1">
            <button ref={moreRef} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)} className={`${cell} text-ink-muted`}>
              {ICONS.more}
              <span className="max-w-full truncate">{labels.more}</span>
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={labels.menu} className="fixed inset-0 z-50 flex flex-col bg-bg lg:hidden">
          <div className="flex items-center justify-between border-b border-brass/60 px-4 py-3">
            <span className="font-display text-lg font-black uppercase tracking-[0.08em]">{labels.menu}</span>
            <button ref={closeRef} type="button" onClick={() => { setOpen(false); moreRef.current?.focus(); }} aria-label={labels.close} className="grid size-11 place-items-center rounded-sm border border-brass/50 text-lg hover:bg-brass/15">✕</button>
          </div>
          <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <SearchBox id="menu-search" label={labels.searchLabel} placeholder={labels.searchPlaceholder} />
            {groups.map((g) => (
              <section key={g.title} aria-label={g.title}>
                <h2 className="mb-2 font-serif text-sm font-bold italic text-ink-muted">{g.title}</h2>
                <ul className="grid grid-cols-2 gap-2">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setOpen(false)}
                        aria-current={on(l.href) ? "page" : undefined}
                        className={`flex min-h-11 items-center rounded-sm border px-3 text-[15px] font-semibold ${on(l.href) ? "border-accent bg-accent/10 text-accent" : "border-brass/40 bg-surface hover:bg-brass/10"}`}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <section aria-label={labels.settings} className="flex flex-wrap items-center justify-between gap-3 border-t border-brass/40 pt-4">
              {children}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
