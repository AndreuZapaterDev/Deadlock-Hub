"use client";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { fmtDuration, fmtNum } from "@/lib/format";

const fmt = { num: (n: number) => fmtNum(Math.round(n)), duration: fmtDuration };

/**
 * Número que sube desde 0 al entrar en pantalla. El HTML del servidor ya trae el valor final
 * (sin JS o con movimiento reducido se ve igual), y la cuenta solo se anima en el cliente.
 */
export function CountUp({ value, kind = "num" }: { value: number; kind?: keyof typeof fmt }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, value, { duration: 1.6, ease: [0.22, 0.61, 0.36, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [inView, reduced, value]);

  return <span ref={ref}>{fmt[kind](shown)}</span>;
}
