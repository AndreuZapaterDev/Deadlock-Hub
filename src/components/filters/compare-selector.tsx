"use client";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

type Option = { value: string; label: string };

/** Selector de 2 o 3 héroes. La selección vive en la URL (`?h=a,b,c`), así que se puede compartir. */
export function CompareSelector({ options, selected }: { options: Option[]; selected: string[] }) {
  const router = useRouter();

  const change = (index: number, value: string) => {
    const next = [...selected];
    next[index] = value;
    const slugs = [...new Set(next.filter(Boolean))];
    router.replace(slugs.length ? `/heroes/compare?h=${slugs.join(",")}` : "/heroes/compare", { scroll: false });
  };

  return (
    <form role="search" aria-label="Elegir héroes a comparar" className="grid gap-3 rounded-md border border-brass/30 bg-panel p-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <label key={i} className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
          Héroe {i + 1}{i === 2 ? " (opcional)" : ""}
          <Select value={selected[i] ?? ""} onChange={(e) => change(i, e.target.value)}>
            <option value="">Elige héroe</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </label>
      ))}
    </form>
  );
}
