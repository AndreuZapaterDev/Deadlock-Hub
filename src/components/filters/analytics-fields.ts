import { DURATIONS } from "@/lib/analytics-filters";
import type { FilterField } from "./filter-bar";
import type { Rank } from "@/lib/types";

/**
 * Campos de los filtros comunes de analytics (sección 4 de la spec): rango, parche (fecha) y duración.
 * La región no está aquí: en la API solo existe en el leaderboard.
 */
/** `t` = traductor del namespace «analytics». */
export function analyticsFields(ranks: Rank[], bigDays: string[], t: (key: string, values?: Record<string, string | number>) => string): FilterField[] {
  const tiers = ranks.filter((r) => r.tier >= 1).map((r) => ({ value: String(r.tier), label: r.name }));
  const patches = [...bigDays].sort().reverse().slice(0, 12).map((d) => ({ value: d.slice(0, 10), label: t("sincePatch", { date: d.slice(0, 10) }) }));
  return [
    { name: "rank_min", label: t("rankFrom"), type: "select", options: tiers, allLabel: t("any") },
    { name: "rank_max", label: t("rankTo"), type: "select", options: tiers, allLabel: t("any") },
    { name: "since", label: t("patch"), type: "select", options: patches, allLabel: t("last30") },
    { name: "dur", label: t("duration"), type: "select", options: Object.entries(DURATIONS).map(([value, d]) => ({ value, label: t(d.key) })), allLabel: t("any") },
  ];
}
