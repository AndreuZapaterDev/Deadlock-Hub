"use client";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export type CompareHero = { slug: string; name: string };
const MAX = 3;
const KEY = "hero-compare";

// Selección para comparar compartida entre las tarjetas y la barra inferior. Vive en sessionStorage (con try/catch: puede estar
// bloqueado) y en memoria, y avisa a los componentes con un evento propio.
let memory: CompareHero[] | null = null;
const listeners = new Set<() => void>();

function read(): CompareHero[] {
  if (memory) return memory;
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as CompareHero[];
    memory = Array.isArray(raw) ? raw.filter((h) => h && typeof h.slug === "string" && typeof h.name === "string").slice(0, MAX) : [];
  } catch {
    memory = [];
  }
  return memory;
}
function write(next: CompareHero[]) {
  memory = next;
  try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* sin almacenamiento: solo dura mientras la página esté abierta */ }
  for (const l of listeners) l();
}
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const EMPTY: CompareHero[] = [];

export function useCompare() {
  const list = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    list,
    has: (slug: string) => list.some((h) => h.slug === slug),
    full: list.length >= MAX,
    toggle: (h: CompareHero) => write(list.some((x) => x.slug === h.slug) ? list.filter((x) => x.slug !== h.slug) : list.length >= MAX ? list : [...list, h]),
    clear: () => write([]),
  };
}

/** Casilla «Comparar» de una tarjeta de héroe (fuera del enlace de la tarjeta, para no anidar controles). */
export function CompareToggle({ hero, compact }: { hero: CompareHero; compact?: boolean }) {
  const { has, full, toggle } = useCompare();
  const on = has(hero.slug);
  const disabled = !on && full;
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={() => toggle(hero)}
      title={disabled ? "Ya hay 3 héroes: quita uno para añadir otro" : on ? "Quitar de la comparación" : "Añadir a la comparación"}
      className={`group/cmp absolute z-20 ${compact ? "right-3.5 top-3.5" : "right-5 top-5"} inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold shadow-card transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-brass bg-brass text-night" : "border-brass/60 bg-night/80 text-cream hover:bg-night"}`}
    >
      <span aria-hidden className="text-sm leading-none">{on ? "✓" : "+"}</span>
      {/* En escritorio la etiqueta solo aparece al pasar el ratón o al elegir; en táctil se ve siempre. */}
      <span className={on ? "" : "[@media(hover:hover)]:sr-only [@media(hover:hover)]:group-hover/cmp:not-sr-only [@media(hover:hover)]:group-focus-visible/cmp:not-sr-only"}>{on ? "Elegido" : "Comparar"}</span>
    </button>
  );
}

/** Barra fija inferior con los héroes elegidos y el enlace al comparador. */
export function CompareTray() {
  const { list, clear, toggle } = useCompare();
  if (list.length === 0) return null;
  const ready = list.length >= 2;
  return (
    <div role="region" aria-label="Héroes a comparar" className="fixed inset-x-0 bottom-0 z-40 border-t border-brass bg-bg/95 px-4 py-3 shadow-[0_-8px_24px_rgb(0_0_0/0.35)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
        <p className="text-sm font-semibold">Comparar ({list.length}/{MAX})</p>
        <ul className="flex flex-wrap gap-2">
          {list.map((h) => (
            <li key={h.slug}>
              <button type="button" onClick={() => toggle(h)} aria-label={`Quitar a ${h.name}`} className="inline-flex items-center gap-1.5 rounded-full border border-brass/50 bg-surface px-3 py-1 text-sm hover:bg-brass/15">
                {h.name} <span aria-hidden className="text-ink-muted">✕</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={clear} className="text-sm text-ink-muted hover:text-ink">Vaciar</button>
          {ready ? (
            <Button href={`/heroes/compare?h=${list.map((h) => h.slug).join(",")}`}>Comparar</Button>
          ) : (
            <span className="text-xs text-ink-muted">Elige al menos 2 héroes</span>
          )}
        </div>
      </div>
      <Link href="/heroes/compare" className="sr-only">Ir al comparador</Link>
    </div>
  );
}
