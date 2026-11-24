"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/feedback";
import { fmtDuration, fmtNum } from "@/lib/format";
import type { LiveData, LiveHero, LiveMatch } from "@/lib/live-data";
import { slugify } from "@/lib/slug";
import { Select } from "@/components/ui/select";

const REFRESH_MS = 60_000;
const PAGE = 30; // partidas que se pintan de golpe: cada una lleva 12 retratos, y 100 filas eran ~4.000 nodos y 100 imágenes
type Sort = "spectators" | "duration" | "networth";
const SORTS: { value: Sort; label: string }[] = [
  { value: "spectators", label: "Más espectadores" },
  { value: "duration", label: "Más avanzadas" },
  { value: "networth", label: "Más almas" },
];

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function Hero({ h }: { h: LiveHero }) {
  return (
    <Link href={`/heroes/${slugify(h.name)}`} title={h.name} className="grid size-9 place-items-center overflow-hidden rounded-sm bg-poster font-display text-[11px] font-black text-cream outline-offset-2 hover:ring-2 hover:ring-brass">
      {h.img ? <Image src={h.img} alt={h.name} width={36} height={36} unoptimized className="size-9 object-cover" /> : <span aria-label={h.name}>{initials(h.name)}</span>}
    </Link>
  );
}

function Row({ m, now, heroes }: { m: LiveMatch; now: number; heroes: Record<number, LiveHero> }) {
  const [a, b] = m.netWorth;
  const total = a + b;
  const share = total > 0 ? (a / total) * 100 : 50;
  return (
    <li className="cv-auto rounded-md border border-brass/30 bg-surface p-3 shadow-card [--cv-h:150px]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link href={`/matches/${m.id}`} className="font-semibold tabular-nums hover:text-brass">#{m.id}</Link>
        <Chip tone={m.mode === "Ranked" ? "apricot" : "neutral"}>{m.mode}</Chip>
        <span className="text-sm tabular-nums text-ink-muted">{fmtDuration(Math.max(0, now - m.startTime))}</span>
        <span className="text-sm text-ink-muted">· {fmtNum(m.spectators)} {m.spectators === 1 ? "espectador" : "espectadores"}</span>
        {m.broadcast && (
          <a href={m.broadcast} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm font-semibold text-teal-ink underline-offset-2 hover:underline">Retransmisión ↗</a>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <div className="flex gap-1" aria-label="Equipo A">{m.teams[0].map((id, i) => <Hero key={i} h={heroes[id]} />)}</div>
        <span aria-hidden className="font-display text-xs font-black text-ink-muted">VS</span>
        <div className="flex gap-1" aria-label="Equipo B">{m.teams[1].map((id, i) => <Hero key={i} h={heroes[id]} />)}</div>
      </div>
      <div className="mt-2.5" role="img" aria-label={`Almas: equipo A ${fmtNum(a)}, equipo B ${fmtNum(b)}`}>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-rose/70"><div className="bg-sage" style={{ width: `${share}%` }} /></div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-ink-muted"><span>{fmtNum(a)}</span><span>{fmtNum(b)}</span></div>
      </div>
    </li>
  );
}

/**
 * Partidas en directo. Los datos iniciales vienen del servidor; después se refrescan cada 60 s desde `/api/live`
 * (nuestro propio route handler, con caché) y solo mientras la pestaña está visible.
 */
export function LiveList({ initial }: { initial: Extract<LiveData, { ok: true }> }) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(initial.now);
  const [sort, setSort] = useState<Sort>("spectators");
  const [stale, setStale] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/live");
      const json = (await res.json()) as LiveData;
      if (json.ok) {
        setData(json);
        setNow(json.now);
        setStale(false);
      } else setStale(true);
    } catch {
      setStale(true);
    }
  }, []);

  useEffect(() => {
    // El reloj sube cada 15 s para que las duraciones no se queden quietas entre refrescos.
    const clock = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15_000);
    const poll = setInterval(() => document.visibilityState === "visible" && refresh(), REFRESH_MS);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [refresh]);

  const sorted = [...data.matches].sort((x, y) =>
    sort === "spectators" ? y.spectators - x.spectators : sort === "duration" ? x.startTime - y.startTime : y.netWorth[0] + y.netWorth[1] - (x.netWorth[0] + x.netWorth[1]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-ink-muted" aria-live="polite">
          <span className="font-semibold text-ink tabular-nums">{fmtNum(data.matches.length)}</span> partidas en curso · se actualiza cada minuto
          {stale && <span className="ml-2 rounded-sm bg-apricot/25 px-2 py-0.5 text-xs font-semibold text-apricot-ink">Sin conexión: datos de hace un momento</span>}
        </p>
        <label className="ml-auto flex items-center gap-2 text-xs font-semibold text-ink-muted">
          Ordenar por
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </label>
      </div>
      {sorted.length === 0 ? (
        <EmptyState title="No hay partidas en curso" hint="Vuelve a mirar en un minuto." />
      ) : (
        <>
          <ul className="grid gap-3 lg:grid-cols-2">{sorted.slice(0, shown).map((m) => <Row key={m.id} m={m} now={now} heroes={data.heroes} />)}</ul>
          {sorted.length > shown && (
            <div className="flex justify-center">
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="rounded-sm border border-brass/60 px-5 py-2 text-sm font-semibold hover:bg-brass/15">
                Mostrar más ({Math.min(PAGE, sorted.length - shown)} de {sorted.length - shown} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
