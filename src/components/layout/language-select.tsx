"use client";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { LANGUAGE_COOKIE, LANGUAGES, type Language } from "@/lib/languages";

/**
 * Selector del idioma de los textos del juego. Guarda la elección en una cookie (un año) y recarga los datos del servidor.
 */
export function LanguageSelect({ current, label }: { current: Language; label: string }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();

  const change = (next: string) => {
    document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    start(() => {
      // El nombre del héroe va en la URL de su ficha y cambia con el idioma: se vuelve a la lista en vez de dar un 404.
      if (/^\/heroes\/(?!compare$)[^/]+$/.test(path)) router.push("/heroes");
      else router.refresh();
    });
  };

  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <Select size="sm" value={current} disabled={pending} onChange={(e) => change(e.target.value)} aria-label={label} wrapperClassName="max-w-40">
        {LANGUAGES.map((l) => <option key={l.api} value={l.api} lang={l.tag}>{l.name}</option>)}
      </Select>
    </label>
  );
}
