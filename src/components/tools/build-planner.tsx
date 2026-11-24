"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORY, Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/search-box";
import {
  CORE_ROWS, MAX_PER_CATEGORY, computeBuild, costSummary, describeEffects, encodeBuild, moveItem,
  type Category, type PlannerHero, type PlannerItem,
} from "@/lib/build-planner";

const CATS: Category[] = ["weapon", "vitality", "spirit"];
const nf = (n: number, digits: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
const souls = (n: number) => `${new Intl.NumberFormat("es-ES").format(n)} almas`;

// ---- Builds guardadas en localStorage (no hay base de datos propia) ----
type Saved = { id: string; name: string; hero: string; items: string[] };
const KEY = "saved-builds";
const readRaw = () => { try { return localStorage.getItem(KEY) ?? "[]"; } catch { return "[]"; } };
const writeSaved = (list: Saved[]) => {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* sin almacenamiento: no se guarda */ }
  window.dispatchEvent(new Event("saved-builds-changed"));
};
const subscribe = (cb: () => void) => {
  window.addEventListener("saved-builds-changed", cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener("saved-builds-changed", cb); window.removeEventListener("storage", cb); };
};

/**
 * Build planner. Cálculo APROXIMADO: suma las bonificaciones fijas de los objetos (ver `lib/build-planner.ts` para las fórmulas
 * y lo que no entra). El estado (héroe y objetos en orden de compra) vive en la URL, así que cualquier build se puede compartir.
 */
