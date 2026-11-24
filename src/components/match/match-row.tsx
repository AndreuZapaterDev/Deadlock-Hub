import Link from "next/link";
import { HeroPortrait } from "@/components/hero/hero-card";
import { Chip } from "@/components/ui/chip";
import { fmtDuration, fmtNum, timeAgo } from "@/lib/format";
import type { Hero, MatchHistoryRow } from "@/lib/types";

/** Fila del historial: héroe, resultado, K/D/A, duración, almas y "hace cuánto". Enlaza a la partida. */
export function MatchRow({ match, hero, modeLabel }: { match: MatchHistoryRow; hero?: Pick<Hero, "id" | "name">; modeLabel?: string }) {
  const won = match.match_result === match.player_team;
  return (
    <Link href={`/matches/${match.match_id}`} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-2 pr-4 shadow-card transition-colors hover:bg-brass/5">
      <div className={`h-12 w-1 rounded-full ${won ? "bg-sage" : "bg-rose"}`} aria-hidden />
      {hero && <HeroPortrait hero={hero} small className="h-12 w-12 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{hero?.name ?? `Héroe #${match.hero_id}`}</p>
        <p className="text-xs text-ink-muted">{timeAgo(match.start_time)} · {fmtDuration(match.match_duration_s)}{modeLabel ? ` · ${modeLabel}` : ""}</p>
      </div>
      <Chip tone={won ? "sage" : "rose"}>{won ? "Victoria" : "Derrota"}</Chip>
      <p className="w-24 text-right font-semibold tabular-nums">{match.player_kills} / {match.player_deaths} / {match.player_assists}</p>
      <p className="hidden w-24 text-right text-sm text-ink-muted sm:block">{fmtNum(match.net_worth)} almas</p>
    </Link>
  );
}
