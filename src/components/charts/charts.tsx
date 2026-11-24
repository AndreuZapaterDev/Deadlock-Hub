"use client";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ResponsiveContainer, Sankey, Tooltip, XAxis, YAxis,
} from "recharts";
import { SERIES } from "./palette";

const axis = { stroke: "var(--ink-muted)", fontSize: 12, tickLine: false } as const;
const tip = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--brass)", borderRadius: 8, color: "var(--ink)", fontSize: 12 },
  cursor: { fill: "color-mix(in srgb, var(--brass) 15%, transparent)" },
};

type Point = Record<string, string | number>;

export function BarChartBase({ data, xKey = "name", yKey = "value", height = 260, percent }: { data: Point[]; xKey?: string; yKey?: string; height?: number; percent?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid stroke="var(--brass)" strokeOpacity={0.2} vertical={false} />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} tickFormatter={(v: number) => (percent ? `${(v * 100).toFixed(0)}%` : String(v))} />
        <Tooltip {...tip} formatter={(v) => (percent ? `${(Number(v) * 100).toFixed(1)}%` : String(v))} />
        <Bar dataKey={yKey} fill={SERIES[0].fill} stroke={SERIES[0].stroke} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineChartBase({ data, xKey, series, height = 260, yDomain, yLabels, step, suffix }: { data: Point[]; xKey: string; series: { key: string; label: string }[]; height?: number; yDomain?: [number | string, number | string]; yLabels?: Record<number, string>; step?: boolean; suffix?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid stroke="var(--brass)" strokeOpacity={0.2} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={36} />
        <YAxis {...axis} width={yLabels ? 84 : undefined} domain={yDomain} allowDecimals={!yLabels} tickFormatter={(v: number) => (yLabels ? yLabels[Math.round(v)] ?? "" : suffix ? `${v}${suffix}` : String(v))} />
        <Tooltip {...tip} formatter={(v) => (yLabels ? `${yLabels[Math.floor(Number(v))] ?? ""} ${Math.round((Number(v) - Math.floor(Number(v))) * 6) + 1}` : suffix ? `${v}${suffix}` : String(v))} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line key={s.key} dataKey={s.key} name={s.label} stroke={SERIES[i % SERIES.length].stroke} strokeWidth={2.5} dot={false} type={step ? "stepAfter" : "monotone"} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RadarChartBase({ data, series, height = 300 }: { data: Point[]; series: { key: string; label: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="var(--brass)" strokeOpacity={0.4} />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--ink)", fontSize: 12 }} />
        <Tooltip {...tip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Radar key={s.key} dataKey={s.key} name={s.label} stroke={SERIES[i % SERIES.length].stroke} fill={SERIES[i % SERIES.length].fill} fillOpacity={0.45} strokeWidth={2} />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

type SankeyData = { nodes: { name: string; column: number }[]; links: { source: number; target: number; value: number }[] };

export function SankeyChart({ data, height = 360 }: { data: SankeyData; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={data}
        nodePadding={16}
        nodeWidth={10}
        margin={{ left: 4, right: 150, top: 4, bottom: 4 }}
        link={{ stroke: "var(--brass)", strokeOpacity: 0.35 }}
        node={(p) => {
          const s = SERIES[((p.payload as unknown as { column?: number }).column ?? 0) % SERIES.length];
          return (
            <g>
              <rect x={p.x} y={p.y} width={p.width} height={p.height} fill={s.fill} stroke={s.stroke} />
              <text x={p.x + p.width + 6} y={p.y + p.height / 2} dominantBaseline="middle" fontSize={11} fill="var(--ink)">{p.payload.name}</text>
            </g>
          );
        }}
      >
        <Tooltip {...tip} />
      </Sankey>
    </ResponsiveContainer>
  );
}
