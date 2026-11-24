import { DURATIONS } from "@/lib/analytics-filters";
import type { FilterField } from "./filter-bar";
import type { Rank } from "@/lib/types";

/**
 * Campos de los filtros comunes de analytics (sección 4 de la spec): rango, parche (fecha) y duración.
 * La región no está aquí: en la API solo existe en el leaderboard.
 */
export function analyticsFields(ranks: Rank[], bigDays: string[]): FilterField[] {
  const tiers = ranks.filter((r) => r.tier >= 1).map((r) => ({ value: String(r.tier), label: r.name }));
  const patches = [...bigDays].sort().reverse().slice(0, 12).map((d) => ({ value: d.slice(0, 10), label: `Desde el parche del ${d.slice(0, 10)}` }));
  return [
    { name: "rank_min", label: "Rango desde", type: "select", options: tiers, allLabel: "Cualquiera" },
    { name: "rank_max", label: "Rango hasta", type: "select", options: tiers, allLabel: "Cualquiera" },
    { name: "since", label: "Parche", type: "select", options: patches, allLabel: "Últimos 30 días (por defecto)" },
    { name: "dur", label: "Duración", type: "select", options: Object.entries(DURATIONS).map(([value, d]) => ({ value, label: d.label })), allLabel: "Cualquiera" },
  ];
}
