"use client";
import { useId, useState } from "react";
import { fmtDec, fmtNum } from "@/lib/format";
import type { LevelStats } from "@/lib/hero-stats";

const PRESETS = [1, 5, 10, 15, 20, 25, 30, 36];

/**
 * Calculadora de nivel: cómo crece el héroe al subir de nivel (solo con las mejoras por nivel; sin objetos ni mejoras de
 * habilidades). Recibe las 36 filas ya calculadas en el servidor: el navegador no necesita los datos del héroe.
 */
export function LevelCalculator({ rows, hasWeapon }: { rows: LevelStats[]; hasWeapon: boolean }) {
  const id = useId();
  const [level, setLevel] = useState(1);
  const max = rows.length;
  const cur = rows[Math.min(level, max) - 1];
  const base = rows[0];

  const items: { label: string; value: string; delta?: number; hide?: boolean }[] = [
    { label: "Almas necesarias", value: fmtNum(cur.souls) },
    { label: "Vida", value: fmtNum(Math.round(cur.health)), delta: cur.health - base.health },
    { label: "Daño por bala", value: fmtDec(cur.bulletDamage), delta: cur.bulletDamage - base.bulletDamage, hide: !hasWeapon },
    { label: "Daño por segundo", value: fmtDec(cur.dps), delta: cur.dps - base.dps, hide: !hasWeapon },
    { label: "Daño cuerpo a cuerpo", value: fmtDec(cur.melee), delta: cur.melee - base.melee },
    { label: "Poder espiritual (por niveles)", value: fmtDec(cur.spiritPower), delta: cur.spiritPower - base.spiritPower, hide: cur.spiritPower === 0 && max > 1 && rows[max - 1].spiritPower === 0 },
  ];

  return (
    <div className="space-y-5 rounded-md border border-brass/30 bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor={id} className="font-display text-lg font-black uppercase">Nivel <span className="tabular-nums text-brass">{level}</span></label>
        <input id={id} type="range" min={1} max={max} step={1} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="min-w-48 flex-1 accent-[var(--brass)]" aria-valuetext={`Nivel ${level}`} />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Niveles rápidos">
          {PRESETS.filter((p) => p <= max).map((p) => (
            <button key={p} type="button" onClick={() => setLevel(p)} aria-pressed={level === p} className={`rounded-sm px-2.5 py-1 text-xs font-semibold tabular-nums ${level === p ? "bg-ink text-bg" : "border border-brass/40 text-ink-muted hover:bg-brass/15"}`}>{p}</button>
          ))}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-live="polite">
        {items.filter((i) => !i.hide).map((i) => (
          <div key={i.label} className="rounded-sm border border-brass/20 bg-bg/40 p-3">
            <dt className="text-xs text-ink-muted">{i.label}</dt>
            <dd className="font-display text-2xl font-black tabular-nums">{i.value}</dd>
            {i.delta !== undefined && level > 1 && i.delta !== 0 && <dd className="text-xs font-semibold tabular-nums text-sage-ink">+{fmtDec(i.delta)} desde el nivel 1</dd>}
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-muted">Aproximado: suma la mejora por nivel que da la API (vida, daño de bala y cuerpo a cuerpo, poder espiritual) de forma lineal. No incluye objetos ni mejoras de habilidades.</p>
    </div>
  );
}
