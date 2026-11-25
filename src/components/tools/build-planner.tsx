"use client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORIES, Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/search-box";
import { Select } from "@/components/ui/select";
import {
  CORE_ROWS, MAX_PER_CATEGORY, computeBuild, costSummary, describeEffects, encodeBuild, moveItem,
  type Category, type PlannerHero, type PlannerItem,
} from "@/lib/build-planner";


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
  const t = useTranslations("planner");
  const tc = useTranslations("common");
  const tt = useTranslations("itemPage");
  const locale = useLocale();
  const nf = (n: number, digits: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  const souls = (n: number) => tt("souls", { count: new Intl.NumberFormat(locale).format(n) });
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
  const counts = CATEGORIES.map((c) => chosen.filter((i) => i.cat === c).length);
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
    const n = name.trim() || t("defaultName", { hero: hero.name, count: picked.length });
    writeSaved([...saved, { id: `${Date.now()}`, name: n.slice(0, 60), hero: heroSlug, items: picked }].slice(-30));
    setName("");
  };
  const load = (s: Saved) => { setHeroSlug(heroes.some((h) => h.slug === s.hero) ? s.hero : heroes[0].slug); setPicked(s.items.filter((c) => byClass.has(c))); };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="space-y-4">
        <Card className="space-y-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
            {t("hero")}
            <Select value={heroSlug} onChange={(e) => setHeroSlug(e.target.value)}>
              {heroes.map((h) => <option key={h.slug} value={h.slug}>{h.name}</option>)}
            </Select>
          </label>
          <div role="tablist" aria-label={t("categoryTabs")} className="flex flex-wrap gap-2">
            {CATEGORIES.map((c, i) => (
              <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${cat === c ? "border-brass bg-ink text-bg" : "border-brass/50 hover:bg-brass/15"}`}>
                {tc(c)} <span className="text-xs opacity-80">{counts[i]}/{MAX_PER_CATEGORY}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-ink-muted">
              {t("search")}
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchPlaceholder")} type="search" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink-muted">
              {t("tier")}
              <Select value={tier} onChange={(e) => setTier(e.target.value)}>
                <option value="">{t("allTiers")}</option>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{t("tierN", { n })}</option>)}
              </Select>
            </label>
          </div>
        </Card>

        {full(cat) && <p role="status" className="rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 text-sm">{t("maxReached", { max: MAX_PER_CATEGORY, category: tc(cat) })}</p>}
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label={t("itemsOf", { category: tc(cat) })}>
          {list.map((i) => {
            const on = picked.includes(i.c);
            return (
              <li key={i.c} className="flex items-center gap-3 rounded-md border border-brass/30 bg-surface p-2.5 shadow-card">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{i.n}</p>
                  <p className="text-xs text-ink-muted">{t("itemMeta", { tier: i.tier, souls: souls(i.cost), active: i.active ? t("activeSuffix") : "" })}</p>
                  <p className="truncate text-xs text-ink-muted">{describeEffects(i.fx, 3, (k) => t(`fx_${k}`)) || t("noFixed")}</p>
                </div>
                <Button variant={on ? "ghost" : "secondary"} onClick={() => (on ? remove(i.c) : add(i.c))} disabled={!on && full(i.cat)} aria-label={on ? t("removeItem", { name: i.n }) : t("addItem", { name: i.n })}>
                  {on ? "✓" : "+"}
                </Button>
              </li>
            );
          })}
          {list.length === 0 && <li className="col-span-full text-sm text-ink-muted">{t("noMatch")}</li>}
        </ul>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start" aria-label={t("yourBuild")}>
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-black">{t("buyOrder")}</h2>
            <Chip tone="apricot">{t("approx")}</Chip>
          </div>
          {chosen.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("addHint")}</p>
          ) : (
            <ol className="space-y-1.5">
              {chosen.map((i, n) => (
                <li key={i.c} className="flex items-center gap-2 rounded-sm border border-brass/25 bg-bg px-2 py-1.5 text-sm">
                  <span className="w-5 text-right font-bold tabular-nums text-brass">{n + 1}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{i.n}</span><span className="text-xs text-ink-muted">{t("accumulated", { souls: souls(cost.steps[n]) })}</span></span>
                  <button type="button" onClick={() => setPicked((p) => moveItem(p, n, -1))} disabled={n === 0} aria-label={t("moveUp", { name: i.n })} className="rounded-sm px-1.5 py-1 hover:bg-brass/15 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => setPicked((p) => moveItem(p, n, 1))} disabled={n === chosen.length - 1} aria-label={t("moveDown", { name: i.n })} className="rounded-sm px-1.5 py-1 hover:bg-brass/15 disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => remove(i.c)} aria-label={t("removeItem", { name: i.n })} className="rounded-sm px-1.5 py-1 hover:bg-brass/15">✕</button>
                </li>
              ))}
            </ol>
          )}
          <div className="grid grid-cols-3 gap-2 border-t border-brass/30 pt-3 text-center text-xs">
            {CATEGORIES.map((c) => <div key={c}><p className="font-semibold tabular-nums">{souls(cost.byCategory[c])}</p><p className="text-ink-muted">{tc(c)}</p></div>)}
          </div>
          <p className="text-center font-display text-3xl font-black tabular-nums" aria-live="polite">{souls(cost.total)}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <CopyButton text={() => location.href} label={t("copyLink")} />
            <Button variant="ghost" onClick={() => setPicked([])} disabled={!picked.length}>{t("clear")}</Button>
          </div>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-display text-xl font-black">{t("statsOf", { name: hero.name })}</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-ink-muted"><th scope="col" className="py-1 font-semibold">{t("colStat")}</th><th scope="col" className="py-1 text-right font-semibold">{t("colBase")}</th><th scope="col" className="py-1 text-right font-semibold">{t("colWithBuild")}</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const d = r.total - r.base;
                return (
                  <tr key={r.key} className="border-t border-brass/20">
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal text-ink-muted">{t(`row_${r.key}`)}</th>
                    <td className="py-1.5 text-right tabular-nums">{r.base ? `${nf(r.base, r.digits)}${r.unit}` : "—"}</td>
                    <td className={`py-1.5 text-right font-semibold tabular-nums ${d > 1e-9 ? "text-sage-ink" : d < -1e-9 ? "text-rose-ink" : ""}`}>{nf(r.total, r.digits)}{r.unit}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {noBonuses.length > 0 && <p className="text-xs text-ink-muted">{t("noBonuses", { names: noBonuses.map((i) => i.n).join(", ") })}</p>}
          {unknown > 0 && <p className="text-xs text-ink-muted">{t("unknown", { count: unknown })}</p>}
          <details className="text-xs text-ink-muted">
            <summary className="cursor-pointer font-semibold text-ink">{t("howCalc")}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>{t("calc1")}</li>
              <li>{t("calc2")}</li>
              <li>{t("calc3")}</li>
              <li>{t("calc4", { max: MAX_PER_CATEGORY })}</li>
            </ul>
          </details>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-xl font-black">{t("saved")}</h2>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} maxLength={60} aria-label={t("buildName")} />
            <Button onClick={save} disabled={!picked.length}>{t("save")}</Button>
          </div>
          {saved.length === 0 ? (
            <p className="text-xs text-ink-muted">{t("savedHint")}</p>
          ) : (
            <ul className="space-y-1.5">
              {saved.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-sm border border-brass/25 bg-bg px-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold">{s.name}</span>
                  <button type="button" onClick={() => load(s)} className="rounded-sm px-2 py-1 text-xs font-semibold hover:bg-brass/15">{t("load")}</button>
                  <button type="button" onClick={() => writeSaved(saved.filter((x) => x.id !== s.id))} aria-label={t("deleteSaved", { name: s.name })} className="rounded-sm px-2 py-1 text-xs hover:bg-brass/15">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}
