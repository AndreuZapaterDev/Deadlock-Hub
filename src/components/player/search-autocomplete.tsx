"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { parseSteamQuery } from "@/lib/steam-id";
import type { SearchResult } from "@/lib/types";

type Option = { key: string; label: string; hint?: string; href: string };

/**
 * Buscador de jugadores con autocompletado (patrón ARIA "combobox"). Acepta SteamID32/64, SteamID3, URL de perfil,
 * vanity y nombres. Espera 300 ms tras la última tecla y consulta nuestra ruta `/api/players/search` (nunca la API externa).
 */
export function SearchAutocomplete({ initial = "" }: { initial?: string }) {
  const t = useTranslations("players");
  const router = useRouter();
  const uid = useId();
  const listId = `${uid}-list`;
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const box = useRef<HTMLDivElement>(null);

  const parsed = parseSteamQuery(value);
  const q = value.trim();

  // Solo los nombres piden resultados al servidor; un ID o una URL se resuelven sin red.
  useEffect(() => {
    if (parsed.kind !== "name" || q.length < 2) return;
    const ctl = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        if (!res.ok) throw new Error(String(res.status));
        setResults((await res.json()).results as SearchResult[]);
        setStatus("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 300);
    return () => { clearTimeout(timer); ctl.abort(); };
    // `parsed` se deriva de `q`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const options: Option[] = [];
  if (parsed.kind === "account") options.push({ key: "go", label: t("goToProfile", { id: parsed.accountId }), hint: t("accountRecognized"), href: `/players/${parsed.accountId}` });
  else if (parsed.kind === "vanity") options.push({ key: "vanity", label: t("searchVanity", { name: parsed.vanity }), hint: t("steamProfileName"), href: `/players?q=${encodeURIComponent(q)}` });
  else if (parsed.kind === "name" && q.length >= 2) {
    for (const r of results) options.push({ key: String(r.id), label: r.name, hint: t("matches30d", { count: r.matches30d, id: r.id }), href: `/players/${r.id}` });
    if (results.length) options.push({ key: "all", label: t("seeAllResults", { q }), href: `/players?q=${encodeURIComponent(q)}` });
  }

  const go = (href: string) => { setOpen(false); router.push(href); };
  const submit = () => (active >= 0 && options[active] ? go(options[active].href) : q && go(`/players?q=${encodeURIComponent(q)}`));

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % Math.max(options.length, 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? options.length - 1 : a - 1)); }
    else if (e.key === "Escape") { setOpen(false); setActive(-1); }
  };

  const showList = open && q.length >= 2 && (options.length > 0 || status !== "idle" || parsed.kind === "name");
  return (
    <div ref={box} className="relative">
      <form role="search" onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex gap-2">
        <label htmlFor={`${uid}-in`} className="sr-only">{t("searchLabel")}</label>
        <input
          id={`${uid}-in`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(-1); setResults([]); setStatus("idle"); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="w-full rounded-sm border border-brass/50 bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted focus-visible:border-brass"
        />
        <button type="submit" className="press shine frame-double rounded-sm border border-brass bg-accent px-6 text-sm font-semibold text-on-accent hover:bg-accent/85">{t("searchButton")}</button>
      </form>

      {showList && (
        <ul id={listId} role="listbox" aria-label={t("suggestions")} className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-auto rounded-md border border-brass bg-surface shadow-pop">
          {status === "loading" && <li role="presentation" className="px-4 py-3 text-sm text-ink-muted">{t("searching")}</li>}
          {status === "error" && <li role="presentation" className="px-4 py-3 text-sm text-rose-ink">{t("searchError")}</li>}
          {status === "idle" && parsed.kind === "name" && !options.length && <li role="presentation" className="px-4 py-3 text-sm text-ink-muted">{t("noSuggestions", { q })}</li>}
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); go(o.href); }}
              className={`cursor-pointer px-4 py-2.5 ${i === active ? "bg-ink text-bg" : ""}`}
            >
              <span className="block text-sm font-semibold">{o.label}</span>
              {o.hint && <span className={`block text-xs ${i === active ? "text-bg/80" : "text-ink-muted"}`}>{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
