"use client";
import { useEffect, useRef } from "react";

// Un solo IntersectionObserver para todos los `Reveal` de la página (antes cada uno montaba su propio componente de Motion con
// estado y suscripciones: con 44 tarjetas eso costaba cientos de milisegundos de hidratación en móvil). La animación es CSS pura.
let observer: IntersectionObserver | null = null;
function io() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        observer?.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -60px 0px" },
  );
  return observer;
}

/** Aparece una sola vez al entrar en pantalla. `delay` en segundos para escalonar. Con prefers-reduced-motion se ve desde el principio. */
export function Reveal({ children, delay = 0, variant = "rise", className }: { children: React.ReactNode; delay?: number; variant?: "rise" | "curtain"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.classList.add("is-in");
      return;
    }
    const o = io();
    o.observe(el);
    return () => o.unobserve(el);
  }, []);
  return (
    <div ref={ref} className={`reveal reveal-${variant}${className ? ` ${className}` : ""}`} style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}
