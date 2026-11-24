import "server-only";
import { getSource } from "@/lib/api";
import { classifyStatuses, type ProfileState } from "@/lib/player-stats";
import type { Accolade, MatchInfo } from "@/lib/types";

export type MatchData = { state: "ok"; match: MatchInfo; accolades: Map<number, string> } | { state: Exclude<ProfileState, "ok"> };

export async function loadMatch(matchId: number): Promise<MatchData> {
  const api = getSource();
  const res = await api.get<{ match_info: MatchInfo }>(`/v1/matches/${matchId}/metadata`).catch(() => ({ status: 500, data: undefined }));
  const state = classifyStatuses([res.status]);
  if (state !== "ok" || !res.data?.match_info) return { state: state === "ok" ? "error" : state };

  const acc = await api.get<Accolade[]>("/v1/assets/accolades").then((r) => (r.status < 400 ? r.data : [])).catch(() => []);
  return { state: "ok", match: res.data.match_info, accolades: new Map(acc.map((a) => [a.id, a.flavor_name])) };
}
