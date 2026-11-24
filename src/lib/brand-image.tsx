import { BRAND } from "@/lib/site";

/**
 * Emblema de la marca (rueda de timón de 8 radios con un ojo) dibujado en SVG para las imágenes generadas (iconos y Open Graph).
 * `safe`: fracción del lienzo que ocupa el emblema (el icono "maskable" necesita margen: el sistema lo recorta en círculo).
 */
export function EmblemImage({ size, safe = 0.8 }: { size: number; safe?: number }) {
  const r = (size * safe) / 2;
  const c = size / 2;
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill={BRAND.night} />
      <circle cx={c} cy={c} r={r} fill={BRAND.accent} stroke={BRAND.brass} strokeWidth={size * 0.02} />
      <circle cx={c} cy={c} r={r * 0.78} fill="none" stroke={BRAND.cream} strokeWidth={size * 0.028} />
      {spokes.map((a, i) => (
        <g key={i}>
          <line x1={c} y1={c} x2={c + Math.cos(a) * r * 0.9} y2={c + Math.sin(a) * r * 0.9} stroke={BRAND.cream} strokeWidth={size * 0.026} strokeLinecap="round" />
          <circle cx={c + Math.cos(a) * r * 0.9} cy={c + Math.sin(a) * r * 0.9} r={size * 0.026} fill={BRAND.cream} />
        </g>
      ))}
      {/* ojo geométrico: almendra con pupila */}
      <path d={`M ${c - r * 0.34} ${c} Q ${c} ${c - r * 0.3} ${c + r * 0.34} ${c} Q ${c} ${c + r * 0.3} ${c - r * 0.34} ${c} Z`} fill={BRAND.night} stroke={BRAND.brass} strokeWidth={size * 0.014} />
      <circle cx={c} cy={c} r={r * 0.1} fill={BRAND.brass} />
    </svg>
  );
}

export const OG_SIZE = { width: 1200, height: 630 };

/** Tarjeta Open Graph (1200×630) con el estilo del cartel: panel verde petróleo, marco dorado, emblema y título en mayúsculas. */
export function OgCard({ title, subtitle, kicker }: { title: string; subtitle?: string; kicker?: string }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: BRAND.night, padding: 28 }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", background: BRAND.poster, border: `6px solid ${BRAND.brass}`, padding: "0 70px", gap: 56 }}>
        <div style={{ display: "flex", borderRadius: 9999, overflow: "hidden" }}>
          <EmblemImage size={280} safe={0.9} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {kicker && <div style={{ display: "flex", fontSize: 30, color: BRAND.brass, letterSpacing: 6, textTransform: "uppercase" }}>{kicker}</div>}
          <div style={{ display: "flex", fontSize: title.length > 16 ? 76 : 100, fontWeight: 900, color: BRAND.cream, textTransform: "uppercase", lineHeight: 1.05, marginTop: 8 }}>{title}</div>
          {subtitle && <div style={{ display: "flex", fontSize: 34, color: BRAND.cream, opacity: 0.8, marginTop: 18 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
