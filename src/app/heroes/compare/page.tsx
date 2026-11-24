import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RadarChartBase } from "@/components/charts/charts";
import { CompareSelector } from "@/components/filters/compare-selector";
import { HeroPortrait } from "@/components/hero/hero-card";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";
import { normalizeAxis, pairRate, matchup } from "@/lib/analytics";
import { fmtDec, fmtNum, fmtPct } from "@/lib/format";
import { abilityStats } from "@/lib/item-sections";
import { HERO_STATS, heroTypeLabel, unitsToMeters } from "@/lib/labels";
import { getHeroAbilities, getHeroes, getItemIndex } from "@/lib/lookup";
import { loadCounters, loadHeroMeta, loadSynergy } from "@/lib/meta-data";
import { slugify } from "@/lib/slug";
import type { Hero, Item } from "@/lib/types";

export const metadata: Metadata = { title: "Comparar héroes", description: "Compara hasta tres héroes lado a lado: estadísticas, habilidades y meta." };

type Cmp = { hero: Hero; weapon: Item | undefined };
type Row = { label: string; get: (c: Cmp) => number | undefined; fmt: (n: number) => string; better: "high" | "low" };

const w = (k: string) => (c: Cmp) => c.weapon?.weapon_info?.[k];
const s = (k: string) => (c: Cmp) => c.hero.starting_stats[k]?.value;
const unit = (u: string, d = 0) => (n: number) => `${fmtDec(Number(n.toFixed(d)))}${u}`;

// `better`: en qué dirección es mejor el valor (la recarga, por ejemplo, cuanto menos mejor)
const ROWS: Row[] = [
  ...HERO_STATS.filter((r) => ["max_health", "base_health_regen", "max_move_speed", "sprint_speed", "stamina", "light_melee_damage", "heavy_melee_damage"].includes(r.key))
    .map<Row>((r) => ({ label: r.label, get: s(r.key), fmt: (n) => `${r.digits !== undefined ? fmtDec(Number(n.toFixed(r.digits))) : n}${r.unit ?? ""}`, better: "high" })),
  { label: "Daño por segundo", get: w("damage_per_second"), fmt: unit("", 1), better: "high" },
  { label: "Daño por bala", get: w("bullet_damage"), fmt: unit("", 1), better: "high" },
  { label: "Disparos por segundo", get: w("shots_per_second"), fmt: unit("", 1), better: "high" },
  { label: "Cargador", get: w("clip_size"), fmt: unit(""), better: "high" },
  { label: "Recarga", get: w("reload_duration"), fmt: unit(" s", 2), better: "low" },
  { label: "Alcance máximo", get: (c) => (c.weapon?.weapon_info?.range ? unitsToMeters(c.weapon.weapon_info.range) : undefined), fmt: unit(" m"), better: "high" },
];

// Ejes del radar: cada uno se normaliza (0-100) entre TODOS los héroes jugables. La "utilidad" no se puede medir con los datos.
const AXES: { axis: string; get: (c: Cmp) => number | undefined }[] = [
  { axis: "Vida", get: s("max_health") },
  { axis: "Velocidad", get: s("max_move_speed") },
  { axis: "Daño (DPS)", get: w("damage_per_second") },
  { axis: "Cadencia", get: w("shots_per_second") },
  { axis: "Cargador", get: w("clip_size") },
  { axis: "Alcance", get: w("range") },
];

