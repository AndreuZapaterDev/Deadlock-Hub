"use client";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { fmtDec, fmtNum } from "@/lib/format";
import type { LevelStats } from "@/lib/hero-stats";

const PRESETS = [1, 5, 10, 15, 20, 25, 30, 36];

/**
 * Calculadora de nivel: cómo crece el héroe al subir de nivel (solo con las mejoras por nivel; sin objetos ni mejoras de
 * habilidades). Recibe las 36 filas ya calculadas en el servidor: el navegador no necesita los datos del héroe.
 */
export function LevelCalculator({ rows, hasWeapon }: { rows: LevelStats[]; hasWeapon: boolean }) {
  const t = useTranslations("heroUi");
  const id = useId();
  const [level, setLevel] = useState(1);
  const max = rows.length;
  const cur = rows[Math.min(level, max) - 1];
  const base = rows[0];

  const items: { label: string; value: string; delta?: number; hide?: boolean }[] = [
    { label: t("souls"), value: fmtNum(cur.souls) },
    { label: t("health"), value: fmtNum(Math.round(cur.health)), delta: cur.health - base.health },
    { label: t("bulletDamage"), value: fmtDec(cur.bulletDamage), delta: cur.bulletDamage - base.bulletDamage, hide: !hasWeapon },
    { label: t("dps"), value: fmtDec(cur.dps), delta: cur.dps - base.dps, hide: !hasWeapon },
    { label: t("melee"), value: fmtDec(cur.melee), delta: cur.melee - base.melee },
    { label: t("spiritPower"), value: fmtDec(cur.spiritPower), delta: cur.spiritPower - base.spiritPower, hide: cur.spiritPower === 0 && max > 1 && rows[max - 1].spiritPower === 0 },
  ];

  return (
    <div className="space-y-5 rounded-md border border-brass/30 bg-surface bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--brass)_10%,transparent),transparent_40%)] p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-4">
        <label htmlFor={id} className="font-display text-lg font-black uppercase">{t("level")} <span className="tabular-nums text-brass">{level}</span></label>
        <input id={id} type="range" min={1} max={max} step={1} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="min-w-48 flex-1 accent-[var(--brass)]" aria-valuetext={t("levelAria", { level })} />
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("quickLevels")}>
          {PRESETS.filter((p) => p <= max).map((p) => (
            <button key={p} type="button" onClick={() => setLevel(p)} aria-pressed={level === p} className={`rounded-sm px-2.5 py-1 text-xs font-semibold tabular-nums ${level === p ? "bg-ink text-bg" : "border border-brass/40 text-ink-muted hover:bg-brass/15"}`}>{p}</button>
          ))}
        </div>
      </div>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-brass/15"><div className="h-full rounded-full bg-brass transition-[width] duration-200" style={{ width: `${((level - 1) / Math.max(1, max - 1)) * 100}%` }} /></div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-live="polite">
        {items.filter((i) => !i.hide).map((i) => (
          <div key={i.label} className="rounded-sm border-l-2 border-brass bg-bg/40 p-3">
            <dt className="text-xs text-ink-muted">{i.label}</dt>
            <dd className="font-display text-2xl font-black tabular-nums">{i.value}</dd>
            {i.delta !== undefined && level > 1 && i.delta !== 0 && <dd className="text-xs font-semibold tabular-nums text-sage-ink">{t("sinceLevel1", { delta: fmtDec(i.delta) })}</dd>}
          </div>
        ))}
      </dl>
      <p className="text-xs text-ink-muted">{t("calcNote")}</p>
    </div>
  );
}
