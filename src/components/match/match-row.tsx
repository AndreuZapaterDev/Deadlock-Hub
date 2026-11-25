import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { HeroPortrait } from "@/components/hero/hero-card";
import { Chip } from "@/components/ui/chip";
import { fmtDuration, fmtNum, timeAgo } from "@/lib/format";
import type { Hero, MatchHistoryRow } from "@/lib/types";

/** Fila del historial: héroe, resultado, K/D/A, duración, almas y "hace cuánto". Enlaza a la partida. */
export function MatchRow({ match, hero, modeLabel }: { match: MatchHistoryRow; hero?: Pick<Hero, "id" | "name">; modeLabel?: string }) {
  const t = useTranslations("playerPage");
  const locale = useLocale();
  const won = match.match_result === match.player_team;
  return (
    <Link href={`/matches/${match.match_id}`} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-2 pr-4 shadow-card transition-colors hover:bg-brass/5">
      <div className={`h-12 w-1 rounded-full ${won ? "bg-sage" : "bg-rose"}`} aria-hidden />
      {hero && <HeroPortrait hero={hero} small className="h-12 w-12 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{hero?.name ?? t("heroFallback", { id: match.hero_id })}</p>
        <p className="text-xs text-ink-muted">{timeAgo(match.start_time, locale)} · {fmtDuration(match.match_duration_s)}{modeLabel ? ` · ${modeLabel}` : ""}</p>
      </div>
      <Chip tone={won ? "sage" : "rose"}>{won ? t("matchRowWin") : t("matchRowLoss")}</Chip>
      <p className="w-24 text-right font-semibold tabular-nums">{match.player_kills} / {match.player_deaths} / {match.player_assists}</p>
      <p className="hidden w-24 text-right text-sm text-ink-muted sm:block">{t("matchRowSouls", { count: fmtNum(match.net_worth) })}</p>
    </Link>
  );
}
