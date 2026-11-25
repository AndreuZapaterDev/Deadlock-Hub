import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";

/** Desplegable «Cómo se calcula» del final de las páginas de datos: mismo aspecto en todas. */
export function Explainer({ title, children }: { title?: string; children: React.ReactNode }) {
  const t = useTranslations("analytics");
  return (
    <Card>
      <details>
        <summary className="cursor-pointer font-semibold">{title ?? t("howCalc")}</summary>
        <div className="mt-3 max-w-prose space-y-2 text-sm text-ink-muted">{children}</div>
      </details>
    </Card>
  );
}

/** Línea «Filtros activos: …» bajo la barra de filtros. No pinta nada si no hay filtros. */
export function ActiveFilters({ parts }: { parts: string[] }) {
  const t = useTranslations("analytics");
  if (parts.length === 0) return null;
  return <p className="text-sm text-ink-muted">{t("activeFilters", { list: parts.join(" · ") })}</p>;
}
