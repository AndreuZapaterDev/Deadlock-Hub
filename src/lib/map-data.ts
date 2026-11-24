import "server-only";
import { cache } from "react";
import { buildHeat, type HeatCell, type KillDeathPoint, type MapAssetData } from "@/lib/map";
import { toHeatQuery, type MapFilters } from "@/lib/map-filters";
import { fetchData, type Fetched } from "@/lib/meta-data";

export const loadMap = cache(() => fetchData<MapAssetData>("/v1/assets/map"));

export const HEAT_GRID = 64;
export type HeatResult = { cells: HeatCell[]; grid: number };

/** Heatmap de kills/muertes ya agregado en el servidor: el fichero crudo tiene decenas de miles de puntos y nunca va al navegador. */
export async function loadHeat(radius: number, filters: MapFilters): Promise<Fetched<HeatResult>> {
  const r = await fetchData<KillDeathPoint[]>("/v1/analytics/kill-death-stats", toHeatQuery(filters));
  return r.ok ? { ok: true, data: { cells: buildHeat(r.data, radius, HEAT_GRID), grid: HEAT_GRID } } : r;
}
