"use client";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Select } from "@/components/ui/select";

type Option = { value: string; label: string };

/** Selector de 2 o 3 héroes. La selección vive en la URL (`?h=a,b,c`), así que se puede compartir. */
export function CompareSelector({ options, selected }: { options: Option[]; selected: string[] }) {
  const t = useTranslations("compare");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(selected);

  const change = (index: number, value: string) => {
    const next = [...shown];
    next[index] = value;
    const slugs = [...new Set(next.filter(Boolean))];
    start(() => {
      setShown(next);
      router.replace(slugs.length ? `/heroes/compare?h=${slugs.join(",")}` : "/heroes/compare", { scroll: false });
    });
  };

  return (
    <form role="search" aria-label={t("selectorLabel")} aria-busy={pending} className="grid gap-3 rounded-md border border-brass/30 bg-panel p-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <label key={i} className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
          {t("heroN", { n: i + 1 })}{i === 2 ? t("optional") : ""}
          <Select value={shown[i] ?? ""} onChange={(e) => change(i, e.target.value)}>
            <option value="">{t("pickHero")}</option>
            {/* un héroe ya elegido en otro hueco no se puede repetir: se desactiva en vez de deshacer el cambio en silencio */}
            {options.map((o) => <option key={o.value} value={o.value} disabled={shown.some((v, j) => j !== i && v === o.value)}>{o.label}</option>)}
          </Select>
        </label>
      ))}
    </form>
  );
}
