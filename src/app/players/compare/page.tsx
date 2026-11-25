import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ProfileProblem } from "@/components/player/profile-problem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { Input } from "@/components/ui/search-box";
import { fmtDec, fmtNum, fmtPct } from "@/lib/format";
import { getHeroNames, getRanks } from "@/lib/lookup";
import { loadPlayer } from "@/lib/player-data";
import { parseSteamQuery } from "@/lib/steam-id";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("players"))("cmpTitle") };
}

const account = (v?: string) => {
  const p = parseSteamQuery(v ?? "");
  return p.kind === "account" ? p.accountId : null;
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const t = await getTranslations("players");
  const { a: aRaw = "", b: bRaw = "" } = await searchParams;
  const [aId, bId] = [account(aRaw), account(bRaw)];
  const invalid = (aRaw && aId === null) || (bRaw && bId === null);

  const form = (
    <form action="/players/compare" className="grid gap-3 rounded-md border border-brass/30 bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {[["a", t("playerA"), aRaw], ["b", t("playerB"), bRaw]].map(([name, label, value]) => (
        <label key={name} className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
          {label}
          <Input name={name} defaultValue={value} placeholder={t("cmpPlaceholder")} autoComplete="off" />
        </label>
      ))}
      <Button type="submit">{t("cmpHeader")}</Button>
    </form>
  );

  const header = <PosterHeader compact title={t("cmpHeader")} subtitle={t("cmpSubtitle")} />;
  if (aId === null || bId === null) {
    return (
      <div className="space-y-8">
        {header}
        {form}
        {invalid && <p role="alert" className="text-sm text-rose-ink">{t.rich("cmpInvalid", { link: (c) => <Link href="/players" className="link-brass font-semibold">{c}</Link> })}</p>}
        {!invalid && <p className="text-sm text-ink-muted">{t("cmpHint")}</p>}
      </div>
    );
  }

  const [da, db, ranks, heroNames] = await Promise.all([loadPlayer(aId), loadPlayer(bId), getRanks(), getHeroNames()]);
  if (da.state !== "ok") return <ProfileProblem state={da.state} subject={t("cmpSubjectA", { id: aId })} backHref="/players/compare" backLabel={t("backToCompare")} />;
  if (db.state !== "ok") return <ProfileProblem state={db.state} subject={t("cmpSubjectB", { id: bId })} backHref="/players/compare" backLabel={t("backToCompare")} />;

  const fav = (d: typeof da) => {
    const top = [...d.heroes].sort((x, y) => y.matches_played - x.matches_played)[0];
    return top ? heroNames.get(top.hero_id) ?? `#${top.hero_id}` : "—";
  };
  const rankText = (d: typeof da) => {
    const tr = d.rank ? ranks.find((r) => r.tier === d.rank!.rank) : undefined;
    return tr && d.rank ? `${tr.name} ${d.rank.subrank}` : t("noRank");
  };
  const name = (d: typeof da, id: number) => d.profile?.personaname ?? `#${id}`;

  // `better`: mayor es mejor. Se resalta el mejor valor en verde y el peor en rojo (si empatan, no se resalta nada).
  const rows: { label: string; a: number; b: number; fmt: (n: number) => string; text?: [string, string] }[] = [
    { label: t("rowRank"), a: da.rank?.badge ?? 0, b: db.rank?.badge ?? 0, fmt: String, text: [rankText(da), rankText(db)] },
    { label: t("rowMatches"), a: da.summary.matches, b: db.summary.matches, fmt: fmtNum },
    { label: t("rowWin"), a: da.summary.winRate, b: db.summary.winRate, fmt: (n) => fmtPct(n) },
    { label: t("rowKda"), a: da.summary.kda, b: db.summary.kda, fmt: fmtDec },
    { label: t("rowSouls"), a: da.summary.soulsPerMin, b: db.summary.soulsPerMin, fmt: (n) => fmtNum(Math.round(n)) },
  ];
  const cls = (mine: number, other: number) => (mine === other ? "" : mine > other ? "font-bold text-sage-ink" : "text-rose-ink");

  return (
    <div className="space-y-8">
      {header}
      {form}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-brass/40 text-left">
              <th scope="col" className="py-2 pr-4 font-semibold text-ink-muted">{t("metric")}</th>
              <th scope="col" className="px-3 py-2 text-right font-display text-lg font-black"><Link href={`/players/${aId}`} className="link-brass">{name(da, aId)}</Link></th>
              <th scope="col" className="px-3 py-2 text-right font-display text-lg font-black"><Link href={`/players/${bId}`} className="link-brass">{name(db, bId)}</Link></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-brass/20">
                <th scope="row" className="py-2 pr-4 text-left font-normal text-ink-muted">{r.label}</th>
                <td className={`px-3 py-2 text-right tabular-nums ${cls(r.a, r.b)}`}>{r.text ? r.text[0] : r.fmt(r.a)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${cls(r.b, r.a)}`}>{r.text ? r.text[1] : r.fmt(r.b)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-2 pr-4 text-left font-normal text-ink-muted">{t("rowFav")}</th>
              <td className="px-3 py-2 text-right">{fav(da)}</td>
              <td className="px-3 py-2 text-right">{fav(db)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
