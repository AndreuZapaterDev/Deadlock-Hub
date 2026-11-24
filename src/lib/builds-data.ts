import "server-only";
import { cache } from "react";
import { toApiParams, type BuildEntry, type BuildQuery } from "@/lib/builds";
import { fetchData, orElse, type Fetched } from "@/lib/meta-data";

export const PAGE_SIZE = 20;
export type BuildTag = { id: number; label: string };

export type BuildPage = { items: BuildEntry[]; hasMore: boolean };

/**
 * Lista de builds. Los filtros, el orden y la paginación los hace la API (`toApiParams`); se pide una más de la cuenta para saber
 * si hay otra página (la API no devuelve el total).
 */
export async function loadBuildList(q: BuildQuery): Promise<Fetched<BuildPage>> {
  const res = await fetchData<BuildEntry[]>("/v1/builds", toApiParams(q, PAGE_SIZE));
  if (!res.ok) return res;
  return { ok: true, data: { items: res.data.slice(0, PAGE_SIZE), hasMore: res.data.length > PAGE_SIZE } };
}

export const loadBuild = cache((heroId: number, buildId: number) => fetchData<BuildEntry>(`/v1/builds/${heroId}/${buildId}`));
export const loadBuildTags = cache(() => orElse<BuildTag[]>("/v1/assets/build-tags", []));
