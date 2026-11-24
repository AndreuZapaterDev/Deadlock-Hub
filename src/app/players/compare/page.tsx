import type { Metadata } from "next";
import Link from "next/link";
import { ProfileProblem } from "@/components/player/profile-problem";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { Input } from "@/components/ui/search-box";
import { fmtDec, fmtNum, fmtPct } from "@/lib/format";
import { getHeroNames, getRanks } from "@/lib/lookup";
import { loadPlayer } from "@/lib/player-data";
import { parseSteamQuery } from "@/lib/steam-id";

export const metadata: Metadata = { title: "Comparar jugadores" };

const account = (v?: string) => {
  const p = parseSteamQuery(v ?? "");
  return p.kind === "account" ? p.accountId : null;
};

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a: aRaw = "", b: bRaw = "" } = await searchParams;
  const [aId, bId] = [account(aRaw), account(bRaw)];
  const invalid = (aRaw && aId === null) || (bRaw && bId === null);

  const form = (
    <form action="/players/compare" className="grid gap-3 rounded-md border border-brass/30 bg-surface p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {[["a", "Jugador A", aRaw], ["b", "Jugador B", bRaw]].map(([name, label, value]) => (
        <label key={name} className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
          {label}
          <Input name={name} defaultValue={value} placeholder="SteamID32, SteamID64 o URL de perfil" autoComplete="off" />
        </label>
      ))}
      <Button type="submit">Comparar</Button>
    </form>
  );

  const header = <PosterHeader title="Comparar" subtitle="Dos jugadores, lado a lado" />;
  if (aId === null || bId === null) {
    return (
      <div className="space-y-8">
        {header}
        {form}
        {invalid && <p role="alert" className="text-sm text-rose-ink">Escribe un SteamID32, un SteamID64 o la URL del perfil de Steam (los nombres no valen aquí: puedes buscarlos en <Link href="/players" className="link-brass font-semibold">Jugadores</Link>).</p>}
        {!invalid && <p className="text-sm text-ink-muted">Escribe dos cuentas para compararlas. También puedes llegar desde el botón «Comparar con…» de un perfil.</p>}
      </div>
    );
  }

  const [da, db, ranks, heroNames] = await Promise.all([loadPlayer(aId), loadPlayer(bId), getRanks(), getHeroNames()]);
  if (da.state !== "ok") return <ProfileProblem state={da.state} subject={`Jugador A · cuenta #${aId}`} backHref="/players/compare" backLabel="Volver al comparador" />;
  if (db.state !== "ok") return <ProfileProblem state={db.state} subject={`Jugador B · cuenta #${bId}`} backHref="/players/compare" backLabel="Volver al comparador" />;

  const fav = (d: typeof da) => {
    const top = [...d.heroes].sort((x, y) => y.matches_played - x.matches_played)[0];
    return top ? heroNames.get(top.hero_id) ?? `#${top.hero_id}` : "—";
  };
  const rankText = (d: typeof da) => {
    const t = d.rank ? ranks.find((r) => r.tier === d.rank!.rank) : undefined;
    return t && d.rank ? `${t.name} ${d.rank.subrank}` : "Sin rango";
  };
  const name = (d: typeof da, id: number) => d.profile?.personaname ?? `#${id}`;

  // `better`: mayor es mejor. Se resalta el mejor valor en verde y el peor en rojo (si empatan, no se resalta nada).
  const rows: { label: string; a: number; b: number; fmt: (n: number) => string; text?: [string, string] }[] = [
    { label: "Rango", a: da.rank?.badge ?? 0, b: db.rank?.badge ?? 0, fmt: String, text: [rankText(da), rankText(db)] },
    { label: "Partidas", a: da.summary.matches, b: db.summary.matches, fmt: fmtNum },
    { label: "Win rate", a: da.summary.winRate, b: db.summary.winRate, fmt: (n) => fmtPct(n) },
    { label: "KDA medio", a: da.summary.kda, b: db.summary.kda, fmt: fmtDec },
    { label: "Almas por minuto", a: da.summary.soulsPerMin, b: db.summary.soulsPerMin, fmt: (n) => fmtNum(Math.round(n)) },
  ];
  const cls = (mine: number, other: number) => (mine === other ? "" : mine > other ? "font-bold text-sage-ink" : "text-rose-ink");

  return (
    <div className="space-y-8">
      {header}
      {form}
      {process.env.DATA_SOURCE !== "api" && aId !== bId && <p className="text-center text-sm text-ink-muted">Modo demo: ambas cuentas muestran el mismo perfil de ejemplo, así que no habrá diferencias.</p>}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b border-brass/40 text-left">
              <th scope="col" className="py-2 pr-4 font-semibold text-ink-muted">Métrica</th>
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
              <th scope="row" className="py-2 pr-4 text-left font-normal text-ink-muted">Héroe más jugado</th>
              <td className="px-3 py-2 text-right">{fav(da)}</td>
              <td className="px-3 py-2 text-right">{fav(db)}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
