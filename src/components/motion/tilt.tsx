"use client";
import { useRef } from "react";

/**
 * Inclinación 3D siguiendo el cursor, con un brillo que se desplaza por la tarjeta. Solo con punteros finos (ratón): en pantallas
 * táctiles no hace nada. Todo se resuelve con variables CSS (`--rx`, `--ry`, `--gx`, `--gy`) escritas directamente en el
 * elemento, sin estado de React ni muelles de Motion: cada tarjeta es casi gratis de hidratar. El suavizado lo pone una
 * transición CSS, y con prefers-reduced-motion no hay inclinación (ver `.tilt` en globals.css).
 */
export function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${((0.5 - y) * 18).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${((x - 0.5) * 18).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      el.style.setProperty("--glare", "1");
    });
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--glare", "0");
  };

  return (
    <div ref={ref} className={`tilt${className ? ` ${className}` : ""}`} onPointerMove={move} onPointerLeave={leave}>
      <div className="relative h-full">
        {children}
        <div aria-hidden className="tilt-glare chamfer pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}
