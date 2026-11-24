import "server-only";
import { cache } from "react";
import { filterBuilds, sortBuilds, toApiParams, type BuildEntry, type BuildQuery } from "@/lib/builds";
import { fetchData, isMock, orElse, type Fetched } from "@/lib/meta-data";

export const PAGE_SIZE = 20;
export type BuildTag = { id: number; label: string };

export type BuildPage = { items: BuildEntry[]; hasMore: boolean; /** Solo se conoce con los fixtures; la API no devuelve el total. */ total: number | null };

/**
 * Lista de builds. Con la API real, los filtros, el orden y la paginación los hace ella (`toApiParams`).
 * Con los fixtures hay que hacerlo aquí, porque el mock devuelve siempre la misma lista de 100 builds ignorando los parámetros.
 */
export async function loadBuildList(q: BuildQuery): Promise<Fetched<BuildPage>> {
  if (isMock()) {
    const all = await fetchData<BuildEntry[]>("/v1/builds");
    if (!all.ok) return all;
    const list = sortBuilds(filterBuilds(all.data, q), q.sort);
    const start = (q.page - 1) * PAGE_SIZE;
    return { ok: true, data: { items: list.slice(start, start + PAGE_SIZE), hasMore: list.length > start + PAGE_SIZE, total: list.length } };
  }
  const res = await fetchData<BuildEntry[]>("/v1/builds", toApiParams(q, PAGE_SIZE));
  if (!res.ok) return res;
  return { ok: true, data: { items: res.data.slice(0, PAGE_SIZE), hasMore: res.data.length > PAGE_SIZE, total: null } };
}

export const loadBuild = cache((heroId: number, buildId: number) => fetchData<BuildEntry>(`/v1/builds/${heroId}/${buildId}`));
export const loadBuildTags = cache(() => orElse<BuildTag[]>("/v1/assets/build-tags", []));
