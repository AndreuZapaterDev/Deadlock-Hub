"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

type Entry = { key: string; label: string; hint: string; href: string };
type Index = { heroes: { n: string; href: string }[]; items: { n: string; href: string }[] };
type Labels = { open: string; title: string; placeholder: string; hero: string; item: string; page: string; player: string; none: string; hintKeys: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}+/gu, "");

/**
 * Paleta de búsqueda global: `Ctrl+K` (o `⌘K`, o `/` fuera de un campo de texto). Busca en las secciones, los héroes y los objetos,
 * y ofrece buscar el texto como jugador. Teclado: ↑↓ elige, Enter abre, Esc cierra. El índice se pide una sola vez, al abrir.
 */
export function CommandPalette({ labels, pages }: { labels: Labels; pages: { href: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState<Index | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if ((e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // El índice se pide una sola vez, la primera vez que se abre la paleta.
  const asked = useRef(false);
  useEffect(() => {
    if (!open || asked.current) return;
    asked.current = true;
    fetch("/api/search-index").then((r) => r.json()).then(setIndex).catch(() => setIndex({ heroes: [], items: [] }));
  }, [open]);

  const results = useMemo<Entry[]>(() => {
    const n = norm(q.trim());
    const all: Entry[] = [
      ...pages.map((p) => ({ key: `p${p.href}`, label: p.label, hint: labels.page, href: p.href })),
      ...(index?.heroes ?? []).map((h) => ({ key: `h${h.href}`, label: h.n, hint: labels.hero, href: h.href })),
      ...(index?.items ?? []).map((i) => ({ key: `i${i.href}`, label: i.n, hint: labels.item, href: i.href })),
    ];
    const starts = (e: Entry) => Number(!norm(e.label).startsWith(n));
    const hits = n ? all.filter((e) => norm(e.label).includes(n)).sort((a, b) => starts(a) - starts(b)) : all.filter((e) => e.hint === labels.page);
    const out = hits.slice(0, 8);
    if (q.trim().length >= 2) out.push({ key: "player", label: q.trim(), hint: labels.player, href: `/players?q=${encodeURIComponent(q.trim())}` });
    return out;
  }, [q, index, pages, labels]);

  const close = () => { setOpen(false); setQ(""); setActive(0); };
  const go = (e: Entry | undefined) => { if (!e) return; close(); router.push(e.href); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={labels.open} aria-keyshortcuts="Control+K" className="hidden items-center gap-2 rounded-sm border border-brass/50 px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:bg-brass/15 lg:flex">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><circle cx="7" cy="7" r="5" /><path d="M11 11l4 4" /></svg>
        <kbd className="font-sans text-[11px]">Ctrl K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-night/70 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div role="dialog" aria-modal="true" aria-label={labels.title} className="w-full max-w-xl overflow-hidden rounded-md border border-brass bg-surface shadow-pop">
            <input
              ref={input}
              value={q}
              onChange={(e) => { setQ(e.target.value); setActive(0); }}
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
                else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
                else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                else if (e.key === "Enter") go(results[active]);
              }}
              role="combobox"
              aria-expanded
              aria-controls={`${uid}-list`}
              aria-activedescendant={results[active] ? `${uid}-${active}` : undefined}
              placeholder={labels.placeholder}
              autoComplete="off"
              className="w-full border-b border-brass/40 bg-transparent px-4 py-3.5 text-base text-ink placeholder:text-ink-muted focus:outline-none"
            />
            <ul id={`${uid}-list`} role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-4 text-sm text-ink-muted">{labels.none}</li>}
              {results.map((r, i) => (
                <li key={r.key} id={`${uid}-${i}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(r)} className={`flex cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-sm ${i === active ? "bg-brass/20" : ""}`}>
                  <span className="truncate font-semibold">{r.label}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{r.hint}</span>
                </li>
              ))}
            </ul>
            <p className="border-t border-brass/30 px-4 py-2 text-xs text-ink-muted">{labels.hintKeys}</p>
          </div>
        </div>
      )}
    </>
  );
}