export function BuildPlanner({ heroes, items, initial }: { heroes: PlannerHero[]; items: PlannerItem[]; initial: { hero?: string; items: string[] } }) {
  const router = useRouter();
  const [heroSlug, setHeroSlug] = useState(initial.hero ?? heroes[0].slug);
  const [picked, setPicked] = useState<string[]>(initial.items);
  const [cat, setCat] = useState<Category>("weapon");
  const [tier, setTier] = useState("");
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const firstRender = useRef(true);

  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const saved = useMemo<Saved[]>(() => { try { return JSON.parse(raw); } catch { return []; } }, [raw]);

  // El estado se refleja en la URL (sin añadir entradas al historial) para poder compartirlo
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    router.replace(`/build-planner${picked.length || heroSlug ? `?${encodeBuild(heroSlug, picked)}` : ""}`, { scroll: false });
  }, [heroSlug, picked, router]);

  const hero = heroes.find((h) => h.slug === heroSlug) ?? heroes[0];
  const byClass = useMemo(() => new Map(items.map((i) => [i.c, i])), [items]);
  const chosen = picked.map((c) => byClass.get(c)).filter((i): i is PlannerItem => !!i);
  const counts = CATS.map((c) => chosen.filter((i) => i.cat === c).length);
  const cost = costSummary(chosen.map((i) => ({ cat: i.cat, cost: i.cost })));
  const rows = computeBuild(hero.base, chosen.map((i) => i.fx)).filter((r) => CORE_ROWS.has(r.key) || Math.abs(r.total - r.base) > 1e-9);
  const noBonuses = chosen.filter((i) => !i.innate);
  const unknown = chosen.reduce((a, i) => a + i.unknown, 0);

  const term = q.trim().toLowerCase();
  const list = items.filter((i) => i.cat === cat && (!tier || String(i.tier) === tier) && (!term || i.n.toLowerCase().includes(term))).sort((a, b) => a.tier - b.tier || a.n.localeCompare(b.n));
  const full = (c: Category) => chosen.filter((i) => i.cat === c).length >= MAX_PER_CATEGORY;

  const add = (c: string) => setPicked((p) => (p.includes(c) ? p : [...p, c]));
  const remove = (c: string) => setPicked((p) => p.filter((x) => x !== c));
  const save = () => {
    const n = name.trim() || `${hero.name} · ${picked.length} objetos`;
    writeSaved([...saved, { id: `${Date.now()}`, name: n.slice(0, 60), hero: heroSlug, items: picked }].slice(-30));
    setName("");
  };
  const load = (s: Saved) => { setHeroSlug(heroes.some((h) => h.slug === s.hero) ? s.hero : heroes[0].slug); setPicked(s.items.filter((c) => byClass.has(c))); };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
            Héroe
            <select value={heroSlug} onChange={(e) => setHeroSlug(e.target.value)} className="rounded-sm border border-brass/50 bg-surface px-3 py-2 text-sm text-ink focus-visible:border-brass">
              {heroes.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}
            </select>
          </label>
          <div role="tablist" aria-label="Categoría de objetos" className="flex flex-wrap gap-2">
            {CATS.map((c, i) => (
              <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${cat === c ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`}>
                {CATEGORY[c].label} <span className="text-xs opacity-80">{counts[i]}/{MAX_PER_CATEGORY}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-ink-muted">
              Buscar
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre del objeto" type="search" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
              Tier
              <select value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-sm border border-brass/50 bg-surface px-3 py-2 text-sm text-ink">
                <option value="">Todos</option>
                {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}
              </select>
            </label>
          </div>
        </Card>

        {full(cat) && <p role="status" className="rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 text-sm">Has llegado al máximo de {MAX_PER_CATEGORY} objetos de {CATEGORY[cat].label.toLowerCase()}. Quita uno para añadir otro.</p>}
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={`Objetos de ${CATEGORY[cat].label}`}>
          {list.map((i) => {
            const on = picked.includes(i.c);
            return (
              <li key={i.c} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-2.5 shadow-card">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{i.n}</p>
                  <p className="text-xs text-ink-muted">T{i.tier} · {souls(i.cost)}{i.active ? " · activo" : ""}</p>
                  <p className="truncate text-xs text-ink-muted">{describeEffects(i.fx) || "Sin bonificaciones fijas"}</p>
                </div>
                <Button variant={on ? "ghost" : "secondary"} onClick={() => (on ? remove(i.c) : add(i.c))} disabled={!on && full(i.cat)} aria-label={`${on ? "Quitar" : "Añadir"} ${i.n}`}>
                  {on ? "✓" : "+"}
                </Button>
              </li>
            );
          })}
          {list.length === 0 && <li className="col-span-full text-sm text-ink-muted">Ningún objeto coincide.</li>}
        </ul>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start" aria-label="Tu build">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-black">Orden de compra</h2>
            <Chip tone="apricot">aproximado</Chip>
          </div>
          {chosen.length === 0 ? (
            <p className="text-sm text-ink-muted">Añade objetos del listado para ver cómo cambian las estadísticas.</p>
          ) : (
            <ol className="space-y-1.5">
              {chosen.map((i, n) => (
                <li key={i.c} className="flex items-center gap-2 rounded-sm border border-brass/25 bg-bg px-2 py-1.5 text-sm">
                  <span className="w-5 text-right font-bold tabular-nums text-brass">{n + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{i.n}</span><span className="text-xs text-ink-muted">{souls(cost.steps[n])} acumuladas</span></span>
                  <button type="button" onClick={() => setPicked((p) => moveItem(p, n, -1))} disabled={n === 0} aria-label={`Subir ${i.n}`} className="rounded-sm px-1.5 py-1 hover:bg-brass/15 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => setPicked((p) => moveItem(p, n, 1))} disabled={n === chosen.length - 1} aria-label={`Bajar ${i.n}`} className="rounded-sm px-1.5 py-1 hover:bg-brass/15 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => remove(i.c)} aria-label={`Quitar ${i.n}`} className="rounded-sm px-1.5 py-1 hover:bg-brass/15">✕</button>
                </li>
              ))}
            </ol>
          )}
          <div className="grid grid-cols-3 gap-2 border-t border-brass/30 pt-3 text-center text-xs">
            {CATS.map((c) => <div key={c}><p className="font-semibold tabular-nums">{souls(cost.byCategory[c])}</p><p className="text-ink-muted">{CATEGORY[c].label}</p></div>)}
          </div>
          <p className="text-center font-display text-3xl font-black tabular-nums" aria-live="polite">{souls(cost.total)}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <CopyButton text={() => location.href} label="Copiar enlace" />
            <Button variant="ghost" onClick={() => setPicked([])} disabled={!picked.length}>Vaciar</Button>
          </div>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-display text-xl font-black">Estadísticas de {hero.name}</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-ink-muted"><th scope="col" className="py-1 font-semibold">Estadística</th><th scope="col" className="py-1 text-right font-semibold">Base</th><th scope="col" className="py-1 text-right font-semibold">Con la build</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const d = r.total - r.base;
                return (
                  <tr key={r.key} className="border-t border-brass/20">
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink-muted">{r.label}</th>
                    <td className="py-1.5 text-right tabular-nums">{r.base ? `${nf(r.base, r.digits)}${r.unit}` : "—"}</td>
                    <td className={`py-1.5 text-right font-semibold tabular-nums ${d > 1e-9 ? "text-sage-ink" : d < -1e-9 ? "text-rose-ink" : ""}`}>{nf(r.total, r.digits)}{r.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {noBonuses.length > 0 && <p className="text-xs text-ink-muted">Sin bonificaciones fijas (solo efectos activos o pasivos, que no se calculan): {noBonuses.map((i) => i.n).join(", ")}.</p>}
          {unknown > 0 && <p className="text-xs text-ink-muted">{unknown} {unknown === 1 ? "bonificación" : "bonificaciones"} sin interpretar (no se suman).</p>}
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer font-semibold text-ink">Cómo se calcula</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Solo se suman las bonificaciones fijas de cada objeto. No entran efectos activos o pasivos condicionales, mejoras de habilidades ni el escalado por nivel.</li>
              <li>Vida = (base + fija) × (1 + % de vida máxima). Daño por segundo = base × (1 + % daño de arma) × (1 + % cadencia).</li>
              <li>Las resistencias se apilan multiplicando: dos de 20 % dan 36 %, no 40 %.</li>
              <li>El máximo de {MAX_PER_CATEGORY} objetos por categoría sale de los datos del héroe y puede no coincidir con los huecos reales del juego.</li>
            </ul>
          </details>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-xl font-black">Builds guardadas</h2>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (opcional)" maxLength={60} aria-label="Nombre de la build" />
            <Button onClick={save} disabled={!picked.length}>Guardar</Button>
          </div>
          {saved.length === 0 ? (
            <p className="text-xs text-ink-muted">Se guardan en este navegador. Para compartirlas, copia el enlace.</p>
          ) : (
            <ul className="space-y-1.5">
              {saved.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-sm border border-brass/25 bg-bg px-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                  <button type="button" onClick={() => load(s)} className="rounded-sm px-2 py-1 text-xs font-semibold hover:bg-brass/15">Cargar</button>
                  <button type="button" onClick={() => writeSaved(saved.filter((x) => x.id !== s.id))} aria-label={`Borrar ${s.name}`} className="rounded-sm px-2 py-1 text-xs hover:bg-brass/15">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}
