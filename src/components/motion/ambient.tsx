"use client";
import { useEffect, useRef } from "react";

// Posiciones "aleatorias" pero deterministas (sin Math.random: el HTML del servidor y el del cliente deben coincidir).
const rand = (i: number, n: number) => {
  const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const EMBERS = Array.from({ length: 20 }, (_, i) => ({
  left: Math.round(rand(i, 1) * 1000) / 10,
  size: 8 + Math.round(rand(i, 2) * 14),
  dur: 18 + Math.round(rand(i, 3) * 22),
  delay: -Math.round(rand(i, 4) * 40),
  sway: Math.round((rand(i, 5) - 0.5) * 80),
  tw: 2.5 + Math.round(rand(i, 6) * 30) / 10,
}));

/**
 * Ambiente de la calle de noche: brasas doradas que suben despacio y una luz de farola que sigue al cursor. Solo en modo Noche y
 * sin movimiento reducido (reglas `.embers` y `.lamp` de globals.css).
 *
 * Rendimiento: antes eran un canvas a pantalla completa redibujado en cada fotograma (con 34 partículas) y un bucle de
 * requestAnimationFrame que repintaba toda la ventana siempre, aunque el ratón estuviera quieto: ~40 % de la CPU de un móvil con la
 * página parada. Ahora las brasas son elementos con animaciones CSS de `transform` y `opacity` (se componen en la GPU, sin tocar el
 * hilo principal) y la luz es una capa que solo se mueve con `transform` mientras el ratón se mueve.
 */
export function Ambient() {
  const lamp = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = lamp.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches) return;
    let tx = window.innerWidth / 2, ty = window.innerHeight / 3, cx = tx, cy = ty, raf = 0;
    const place = () => { el.style.transform = `translate3d(${cx.toFixed(0)}px, ${cy.toFixed(0)}px, 0)`; };
    place();
    const step = () => {
      cx += (tx - cx) * 0.1;
      cy += (ty - cy) * 0.1;
      place();
      // Cuando llega al cursor, el bucle se para: sin movimiento no hay trabajo.
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.6 ? requestAnimationFrame(step) : 0;
    };
    const move = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(step);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", move); };
  }, []);

  return (
    <>
      <div aria-hidden className="embers">
        {EMBERS.map((e, i) => (
          <span key={i} className="ember" style={{ "--l": `${e.left}%`, "--s": `${e.size}px`, "--d": `${e.dur}s`, "--dl": `${e.delay}s`, "--sw": `${e.sway}px`, "--tw": `${e.tw}s` } as React.CSSProperties} />
        ))}
      </div>
      <div ref={lamp} aria-hidden className="lamp" />
    </>
  );
}
