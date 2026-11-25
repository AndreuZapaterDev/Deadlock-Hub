"use client";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { fmtNum } from "@/lib/format";
import {
  BASE_LAYERS, DEFAULT_LAYERS, ENTITY_KINDS, heatRange, heatStats, intensity, layersToParam,
  type HeatCell, type MapCamp, type MapObjective, type MapScene, type SceneEntity, type Shape,
} from "@/lib/map";
import { describeMapFilters, FILTER_KEYS, stateToFilters, toHeatSearch, type FilterState } from "@/lib/map-filters";
import { MapSearch, MiniMap, type SearchItem } from "./map-extras";
import { MapFilterPanel, type HeroOption, type RankOption } from "./map-filter-panel";
import { MAP_SIZE, usePanZoom } from "./use-pan-zoom";

const S = MAP_SIZE;
const TEAM_COLOR = ["var(--sage)", "var(--rose)"] as const;
const KIND = new Map(ENTITY_KINDS.map((e) => [e.key, e]));
const LABEL_ZOOM = 3; // a partir de este zoom se escriben los nombres junto a los símbolos
type HeatMode = "deaths" | "kills";
type Selected = { type: "objective"; o: MapObjective } | { type: "camp"; c: MapCamp } | { type: "entity"; e: SceneEntity } | null;
type Tip = { x: number; y: number; w: number; title: string; sub?: string } | null;
type HeatState = { key: string; kind: "ok"; cells: HeatCell[]; grid: number } | { key: string; kind: "error"; status: number };

/** Símbolo del mapa (centrado en x, y; `s` = tamaño; `sw` = grosor del borde). */
function Mark({ shape, x, y, s, fill, sw }: { shape: Shape; x: number; y: number; s: number; fill: string; sw: number }) {
  const h = s / 2;
  const common = { fill, stroke: "var(--night)", strokeWidth: sw, strokeLinejoin: "round" as const };
  switch (shape) {
    case "ring":
      return <circle cx={x} cy={y} r={h} fill="none" stroke={fill} strokeWidth={s * 0.3} />;
    case "square":
      return <rect x={x - h} y={y - h} width={s} height={s} {...common} />;
    case "diamond":
      return <rect x={x - h * 0.85} y={y - h * 0.85} width={s * 0.85} height={s * 0.85} transform={`rotate(45 ${x} ${y})`} {...common} />;
    case "triangle":
      return <polygon points={`${x},${y - h} ${x + h},${y + h * 0.8} ${x - h},${y + h * 0.8}`} {...common} />;
    case "cross":
      return <path d={`M${x - h * 0.3} ${y - h}h${h * 0.6}v${h * 0.7}h${h * 0.7}v${h * 0.6}h${-h * 0.7}v${h * 0.7}h${-h * 0.6}v${-h * 0.7}h${-h * 0.7}v${-h * 0.6}h${h * 0.7}z`} {...common} />;
    case "star": {
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 ? h * 0.45 : h;
        return `${x + Math.cos(a) * r},${y + Math.sin(a) * r}`;
      }).join(" ");
      return <polygon points={pts} {...common} />;
    }
    default:
      return <circle cx={x} cy={y} r={h * 0.8} {...common} />;
  }
}

