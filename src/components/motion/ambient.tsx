"use client";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type Ember = { x: number; y: number; r: number; vy: number; phase: number; speed: number };

/**
 * Ambiente de la calle de noche: brasas doradas que suben despacio y una luz de farola que sigue al cursor.
 * Solo se dibuja en modo Noche y se detiene con la pestaña oculta o con movimiento reducido.
 */
export function Ambient() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const light = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;

    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const embers: Ember[] = Array.from({ length: 34 }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: 0.8 + Math.random() * 1.8,
      vy: 0.12 + Math.random() * 0.3, phase: Math.random() * 6.28, speed: 0.4 + Math.random() * 0.8,
    }));

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, w, h);
      if (document.hidden || document.documentElement.dataset.theme !== "dark") return;
      for (const e of embers) {
        e.y -= e.vy;
        e.x += Math.sin(t / 1800 * e.speed + e.phase) * 0.25;
        if (e.y < -10) { e.y = h + 10; e.x = Math.random() * w; }
        const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t / 700 * e.speed + e.phase));
        ctx.fillStyle = `rgba(214,164,65,${a * 0.25})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 3, 0, 6.28); ctx.fill();
        ctx.fillStyle = `rgba(240,200,110,${a})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.28); ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    // Luz de farola: sigue al ratón con inercia (solo punteros finos, no táctiles)
    const el = light.current;
    let tx = w / 2, ty = h / 3, cx = tx, cy = ty, lraf = 0;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const move = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; };
    const lerp = () => {
      lraf = requestAnimationFrame(lerp);
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      el?.style.setProperty("--mx", `${cx.toFixed(0)}px`);
      el?.style.setProperty("--my", `${cy.toFixed(0)}px`);
    };
    if (fine) { window.addEventListener("pointermove", move, { passive: true }); lraf = requestAnimationFrame(lerp); }

    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(lraf);
      window.removeEventListener("resize", resize); window.removeEventListener("pointermove", move);
    };
  }, [reduced]);

  return (
    <>
      <canvas ref={canvas} aria-hidden className="pointer-events-none fixed inset-0 h-full w-full motion-reduce:hidden" style={{ zIndex: -1 }} />
      <div ref={light} aria-hidden className="pointer-events-none fixed inset-0 hidden dark:block motion-reduce:!hidden" style={{ zIndex: -1, background: "radial-gradient(460px circle at var(--mx, 50%) var(--my, 30%), rgb(214 164 65 / 0.11), transparent 62%)" }} />
    </>
  );
}
