"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export type FavKind = "hero" | "item" | "build";
export type Fav = { kind: FavKind; id: string; name: string; href: string };
const KEY = "favorites-v1";

// Favoritos en localStorage (no hay cuentas ni base de datos propia). Todo con try/catch: puede estar bloqueado o vacío.
function read(): string {
  try { return localStorage.getItem(KEY) ?? "[]"; } catch { return "[]"; }
}
function write(list: Fav[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sin almacenamiento: no se recuerda */ }
  window.dispatchEvent(new Event("favorites-changed"));
}
const subscribe = (cb: () => void) => {
  window.addEventListener("favorites-changed", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("favorites-changed", cb); window.removeEventListener("storage", cb); };
};

function useFavorites() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  return useMemo<Fav[]>(() => { try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; } }, [raw]);
}

/** Estrella de favoritos para una ficha (héroe, objeto o build). */
export function FavoriteButton({ kind, id, name, href }: Fav) {
  const t = useTranslations("fav");
  const list = useFavorites();
  const on = list.some((f) => f.kind === kind && f.id === id);
  return (
    <Button variant={on ? "primary" : "secondary"} aria-pressed={on} onClick={() => write(on ? list.filter((f) => !(f.kind === kind && f.id === id)) : [...list, { kind, id, name, href }])}>
      <span aria-hidden>{on ? "★" : "☆"}</span> {on ? t("remove") : t("add")}
    </Button>
  );
}

/** Compartir la página actual: hoja nativa del móvil si existe; si no, copia el enlace. */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations("fav");
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      setDone(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 2200);
    } catch { /* cancelado por el usuario o sin permiso */ }
  }
  return <Button variant="secondary" onClick={share} aria-live="polite">{done ? t("copied") : t("share")}</Button>;
}

/** Franja de la portada con los favoritos agrupados. No pinta nada si no hay ninguno. */
export function FavoritesStrip() {
  const t = useTranslations("fav");
  const list = useFavorites();
  if (!list.length) return null;
  const groups: { kind: FavKind; title: string }[] = [
    { kind: "hero", title: t("heroes") },
    { kind: "item", title: t("items") },
    { kind: "build", title: t("builds") },
  ];
  return (
    <section aria-label={t("title")} className="space-y-3">
      <h2 className="font-display text-xl font-black">{t("title")}</h2>
      {groups.map((g) => {
        const items = list.filter((f) => f.kind === g.kind);
        if (!items.length) return null;
        return (
          <div key={g.kind} className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-serif text-sm italic text-ink-muted">{g.title}</span>
            {items.map((f) => (
              <span key={f.id} className="inline-flex items-center rounded-full border border-brass/40 bg-surface text-sm font-semibold">
                <Link href={f.href} className="py-2 pl-4 pr-2 hover:text-brass">{f.name}</Link>
                <button type="button" aria-label={t("removeNamed", { name: f.name })} onClick={() => write(list.filter((x) => !(x.kind === f.kind && x.id === f.id)))} className="rounded-full px-2.5 py-2 text-ink-muted hover:text-ink">✕</button>
              </span>
            ))}
          </div>
        );
      })}
    </section>
  );
}