function tone(value: number | undefined, all: (number | undefined)[], better: "high" | "low") {
  const v = all.filter((x): x is number => x !== undefined);
  if (value === undefined || new Set(v).size < 2) return "";
  const best = better === "high" ? Math.max(...v) : Math.min(...v);
  const worst = better === "high" ? Math.min(...v) : Math.max(...v);
  return value === best ? "font-bold text-sage-ink" : value === worst ? "text-rose-ink" : "";
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const { h = "" } = await searchParams;
  const heroes = await getHeroes();
  const sorted = [...heroes].sort((a, b) => a.name.localeCompare(b.name));
  const bySlug = new Map(sorted.map((x) => [slugify(x.name), x]));
  const slugs = [...new Set(h.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 3);
  const chosen = slugs.map((s) => bySlug.get(s)).filter((x): x is Hero => !!x);
  const options = sorted.map((x) => ({ value: slugify(x.name), label: x.name }));

  const selector = <Suspense fallback={null}><CompareSelector options={options} selected={chosen.map((c) => slugify(c.name))} /></Suspense>;
  const header = <PosterHeader compact title="Comparar" subtitle="Hasta tres héroes, lado a lado" />;

  if (chosen.length < 2) {
    return (
      <div className="space-y-8">
        {header}
        {selector}
        <p className="text-sm text-ink-muted">Elige al menos dos héroes para compararlos. {slugs.length > chosen.length && "Algún héroe del enlace no existe y se ha ignorado."}</p>
      </div>
    );
  }

  const { byClass } = await getItemIndex();
  const cmp = (x: Hero): Cmp => ({ hero: x, weapon: byClass.get(x.items.weapon_primary) });
  const cols = chosen.map(cmp);
  const everyone = heroes.map(cmp);

  const [abilities, meta, counters, synergy] = await Promise.all([
    Promise.all(chosen.map((x) => getHeroAbilities(x))),
    loadHeroMeta({}),
    loadCounters({}),
    loadSynergy({}),
  ]);
  const metaBy = meta.ok ? new Map(meta.data.rows.map((r) => [r.id, r])) : new Map();

  const radar = AXES.map((a) => {
    const all = everyone.map((c) => a.get(c) ?? 0);
    const row: Record<string, string | number> = { axis: a.axis };
    for (const c of cols) row[`h${c.hero.id}`] = normalizeAxis(a.get(c) ?? 0, all);
    return row;
  });

  const pairs = chosen.flatMap((a, i) => chosen.slice(i + 1).map((b) => [a, b] as const));
  const metaRows: { label: string; get: (id: number) => number | undefined; fmt: (n: number) => string }[] = [
    { label: "Win rate", get: (id) => metaBy.get(id)?.winRate, fmt: (n) => fmtPct(n) },
    { label: "Pick rate", get: (id) => metaBy.get(id)?.pickRate, fmt: (n) => fmtPct(n) },
    { label: "Ban rate", get: (id) => metaBy.get(id)?.banRate ?? undefined, fmt: (n) => fmtPct(n) },
    { label: "KDA", get: (id) => metaBy.get(id)?.kda, fmt: (n) => fmtDec(n) },
    { label: "Partidas", get: (id) => metaBy.get(id)?.matches, fmt: (n) => fmtNum(n) },
  ];

  const cell = "px-3 py-2 text-right tabular-nums";
  return (
    <div className="space-y-12">
      {header}
      {selector}

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${chosen.length}, minmax(0, 1fr))` }}>
        {chosen.map((x) => (
          <Link key={x.id} href={`/heroes/${slugify(x.name)}`} className="group space-y-2 rounded-md border border-brass/30 bg-surface p-3 text-center shadow-card transition-colors hover:bg-brass/10">
            <HeroPortrait hero={x} arch className="mx-auto h-32 w-28" />
            <p className="font-display text-xl font-black">{x.name}</p>
            <p className="text-xs text-ink-muted">{heroTypeLabel(x.hero_type)}{x.description.role ? ` · ${x.description.role}` : ""}</p>
          </Link>
        ))}
      </div>

      <section aria-labelledby="stats" className="space-y-4">
        <SectionTitle id="stats">Estadísticas base</SectionTitle>
        <div className="overflow-x-auto rounded-md border border-brass/30">
          <table className="w-full min-w-xl border-collapse text-sm">
            <thead className="bg-brass/10"><tr><th scope="col" className="px-3 py-2 text-left font-semibold">Estadística</th>{chosen.map((x) => <th key={x.id} scope="col" className="px-3 py-2 text-right font-semibold">{x.name}</th>)}</tr></thead>
            <tbody>
              {ROWS.map((r) => {
                const vals = cols.map(r.get);
                return (
                  <tr key={r.label} className="border-t border-brass/20">
                    <th scope="row" className="px-3 py-2 text-left font-normal text-ink-muted">{r.label}</th>
                    {vals.map((v, i) => <td key={i} className={`${cell} ${tone(v, vals, r.better)}`}>{v === undefined ? "—" : r.fmt(v)}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-muted">En verde el mejor valor de cada fila y en rojo el peor (la recarga es mejor cuanto menor). Si todos valen lo mismo no se resalta nada.</p>
      </section>

      <section aria-labelledby="radar" className="space-y-4">
        <SectionTitle id="radar">Perfil</SectionTitle>
        <Card>
          <RadarChartBase data={radar} series={chosen.map((x) => ({ key: `h${x.id}`, label: x.name }))} />
          <p className="mt-2 text-xs text-ink-muted">Cada eje va de 0 (el valor más bajo de todos los héroes) a 100 (el más alto): vida, velocidad de movimiento, daño por segundo, disparos por segundo, tamaño del cargador y alcance del arma. No hay eje de «utilidad» porque no se puede medir con los datos.</p>
        </Card>
      </section>

      <section aria-labelledby="abilities" className="space-y-4">
        <SectionTitle id="abilities">Habilidades</SectionTitle>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${chosen.length}, minmax(0, 1fr))` }}>
          {chosen.map((x, i) => (
            <div key={x.id} className="space-y-2">
              <h3 className="font-display text-lg font-black">{x.name}</h3>
              {abilities[i].map((a, n) => (
                <Card key={a.id} className="space-y-1 p-3">
                  <p className="font-semibold"><span className="text-brass">{n + 1}</span> {a.name}</p>
                  <p className="text-xs text-ink-muted">{abilityStats(a).slice(0, 3).map((st) => `${st.label} ${st.text}`).join(" · ") || "—"}</p>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="meta" className="space-y-4">
        <SectionTitle id="meta">Meta</SectionTitle>
        {!meta.ok ? <ErrorState title="No se han podido cargar las estadísticas" /> : (
          <div className="overflow-x-auto rounded-md border border-brass/30">
            <table className="w-full min-w-xl border-collapse text-sm">
              <thead className="bg-brass/10"><tr><th scope="col" className="px-3 py-2 text-left font-semibold">Dato</th>{chosen.map((x) => <th key={x.id} scope="col" className="px-3 py-2 text-right font-semibold">{x.name}</th>)}</tr></thead>
              <tbody>
                {metaRows.map((r) => {
                  const vals = chosen.map((x) => r.get(x.id));
                  return (
                    <tr key={r.label} className="border-t border-brass/20">
                      <th scope="row" className="px-3 py-2 text-left font-normal text-ink-muted">{r.label}</th>
                      {vals.map((v, i) => <td key={i} className={`${cell} ${r.label === "Partidas" ? "" : tone(v, vals, "high")}`}>{v === undefined ? "—" : r.fmt(v)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="h2h" className="space-y-4">
        <SectionTitle id="h2h">Cara a cara y sinergia</SectionTitle>
        {!counters.ok || !synergy.ok ? <ErrorState title="No se han podido cargar los enfrentamientos" /> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {pairs.map(([a, b]) => {
              const ab = matchup(counters.data, a.id, b.id);
              const ba = matchup(counters.data, b.id, a.id);
              const together = pairRate(synergy.data, a.id, b.id);
              return (
                <Card key={`${a.id}-${b.id}`} className="space-y-2">
                  <h3 className="font-display text-lg font-black">{a.name} y {b.name}</h3>
                  <p className="text-sm">{a.name} gana el <strong>{ab ? fmtPct(ab.rate) : "—"}</strong> de las veces contra {b.name} ({ba ? `${b.name}: ${fmtPct(ba.rate)}` : "sin datos"}).</p>
                  <p className="text-sm">Juntos en el mismo equipo ganan el <strong>{together ? fmtPct(together.rate) : "—"}</strong>{together ? ` (${fmtNum(together.matches)} partidas)` : ""}.</p>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
