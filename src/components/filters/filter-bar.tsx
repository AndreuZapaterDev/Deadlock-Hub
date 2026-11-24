"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

  const apply = (name: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value); else next.delete(name);
    router.replace(next.size ? `${path}?${next}` : path, { scroll: false });
  };

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => apply("q", q.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = [...params.keys()].length > 0;
  return (
    <form action={path} role="search" className="flex flex-wrap items-end gap-3 rounded-md border border-brass/30 bg-panel p-3">
      {fields.map((f) =>
        f.type === "search" ? (
          <label key={f.name} className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-ink-muted">
            {f.label}
            <Input name="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.placeholder} autoComplete="off" />
          </label>
        ) : (
          <label key={f.name} className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
            {f.label}
            <Select name={f.name} value={params.get(f.name) ?? ""} onChange={(e) => apply(f.name, e.target.value)}>
              <option value="">{f.allLabel ?? "Todos"}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </label>
        ),
      )}
      <noscript><button type="submit" className="rounded-sm border border-brass px-3 py-2 text-sm">{t("apply")}</button></noscript>
      {active && <Link href={path} className="link-brass pb-2 text-sm font-semibold">{t("clearFilters")}</Link>}
    </form>
  );
}
