"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/search-box";
import { Select } from "@/components/ui/select";

export type FilterField =
  | { name: string; label: string; type: "search"; placeholder?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; allLabel?: string };

/**
 * Filtros que viven en la URL (se pueden compartir). Los selects aplican al instante;
 * la búsqueda espera 300 ms tras la última tecla. Sin JS, "Aplicar" envía el formulario por GET.
 */
export function FilterBar({ fields }: { fields: FilterField[] }) {
  const t = useTranslations("common");
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const first = useRef(true);
  const [open, setOpen] = useState(false); // solo móvil: en `sm` y superior los filtros siempre se ven

  // El servidor puede tardar varios segundos en responder (la API real es lenta): hasta entonces el valor elegido se ve ya en el
  // desplegable (useOptimistic) y el formulario avisa de que se está actualizando (useTransition).
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic<Record<string, string>, { name: string; value: string }>(
    Object.fromEntries(params.entries()),
    (cur, u) => ({ ...cur, [u.name]: u.value }),
  );
  const apply = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value); else next.delete(name);
    start(() => {
      setShown({ name, value });
      router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
    });
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => apply("q", q.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = [...params.keys()].length > 0;
  const count = fields.filter((f) => params.get(f.type === "search" ? "q" : f.name)).length;
  const fieldsId = useId();
  return (
    <form action={path} role="search" aria-busy={pending} className="relative overflow-hidden rounded-md border border-brass/30 bg-panel p-3">
      {pending && <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 animate-pulse-soft bg-brass" />}
      <span role="status" className="sr-only">{pending ? t("updating") : ""}</span>
      <button type="button" aria-expanded={open} aria-controls={fieldsId} onClick={() => setOpen((v) => !v)} className="flex min-h-11 w-full items-center justify-between gap-2 text-sm font-semibold sm:hidden">
        <span>{t("filters")}{count > 0 && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs text-on-accent">{count}</span>}</span>
        <span aria-hidden className={`text-brass transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      <noscript><style>{".filter-fields{display:flex!important}"}</style></noscript>
      <div id={fieldsId} className={`filter-fields flex-wrap items-end gap-3 max-sm:mt-3 sm:flex ${open ? "flex" : "hidden"}`}>
      {fields.map((f) =>
        f.type === "search" ? (
          <label key={f.name} className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-ink-muted">
            {f.label}
            <Input name="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.placeholder} autoComplete="off" />
          </label>
        ) : (
          <label key={f.name} className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
            {f.label}
            <Select name={f.name} value={shown[f.name] ?? ""} onChange={(e) => apply(f.name, e.target.value)}>
              <option value="">{f.allLabel ?? "Todos"}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </label>
        ),
      )}
      <noscript><button type="submit" className="rounded-sm border border-brass px-3 py-2 text-sm">{t("apply")}</button></noscript>
      {active && <Link href={path} className="link-brass pb-2 text-sm font-semibold">{t("clearFilters")}</Link>}
      </div>
    </form>
  );
}
