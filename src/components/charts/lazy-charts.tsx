"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentType } from "react";

// Recharts pesa ~500 kB (≈140 kB comprimido) y casi ninguna gráfica está en pantalla al abrir la página. Aquí se carga el código de
// la gráfica solo cuando está cerca de verse, y mientras tanto se reserva su altura (sin saltos de diseño).

function Placeholder({ height }: { height: number }) {
  return <div role="img" aria-label="Cargando gráfica…" style={{ height }} className="animate-pulse-soft rounded-md border border-brass/20 bg-ink/5" />;
}

/** Monta `children` cuando el contenedor se acerca al área visible (una sola vez). */
function WhenNear({ height, children }: { height: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (!("IntersectionObserver" in window)) {
      const id = requestAnimationFrame(() => setNear(true));
      return () => cancelAnimationFrame(id);
    }
    const obs = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setNear(true);
        obs.disconnect();
      }
    }, { rootMargin: "600px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [near]);
  return <div ref={ref} style={near ? undefined : { minHeight: height }}>{near ? children : <Placeholder height={height} />}</div>;
}

function lazy<P extends { height?: number }>(load: () => Promise<{ default: ComponentType<P> }>, fallbackHeight: number) {
  const Inner = dynamic(load, { ssr: false, loading: () => <Placeholder height={fallbackHeight} /> });
  return function LazyChart(props: P) {
    const height = props.height ?? fallbackHeight;
    return (
      <WhenNear height={height}>
        <Inner {...props} />
      </WhenNear>
    );
  };
}

type BarProps = React.ComponentProps<typeof import("./charts").BarChartBase>;
type LineProps = React.ComponentProps<typeof import("./charts").LineChartBase>;
type RadarProps = React.ComponentProps<typeof import("./charts").RadarChartBase>;
type SankeyProps = React.ComponentProps<typeof import("./charts").SankeyChart>;

export const BarChartBase = lazy<BarProps>(() => import("./charts").then((m) => ({ default: m.BarChartBase })), 260);
export const LineChartBase = lazy<LineProps>(() => import("./charts").then((m) => ({ default: m.LineChartBase })), 260);
export const RadarChartBase = lazy<RadarProps>(() => import("./charts").then((m) => ({ default: m.RadarChartBase })), 300);
export const SankeyChart = lazy<SankeyProps>(() => import("./charts").then((m) => ({ default: m.SankeyChart })), 360);
