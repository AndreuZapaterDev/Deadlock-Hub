"use client";
import { DURATIONS } from "@/lib/analytics-filters";
import { EMPTY_FILTERS, FROM_MINUTES, MATCH_MODES, TO_MINUTES, type FilterState } from "@/lib/map-filters";
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
  const set = (k: keyof FilterState) => (e: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...state, [k]: e.target.value });
  const active = chips.length > 0;

  return (
    <details open className="group rounded-md border border-brass/30 bg-panel shadow-card">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 text-sm font-semibold marker:content-none">
        <span aria-hidden className="text-brass transition-transform group-open:rotate-90">▸</span>
        <span className="font-display text-base font-black uppercase">Filtros del heatmap</span>
        {loading && <span role="status" className="ml-1 inline-flex items-center gap-1.5 text-xs font-normal text-ink-muted"><span aria-hidden className="size-2 animate-ping rounded-full bg-accent" />Actualizando…</span>}
        {!loading && active && <span className="ml-1 rounded-full bg-brass/20 px-2 py-0.5 text-xs">{chips.length} activo{chips.length === 1 ? "" : "s"}</span>}
      </summary>
      <div className="space-y-4 border-t border-brass/20 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Héroe">
            <Select value={state.hero} onChange={set("hero")}>
              <option value="">Todos los héroes</option>
              {heroes.map((h) => <option key={h.id} value={h.slug}>{h.name}</option>)}
            </Select>
          </Field>
          <Field label="Desde el minuto">
            <Select value={state.from} onChange={set("from")}>
              <option value="">Inicio de la partida</option>
              {FROM_MINUTES.filter((m) => m > 0).map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Hasta el minuto">
            <Select value={state.to} onChange={set("to")}>
              <option value="">Final de la partida</option>
              {TO_MINUTES.map((m) => <option key={m} value={m} disabled={state.from !== "" && m <= Number(state.from)}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Rango desde">
            <Select value={state.rank_min} onChange={set("rank_min")}>
              <option value="">Cualquiera</option>
              {ranks.map((r) => <option key={r.tier} value={r.tier}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Rango hasta">
            <Select value={state.rank_max} onChange={set("rank_max")}>
              <option value="">Cualquiera</option>
              {ranks.map((r) => <option key={r.tier} value={r.tier} disabled={state.rank_min !== "" && r.tier < Number(state.rank_min)}>{r.name}</option>)}
            </Select>
          </Field>
          <Field label="Parche">
            <Select value={state.since} onChange={set("since")}>
              <option value="">Últimos 30 días</option>
              {patches.map((d) => <option key={d} value={d}>Desde el parche del {d}</option>)}
            </Select>
          </Field>
          <Field label="Duración de la partida">
            <Select value={state.dur} onChange={set("dur")}>
              <option value="">Cualquiera</option>
              {Object.entries(DURATIONS).map(([v, d]) => <option key={v} value={v}>{d.label}</option>)}
            </Select>
          </Field>
          <Field label="Tipo de partida">
            <Select value={state.mode} onChange={set("mode")}>
              <option value="">Todas</option>
              {Object.entries(MATCH_MODES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {active ? chips.map((c) => <span key={c} className="rounded-full border border-brass/40 bg-brass/10 px-2.5 py-1">{c}</span>) : <span className="text-ink-muted">Sin filtros: todas las partidas de los últimos 30 días.</span>}
          {active && <button type="button" onClick={() => onChange(EMPTY_FILTERS)} className="ml-1 font-semibold text-teal-ink underline-offset-2 hover:underline">Quitar filtros</button>}
        </div>
      </div>
    </details>
  );
}
