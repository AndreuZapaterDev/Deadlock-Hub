"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export const MAP_SIZE = 1000; // lado del viewBox del SVG
const MIN_K = 1;
const MAX_K = 14;

export type View = { k: number; x: number; y: number };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Mantiene el mapa dentro del marco: con zoom k, el desplazamiento va de MAP_SIZE·(1−k) a 0. */
export function clampView(v: View): View {
  const k = clamp(v.k, MIN_K, MAX_K);
  const lim = MAP_SIZE * (1 - k);
  return { k, x: clamp(v.x, lim, 0), y: clamp(v.y, lim, 0) };
}

/** Zoom de factor `f` manteniendo fijo el punto (px, py) del SVG (el cursor o el centro del pellizco). */
export function zoomAround(v: View, f: number, px: number, py: number): View {
  const k = clamp(v.k * f, MIN_K, MAX_K);
  const ratio = k / v.k;
  return clampView({ k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio });
}

/** Vista centrada en un punto relativo (0..1) del mapa con el zoom dado. */
export function centerOn(left: number, top: number, k: number): View {
  return clampView({ k, x: MAP_SIZE / 2 - left * MAP_SIZE * k, y: MAP_SIZE / 2 - top * MAP_SIZE * k });
}

/**
 * Zoom con la rueda, arrastre con el ratón o el dedo y pellizco en pantallas táctiles, sobre un <svg viewBox="0 0 1000 1000">.
 * Los clics sobre los marcadores siguen funcionando: tras un arrastre se anula el clic (`dragged`).
 */
export function usePanZoom(svgRef: RefObject<SVGSVGElement | null>, initial?: { k: number; cx: number; cy: number }) {
  const [view, setView] = useState<View>(() => (initial ? centerOn(initial.cx, initial.cy, initial.k) : { k: 1, x: 0, y: 0 }));
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number } | null>(null);
  const moved = useRef(0);
  const [dragging, setDragging] = useState(false);

  const apply = useCallback((v: View) => setView(clampView(v)), []);

  /** Coordenadas del cliente → coordenadas del SVG (viewBox), sin zoom. */
  const toSvg = useCallback((cx: number, cy: number) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || !r.width) return { x: MAP_SIZE / 2, y: MAP_SIZE / 2 };
    return { x: ((cx - r.left) * MAP_SIZE) / r.width, y: ((cy - r.top) * MAP_SIZE) / r.height };
  }, [svgRef]);

  /** Coordenadas del cliente → posición relativa (0..1) sobre el mapa, teniendo en cuenta el zoom. */
  const toMap = useCallback((cx: number, cy: number) => {
    const p = toSvg(cx, cy);
    const v = viewRef.current;
    return { left: (p.x - v.x) / (v.k * MAP_SIZE), top: (p.y - v.y) / (v.k * MAP_SIZE) };
  }, [toSvg]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // La rueda necesita un listener no pasivo para poder evitar el scroll de la página.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      setView((v) => zoomAround(v, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0011)), p.x, p.y));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svgRef, toSvg]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      const next = { x: e.clientX, y: e.clientY };
      pointers.current.set(e.pointerId, next);
      const r = svgRef.current?.getBoundingClientRect();
      if (!r) return;
      const scale = MAP_SIZE / r.width;

      if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (gesture.current && gesture.current.dist > 0) {
          const c = toSvg((a.x + b.x) / 2, (a.y + b.y) / 2);
          setView((v) => zoomAround(v, dist / gesture.current!.dist, c.x, c.y));
        }
        gesture.current = { dist };
        moved.current += 10;
        return;
      }
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      moved.current += Math.abs(dx) + Math.abs(dy);
      if (moved.current > 5) {
        setDragging(true);
        setView((v) => clampView({ ...v, x: v.x + dx * scale, y: v.y + dy * scale }));
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      gesture.current = null;
      if (pointers.current.size === 0) setDragging(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [svgRef, toSvg]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (pointers.current.size === 0) moved.current = 0;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = null;
  }, []);

  return {
    view,
    dragging,
    toMap,
    onPointerDown,
    /** Tras un arrastre, el clic que lo cierra no debe seleccionar nada. */
    wasDragged: () => moved.current > 5,
    zoomBy: (f: number) => setView((v) => zoomAround(v, f, MAP_SIZE / 2, MAP_SIZE / 2)),
    reset: () => apply({ k: 1, x: 0, y: 0 }),
    focus: (left: number, top: number, k = 4) => apply(centerOn(left, top, k)),
  };
}