const Icon = ({ d }: { d: string }) => (
  <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const btn = "inline-flex size-9 items-center justify-center rounded-sm border border-brass/50 bg-surface text-ink hover:bg-brass/15 focus-visible:border-brass";
const CAMP_KINDS = ["vault", "strong", "medium", "weak"];

/**
 * Mapa interactivo (SVG propio, sin librerías): minimapa real con zoom (rueda, botones, pellizco, teclado), arrastre y minivista;
 * capas de objetivos, campamentos, tirolinas, túneles, tiendas, teletransportadores, urnas y botín; buscador de lugares; tooltips y
 * ficha; y heatmap de kills/muertes con filtros reales (héroe, minutos, rango, parche, duración, tipo de partida).
 * Todo —capas, filtros, zoom y posición— viaja en la URL, así que cualquier vista se puede compartir.
 */
export function MapView({ scene, heroes, ranks, patches, initialLayers, initialFilters, initialView }: {
  scene: MapScene;
  heroes: HeroOption[];
  ranks: RankOption[];
  patches: string[];
  initialLayers: string[];
  initialFilters: FilterState;
  initialView?: { k: number; cx: number; cy: number };
}) {
  const t = useTranslations("mapUi");
  const ta = useTranslations("analytics");
  const tu = useTranslations("heroUi");
  const teamName = (n: number) => t(n === 0 ? "teamA" : "teamB");
  const objLabel = (k: string) => t(`obj_${k}`);
  const campLabel = (k: string) => (CAMP_KINDS.includes(k) ? t(`camp_${k}`) : k);
  const shopLabel = (e: SceneEntity) => (e.team !== undefined ? t("shopTeam", { team: teamName(e.team) }) : t("shop"));
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const overMarker = useRef(false);
  const { view, dragging, toMap, onPointerDown, wasDragged, zoomBy, reset, focus } = usePanZoom(svgRef, initialView);

  const [layers, setLayers] = useState(() => new Set(initialLayers));
  const [filters, setFilters] = useState(initialFilters);
  const [mode, setMode] = useState<HeatMode>("deaths");
  const [heatOpacity, setHeatOpacity] = useState(0.85);
  const [sel, setSel] = useState<Selected>(null);
  const [tip, setTip] = useState<Tip>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [res, setRes] = useState<HeatState | null>(null);
  const [heatMask, setHeatMask] = useState<string | null>(null);
  const cache = useRef(new Map<string, HeatState>());
  const on = (id: string) => layers.has(id);

  // ---------- Filtros → heatmap ----------
  const heroById = useMemo(() => new Map(heroes.map((h) => [h.slug, h])), [heroes]);
  const parsed = useMemo(() => stateToFilters(filters, (slug) => heroById.get(slug)?.id), [filters, heroById]);
  const key = toHeatSearch(parsed);
  const tierName = (n: number) => ranks.find((r) => r.tier === n)?.name ?? tu("rankFallback", { tier: n });
  const chips = describeMapFilters(parsed, { hero: heroes.find((h) => h.id === parsed.hero)?.name, tier: tierName }, t, ta);

  useEffect(() => {
    // Ya pedido antes con estos filtros: se reutiliza (el estado se aplica en el siguiente fotograma, no dentro del efecto).
    const cached = cache.current.get(key);
    if (cached) {
      const id = requestAnimationFrame(() => setRes(cached));
      return () => cancelAnimationFrame(id);
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/map/heat?${key}`, { signal: ctrl.signal });
        const j = (await r.json()) as { ok: boolean; cells?: HeatCell[]; grid?: number; status?: number };
        const next: HeatState = j.ok && j.cells ? { key, kind: "ok", cells: j.cells, grid: j.grid ?? 64 } : { key, kind: "error", status: j.status ?? r.status };
        if (next.kind === "ok") cache.current.set(key, next);
        setRes(next);
      } catch {
        if (!ctrl.signal.aborted) setRes({ key, kind: "error", status: 0 });
      }
    }, 300); // al cambiar varios filtros seguidos solo se pide el último
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [key, retry]);

  const loading = res?.key !== key;
  const failed = res?.key === key && res.kind === "error";
  const heat = useMemo(() => (res?.kind === "ok" ? res.cells : []), [res]);
  const grid = res?.kind === "ok" ? res.grid : 64;
  const empty = res?.key === key && res.kind === "ok" && res.cells.length === 0;
  const totals = useMemo(() => heatStats(heat), [heat]);
  const range = useMemo(() => heatRange(heat.map((c) => c[mode])), [heat, mode]);
  const heatByCell = useMemo(() => new Map(heat.map((c) => [c.row * grid + c.col, c])), [heat, grid]);

  // El heatmap se dibuja en un canvas de grid×grid píxeles (alfa = intensidad) y se escala con interpolación: queda suave a
  // cualquier zoom y pesa muchísimo menos que miles de formas SVG. El color lo pone una máscara SVG con el token del tema.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (!heat.length) return setHeatMask(null);
      const small = document.createElement("canvas");
      small.width = small.height = grid;
      const sctx = small.getContext("2d");
      if (!sctx) return setHeatMask(null);
      const img = sctx.createImageData(grid, grid);
      for (const c of heat) {
        const v = intensity(c[mode], range.lo, range.hi);
        const i = (c.row * grid + c.col) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(255 * v);
      }
      sctx.putImageData(img, 0, 0);
      const big = document.createElement("canvas");
      big.width = big.height = 512;
      const bctx = big.getContext("2d");
      if (!bctx) return setHeatMask(null);
      bctx.imageSmoothingEnabled = true;
      bctx.imageSmoothingQuality = "high";
      bctx.filter = "blur(3px)";
      bctx.drawImage(small, 0, 0, 512, 512);
      setHeatMask(big.toDataURL());
    });
    return () => cancelAnimationFrame(id);
  }, [heat, grid, mode, range]);

  // ---------- URL: capas, filtros y vista (sin recargar la página ni volver a pedir datos al servidor) ----------
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
      set("capas", layersToParam([...layers]));
      for (const k of FILTER_KEYS) set(k, filters[k] || null);
      const zoomed = view.k > 1.05;
      set("z", zoomed ? view.k.toFixed(1) : null);
      set("cx", zoomed ? ((S / 2 - view.x) / (view.k * S)).toFixed(3) : null);
      set("cy", zoomed ? ((S / 2 - view.y) / (view.k * S)).toFixed(3) : null);
      window.history.replaceState(null, "", url);
    }, 250);
    return () => clearTimeout(timer);
  }, [layers, filters, view]);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---------- Datos derivados de la escena ----------
  const byKind = useMemo(() => {
    const m = new Map<string, SceneEntity[]>();
    for (const e of scene.entities) m.set(e.kind, [...(m.get(e.kind) ?? []), e]);
    return m;
  }, [scene.entities]);

  const k = view.k;
  const px = (base: number) => base / Math.pow(k, 0.6); // los marcadores crecen algo con el zoom, pero no tanto como el mapa
  const sw = (base: number) => base / k;
  const showLabels = k >= LABEL_ZOOM;

  const enable = (...ids: string[]) => setLayers((l) => new Set([...l, ...ids]));
  const toggle = (id: string) => setLayers((l) => { const n = new Set(l); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setMany = (ids: string[]) => setLayers(new Set(ids));

  const searchItems = useMemo<SearchItem[]>(() => {
    const out: SearchItem[] = [];
    for (const o of scene.objectives) out.push({ id: o.key, label: `${o.npcName ?? objLabel(o.kind)} · ${teamName(o.team)}`, sub: `${objLabel(o.kind)}${o.lane ? ` · ${t("lane", { n: o.lane })}` : ""}`, left: o.left, top: o.top, pick: () => { enable("objectives"); setSel({ type: "objective", o }); focus(o.left, o.top, 5); } });
    for (const c of scene.camps) out.push({ id: c.name, label: c.name.replaceAll("_", " "), sub: campLabel(c.kind), left: c.left, top: c.top, pick: () => { enable("camps"); setSel({ type: "camp", c }); focus(c.left, c.top, 5); } });
    for (const def of ENTITY_KINDS) {
      const list = byKind.get(def.key) ?? [];
      if (list.length > 20) continue; // lo abundante (cajas, estatuas…) llenaría los resultados
      for (const e of list) out.push({ id: e.id, label: def.key === "shops" ? shopLabel(e) : t(`ent_${def.key}`), sub: t(`grp_${def.group}`), left: e.left, top: e.top, pick: () => { enable(def.key); setSel({ type: "entity", e }); focus(e.left, e.top, 5); } });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, byKind]);

  // ---------- Interacción ----------
  const showTip = (e: React.PointerEvent, title: string, sub?: string) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setTip({ x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, title, sub });
  };
  const markerProps = (title: string, sub: string | undefined, select: () => void, focusable?: boolean) => ({
    onPointerEnter: (e: React.PointerEvent) => { overMarker.current = true; showTip(e, title, sub); },
    onPointerMove: (e: React.PointerEvent) => showTip(e, title, sub),
    onPointerLeave: () => { overMarker.current = false; setTip(null); },
    onClick: (e: React.MouseEvent) => { e.stopPropagation(); if (!wasDragged()) select(); },
    ...(focusable ? { role: "button", tabIndex: 0, "aria-label": title, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } } } : { "aria-hidden": true as const }),
  });

  const onSvgMove = (e: React.PointerEvent) => {
    if (overMarker.current || dragging || !on("heat") || !heat.length) return;
    const p = toMap(e.clientX, e.clientY);
    const c = p.left >= 0 && p.left < 1 && p.top >= 0 && p.top < 1 ? heatByCell.get(Math.floor(p.top * grid) * grid + Math.floor(p.left * grid)) : undefined;
    if (c) showTip(e, t("heatTip", { deaths: fmtNum(c.deaths), kills: fmtNum(c.kills) }), t("heatZone"));
    else setTip(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "+" || e.key === "=") zoomBy(1.4);
    else if (e.key === "-") zoomBy(1 / 1.4);
    else if (e.key === "0") reset();
    else return;
    e.preventDefault();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  const selected: { left: number; top: number } | null = sel?.type === "objective" ? sel.o : sel?.type === "camp" ? sel.c : sel?.type === "entity" ? sel.e : null;
  const mapCursor = dragging ? "cursor-grabbing" : k > 1 ? "cursor-grab" : "cursor-default";
  const label = (x: number, y: number, text: string, key: string, color = "var(--cream)") => (
    <text key={key} aria-hidden x={x} y={y} textAnchor="middle" fontSize={px(10.5)} fill={color} stroke="var(--night)" strokeWidth={sw(3)} paintOrder="stroke" className="pointer-events-none font-sans font-semibold">{text}</text>
  );

  return (
    <div ref={rootRef} className={`space-y-5 ${fullscreen ? "overflow-auto bg-bg p-4" : ""}`}>
      <MapFilterPanel state={filters} onChange={setFilters} heroes={heroes} ranks={ranks} patches={patches} chips={chips} loading={loading && !failed} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("toolbar")}>
            <button type="button" className={btn} onClick={() => zoomBy(1.4)} aria-label={t("zoomIn")} title={t("zoomInTitle")}><Icon d="M12 5v14M5 12h14" /></button>
            <button type="button" className={btn} onClick={() => zoomBy(1 / 1.4)} aria-label={t("zoomOut")} title={t("zoomOutTitle")}><Icon d="M5 12h14" /></button>
            <button type="button" className={btn} onClick={reset} aria-label={t("resetView")} title={t("resetViewTitle")}><Icon d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></button>
            <button type="button" className={btn} onClick={toggleFullscreen} aria-pressed={fullscreen} aria-label={t("fullscreen")} title={t("fullscreen")}><Icon d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></button>
            <span className="ml-1 text-xs tabular-nums text-ink-muted" aria-live="polite">×{k.toFixed(1)}</span>
            {on("heat") && (
              <div role="group" aria-label={t("heatWhat")} className="ml-auto flex gap-1 text-sm">
                {(["deaths", "kills"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
                    className={`rounded-sm px-3 py-1.5 font-semibold ${mode === m ? "bg-accent text-on-accent" : "text-ink-muted hover:bg-brass/10"}`}>
                    {m === "deaths" ? t("deaths") : t("kills")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="stepped bg-brass p-px shadow-card">
            <div ref={wrapRef} className="relative mx-auto w-full max-w-[min(100%,82vh)] bg-night">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${S} ${S}`}
                role="application"
                tabIndex={0}
                aria-label={t("mapAria")}
                className={`block w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-brass ${mapCursor}`}
                onPointerDown={onPointerDown}
                onPointerMove={onSvgMove}
                onPointerLeave={() => { if (!overMarker.current) setTip(null); }}
                onClick={() => { if (!wasDragged()) setSel(null); }}
                onKeyDown={onKeyDown}
              >
                <g transform={`translate(${view.x} ${view.y}) scale(${k})`}>
                  {scene.images.minimap ? (
                    <image href={scene.images.minimap} width={S} height={S} opacity={0.9} />
                  ) : (
                    <g aria-hidden stroke="var(--cream-muted)" strokeOpacity={0.12} strokeWidth={1 / k}>
                      {Array.from({ length: 9 }, (_, i) => (i + 1) * 100).map((p) => (<g key={p}><line x1={p} y1={0} x2={p} y2={S} /><line x1={0} y1={p} x2={S} y2={p} /></g>))}
                    </g>
                  )}
                  {on("tunnels") && scene.images.tunnels && <image href={scene.images.tunnels} width={S} height={S} opacity={0.7} />}
                  {on("rats") && scene.images.rats && <image href={scene.images.rats} width={S} height={S} opacity={0.7} />}

                  {on("heat") && heatMask && (
                    <g aria-hidden style={{ opacity: loading ? 0.45 : 1, transition: "opacity .2s" }}>
                      <mask id="heat-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={S} height={S}>
                        <image href={heatMask} width={S} height={S} />
                      </mask>
                      <rect width={S} height={S} fill={mode === "deaths" ? "var(--rose)" : "var(--sage)"} mask="url(#heat-mask)" opacity={0.25 + heatOpacity * 0.7} />
                    </g>
                  )}

                  {on("zip") && scene.zips.map((z, i) => (
                    <g key={i} aria-hidden fill="none" stroke={z.color} strokeWidth={sw(2.2)} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}>
                      {z.paths.map((p, j) => <polyline key={j} points={p.map(([l, t]) => `${l * S},${t * S}`).join(" ")} />)}
                    </g>
                  ))}

                  {on("teleporters") && (byKind.get("teleporters") ?? []).map((e) => e.target && (
                    <line key={`l-${e.id}`} aria-hidden x1={e.left * S} y1={e.top * S} x2={e.target.left * S} y2={e.target.top * S} stroke="var(--teal)" strokeWidth={sw(1.4)} strokeDasharray={`${sw(6)} ${sw(5)}`} opacity={0.7} />
                  ))}
                  {sel?.type === "entity" && sel.e.target && (
                    <line aria-hidden x1={sel.e.left * S} y1={sel.e.top * S} x2={sel.e.target.left * S} y2={sel.e.target.top * S} stroke="var(--brass)" strokeWidth={sw(2)} strokeDasharray={`${sw(6)} ${sw(4)}`} />
                  )}

                  {ENTITY_KINDS.map((def) => on(def.key) && (byKind.get(def.key) ?? []).map((e) => {
                    const team = e.team === 0 || e.team === 1 ? TEAM_COLOR[e.team] : undefined;
                    const title = def.key === "shops" ? shopLabel(e) : t(`ent_${def.key}`);
                    return (
                      <g key={e.id} className="cursor-pointer" {...markerProps(title, t(`grp_${def.group}`), () => setSel({ type: "entity", e }))}>
                        <Mark shape={def.shape} x={e.left * S} y={e.top * S} s={px(def.key === "crates" || def.key === "steam_vents" || def.key === "cosmic_veils" ? 7 : 11)} fill={team ?? def.color} sw={sw(1.6)} />
                      </g>
                    );
                  }))}

                  {on("camps") && scene.camps.map((c) => (
                    <g key={c.name} className="cursor-pointer" {...markerProps(campLabel(c.kind), c.name.replaceAll("_", " "), () => setSel({ type: "camp", c }))}>
                      <Mark shape="dot" x={c.left * S} y={c.top * S} s={px(c.kind === "vault" ? 15 : c.kind === "strong" ? 13 : c.kind === "medium" ? 11 : 9)} fill={c.kind === "vault" ? "var(--brass)" : "var(--apricot)"} sw={sw(2)} />
                    </g>
                  ))}

                  {on("objectives") && scene.objectives.map((o) => {
                    const big = o.kind === "core" || o.kind === "titan";
                    const size = px(big ? 24 : o.kind === "tier2" ? 19 : 15);
                    return (
                      <g key={o.key} className="cursor-pointer outline-none focus-visible:[&>*]:stroke-brass" {...markerProps(`${objLabel(o.kind)} · ${teamName(o.team)}`, o.lane ? t("laneCap", { n: o.lane }) : undefined, () => setSel({ type: "objective", o }), true)}>
                        <Mark shape={big ? "star" : "diamond"} x={o.left * S} y={o.top * S} s={size} fill={TEAM_COLOR[o.team]} sw={sw(2.5)} />
                      </g>
                    );
                  })}

                  {on("objectives") && scene.objectives.filter((o) => o.kind === "core").map((o) => (
                    <text key={`t-${o.key}`} aria-hidden x={o.left * S + (o.team === 0 ? px(20) : -px(20))} y={o.top * S + (o.top > 0.5 ? -px(14) : px(26))} textAnchor={o.team === 0 ? "start" : "end"} fontSize={px(15)} fontWeight={800} fill={TEAM_COLOR[o.team]} stroke="var(--night)" strokeWidth={sw(4)} paintOrder="stroke" className="font-display">
                      {t("baseLabel", { team: o.team === 0 ? "A" : "B" })}
                    </text>
                  ))}

                  {/* Con zoom se escriben los nombres de lo más importante junto a su símbolo. */}
                  {showLabels && on("camps") && scene.camps.map((c) => label(c.left * S, c.top * S + px(20), c.name.replaceAll("_", " "), `lc-${c.name}`, "var(--apricot)"))}
                  {showLabels && on("objectives") && scene.objectives.filter((o) => o.kind !== "core").map((o) => label(o.left * S, o.top * S + px(24), `${objLabel(o.kind)}${o.lane ? ` ${o.lane}` : ""}`, `lo-${o.key}`, TEAM_COLOR[o.team]))}
                  {showLabels && on("shops") && (byKind.get("shops") ?? []).map((e) => label(e.left * S, e.top * S + px(20), shopLabel(e), `ls-${e.id}`, "var(--brass)"))}

                  {selected && <circle aria-hidden cx={selected.left * S} cy={selected.top * S} r={px(20)} fill="none" stroke="var(--brass)" strokeWidth={sw(2.5)} strokeDasharray={`${sw(5)} ${sw(4)}`} />}
                </g>
              </svg>

              {k > 1.3 && <MiniMap view={view} image={scene.images.minimap} onJump={(l, t) => focus(l, t, k)} />}

              {/* Estado del heatmap: cargando, sin datos o error con reintento. */}
              {on("heat") && loading && !failed && (
                <div role="status" className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-sm border border-brass/60 bg-surface/95 px-3 py-1.5 text-xs shadow-card">
                  <span aria-hidden className="size-2.5 animate-ping rounded-full bg-accent" />
                  {res ? t("heatUpdating") : t("heatLoading")}
                </div>
              )}
              {on("heat") && failed && (
                <div role="alert" className="absolute left-3 top-3 z-10 flex max-w-[85%] flex-wrap items-center gap-2 rounded-sm border border-rose bg-surface/95 px-3 py-2 text-xs shadow-card">
                  <span>{t("heatTooSlow", { status: res?.kind === "error" && res.status ? t("errorStatus", { status: res.status }) : "" })}</span>
                  <button type="button" onClick={() => setRetry((n) => n + 1)} className="rounded-sm border border-brass px-2 py-1 font-semibold hover:bg-brass/15">{t("retry")}</button>
                </div>
              )}
              {on("heat") && empty && (
                <div role="status" className="absolute left-3 top-3 z-10 rounded-sm border border-brass/60 bg-surface/95 px-3 py-1.5 text-xs shadow-card">{t("heatEmpty")}</div>
              )}

              {tip && (
                <div role="tooltip" className="pointer-events-none absolute z-20 max-w-56 rounded-sm border border-brass/60 bg-surface px-2.5 py-1.5 text-xs shadow-card" style={{ left: Math.max(0, Math.min(tip.x + 14, tip.w - 170)), top: Math.max(tip.y - 8, 0), transform: tip.y > 40 ? "translateY(-100%)" : undefined }}>
                  <p className="font-semibold text-ink">{tip.title}</p>
                  {tip.sub && <p className="text-ink-muted">{tip.sub}</p>}
                </div>
              )}
            </div>
          </div>

          {on("heat") && heat.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
              <div className="flex items-center gap-2" aria-label={t("legendAria", { what: mode === "deaths" ? t("legendDeaths") : t("legendKills") })}>
                <span className="tabular-nums">{fmtNum(range.lo)}</span>
                <span aria-hidden className="h-2.5 w-32 rounded-full border border-brass/30" style={{ background: `linear-gradient(to right, transparent, ${mode === "deaths" ? "var(--rose)" : "var(--sage)"})` }} />
                <span className="tabular-nums">{t("perZone", { n: fmtNum(range.hi) })}</span>
              </div>
              <span className="tabular-nums">{t("heatTotals", { deaths: fmtNum(totals.deaths), kills: fmtNum(totals.kills) })}</span>
              <label className="ml-auto flex items-center gap-2">
                {t("intensity")}
                <input type="range" min={0.2} max={1} step={0.05} value={heatOpacity} onChange={(e) => setHeatOpacity(Number(e.target.value))} className="w-28 accent-[var(--brass)]" />
              </label>
            </div>
          )}
          <p className="hidden text-xs text-ink-muted sm:block">{t("hint")}</p>
        </div>

        <aside className="space-y-4">
          <MapSearch items={searchItems} />

          <section aria-live="polite" className="rounded-md border border-brass/30 bg-surface p-4 shadow-card">
            {!sel && <p className="text-sm text-ink-muted">{t("pickHint")}</p>}
            {sel?.type === "objective" && (
              <div className="space-y-2">
                <Chip tone={sel.o.team === 0 ? "sage" : "rose"}>{teamName(sel.o.team)}</Chip>
                <h3 className="font-display text-xl font-black uppercase">{sel.o.npcName ?? objLabel(sel.o.kind)}</h3>
                <p className="text-sm text-ink-muted">{objLabel(sel.o.kind)}{sel.o.lane ? ` · ${t("lane", { n: sel.o.lane })}` : ""}</p>
                {sel.o.maxHealth !== undefined && <p className="text-sm">{t.rich("maxHealth", { value: fmtNum(sel.o.maxHealth), b: (c) => <span className="font-semibold tabular-nums">{c}</span> })}</p>}
              </div>
            )}
            {sel?.type === "camp" && (
              <div className="space-y-2">
                <Chip tone="apricot">{campLabel(sel.c.kind)}</Chip>
                <h3 className="font-display text-xl font-black uppercase">{sel.c.name.replaceAll("_", " ")}</h3>
                <p className="text-sm text-ink-muted">{t("campText")}</p>
                <p className="text-xs tabular-nums text-ink-muted">{t("position", { x: sel.c.world[0], y: sel.c.world[1] })}</p>
              </div>
            )}
            {sel?.type === "entity" && (() => {
              const def = KIND.get(sel.e.kind)!;
              return (
                <div className="space-y-2">
                  <Chip tone="neutral">{t(`grp_${def.group}`)}</Chip>
                  <h3 className="font-display text-xl font-black uppercase">{t(`ent_${def.key}`)}{sel.e.team !== undefined ? ` · ${teamName(sel.e.team)}` : ""}</h3>
                  <p className="text-sm text-ink-muted">{t(`entText_${def.key}`)}</p>
                  <p className="text-xs tabular-nums text-ink-muted">{t("position", { x: sel.e.world[0], y: sel.e.world[1] })}</p>
                </div>
              );
            })()}
            {sel && (
              <div className="mt-3 flex gap-2">
                <button type="button" className="rounded-sm border border-brass/50 px-3 py-1.5 text-sm font-semibold hover:bg-brass/15" onClick={() => selected && focus(selected.left, selected.top, 5)}>{t("center")}</button>
                <button type="button" className="rounded-sm px-3 py-1.5 text-sm text-ink-muted hover:bg-brass/10" onClick={() => setSel(null)}>{t("close")}</button>
              </div>
            )}
          </section>

          <section className="rounded-md border border-brass/30 bg-surface p-4 shadow-card" aria-label={t("layers")}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-black uppercase">{t("layers")}</h3>
              <div className="ml-auto flex gap-1 text-xs">
                <button type="button" className="rounded-sm px-2 py-1 text-ink-muted hover:bg-brass/10" onClick={() => setMany(DEFAULT_LAYERS)}>{t("layersDefault")}</button>
                <button type="button" className="rounded-sm px-2 py-1 text-ink-muted hover:bg-brass/10" onClick={() => setMany([...BASE_LAYERS.map((l) => l.id), ...ENTITY_KINDS.map((e) => e.key)])}>{t("layersAll")}</button>
                <button type="button" className="rounded-sm px-2 py-1 text-ink-muted hover:bg-brass/10" onClick={() => setMany([])}>{t("layersNone")}</button>
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {BASE_LAYERS.filter((l) => (l.id !== "tunnels" && l.id !== "rats") || scene.images.tunnels).map((l) => (
                <li key={l.id}><label className="flex cursor-pointer items-center gap-2 py-0.5"><input type="checkbox" checked={on(l.id)} onChange={() => toggle(l.id)} className="accent-[var(--brass)]" />{t(`layer_${l.id}`)}</label></li>
              ))}
            </ul>
            {(["Estructuras", "Movilidad", "Botín"] as const).map((g) => (
              <details key={g} open={g === "Estructuras"} className="group/layers mt-3 border-t border-brass/20 pt-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass">
                  <span aria-hidden className="text-xs transition-transform group-open/layers:rotate-90">▶</span>
                  {t(`grp_${g}`)}
                  <span className="ml-auto text-xs font-normal tabular-nums">{ENTITY_KINDS.filter((e) => e.group === g && on(e.key)).length}/{ENTITY_KINDS.filter((e) => e.group === g && (byKind.get(e.key)?.length ?? 0) > 0).length}</span>
                </summary>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {ENTITY_KINDS.filter((e) => e.group === g && (byKind.get(e.key)?.length ?? 0) > 0).map((e) => (
                    <li key={e.key}>
                      <label className="flex cursor-pointer items-center gap-2 py-0.5">
                        <input type="checkbox" checked={on(e.key)} onChange={() => toggle(e.key)} className="accent-[var(--brass)]" />
                        <svg aria-hidden viewBox="-9 -9 18 18" width="14" height="14" className="shrink-0"><Mark shape={e.shape} x={0} y={0} s={13} fill={e.color} sw={1.2} /></svg>
                        <span className="flex-1">{t(`ent_${e.key}`)}</span>
                        <span className="text-xs tabular-nums text-ink-muted">{byKind.get(e.key)!.length}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
