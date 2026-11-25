"use client";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { DURATIONS } from "@/lib/analytics-filters";
import { EMPTY_FILTERS, FROM_MINUTES, TO_MINUTES, type FilterState } from "@/lib/map-filters";
import { Select } from "@/components/ui/select";

export type HeroOption = { id: number; name: string; slug: string };
export type RankOption = { tier: number; name: string };


function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-ink-muted">
      {label}
      {children}
    </label>
  );
}

/**
 * Filtros del heatmap. Se aplican al instante (sin recargar la página) y viajan en la URL; los cambia quien llama con `onChange`.
 * `chips` = resumen de lo activo; `loading` = hay una consulta en marcha.
 */
export function MapFilterPanel({ state, onChange, heroes, ranks, patches, chips, loading }: {
  state: FilterState;
  onChange: (next: FilterState) => void;
  heroes: HeroOption[];
  ranks: RankOption[];
  patches: string[];
  chips: string[];
  loading: boolean;
}) {
  const t = useTranslations("mapUi");
  const ta = useTranslations("analytics");
  const set = (k: keyof FilterState) => (e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...state, [k]: e.target.value });
  const active = chips.length > 0;
  const details = useRef<HTMLDetailsElement>(null);
  // En móvil el panel empieza plegado: si no, los filtros ocupan toda la pantalla antes de ver el mapa.
  useEffect(() => { if (window.matchMedia("(max-width: 639px)").matches && details.current) details.current.open = false; }, []);

  return (
    <details ref={details} open className="group rounded-md border border-brass/30 bg-panel shadow-card">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 text-sm font-semibold marker:content-none">
        <span aria-hidden className="text-brass transition-transform group-open:rotate-90">▸</span>
        <span className="font-display text-base font-black uppercase">{t("filtersTitle")}</span>
        {loading && <span role="status" className="ml-1 inline-flex items-center gap-1.5 text-xs font-normal text-ink-muted"><span aria-hidden className="size-2 animate-ping rounded-full bg-accent" />{t("updating")}</span>}
        {!loading && active && <span className="ml-1 rounded-full bg-brass/20 px-2 py-0.5 text-xs">{t("activeCount", { count: chips.length })}</span>}
      </summary>
      <div className="space-y-4 border-t border-brass/20 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label={t("fHero")}>
            <Select value={state.hero} onChange={set("hero")}>
              <option value="">{t("fAllHeroes")}</option>
              {heroes.map((h) => <option key={h.id} value={h.slug}>{h.name}</option>)}
            </Select>
          </Field>
          <Field label={t("fFromMin")}>
            <Select value={state.from} onChange={set("from")}>
              <option value="">{t("fStart")}</option>
              {FROM_MINUTES.filter((m) => m > 0).map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label={t("fToMin")}>
            <Select value={state.to} onChange={set("to")}>
              <option value="">{t("fEnd")}</option>
              {TO_MINUTES.map((m) => <option key={m} value={m} disabled={state.from !== "" && m <= Number(state.from)}>{m}</option>)}
            </Select>
          </Field>
          <Field label={t("fRankFrom")}>
            <Select value={state.rank_min} onChange={set("rank_min")}>
              <option value="">{t("fAny")}</option>
              {ranks.map((r) => <option key={r.tier} value={r.tier}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label={t("fRankTo")}>
            <Select value={state.rank_max} onChange={set("rank_max")}>
              <option value="">{t("fAny")}</option>
              {ranks.map((r) => <option key={r.tier} value={r.tier} disabled={state.rank_min !== "" && r.tier < Number(state.rank_min)}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label={t("fPatch")}>
            <Select value={state.since} onChange={set("since")}>
              <option value="">{t("fLast30")}</option>
              {patches.map((d) => <option key={d} value={d}>{t("fSincePatch", { date: d })}</option>)}
            </Select>
          </Field>
          <Field label={t("fDuration")}>
            <Select value={state.dur} onChange={set("dur")}>
              <option value="">{t("fAny")}</option>
              {Object.entries(DURATIONS).map(([v, d]) => <option key={v} value={v}>{ta(d.key)}</option>)}
            </Select>
          </Field>
          <Field label={t("fMode")}>
            <Select value={state.mode} onChange={set("mode")}>
              <option value="">{t("fAll")}</option>
              {(["ranked", "unranked"] as const).map((v) => <option key={v} value={v}>{t(v === "ranked" ? "modeRanked" : "modeUnranked")}</option>)}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {active ? chips.map((c) => <span key={c} className="rounded-full border border-brass/40 bg-brass/10 px-2.5 py-1">{c}</span>) : <span className="text-ink-muted">{t("noFilters")}</span>}
          {active && <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="ml-1 font-semibold text-teal-ink underline-offset-2 hover:underline">{t("clearFilters")}</button>}
        </div>
      </div>
    </details>
  );
}
