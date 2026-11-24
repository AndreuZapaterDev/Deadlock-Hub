import { cn } from "@/lib/cn";

type SvgProps = { className?: string };

/** Separador de sección: líneas finas de latón con un rombo y abanico central. */
export function Divider({ className }: SvgProps) {
  return (
    <svg role="presentation" aria-hidden className={cn("h-4 w-full text-brass", className)} viewBox="0 0 400 16" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M0 8H168M232 8H400" pathLength="1" className="draw" />
      <path d="M0 11H160M240 11H400" opacity=".5" pathLength="1" className="draw" />
      <path d="M200 1l7 7-7 7-7-7z" fill="currentColor" fillOpacity=".25" />
      <path d="M176 8l-6-4v8zM224 8l6-4v8z" fill="currentColor" />
    </svg>
  );
}

/** Esquina ornamental en L con doble línea. Se coloca en absoluto; `rotate` en grados. */
export function Corner({ className, rotate = 0 }: SvgProps & { rotate?: 0 | 90 | 180 | 270 }) {
  return (
    <svg role="presentation" aria-hidden className={cn("pointer-events-none absolute h-6 w-6 text-brass", className)} style={{ transform: `rotate(${rotate}deg)` }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M2 22V6l4-4h16" />
      <path d="M6 22V9l3-3h13" opacity=".5" />
    </svg>
  );
}

/** Rayos de sol déco que nacen del borde inferior. `color` es una variable CSS de token. */
export function Sunburst({ className, color = "var(--lilac)", rays = 13, strength = 0.55, animate }: SvgProps & { color?: string; rays?: number; strength?: number; animate?: boolean }) {
  const cx = 200, cy = 200, r = 320;
  const step = Math.PI / (rays * 2);
  const wedges = Array.from({ length: rays }, (_, i) => {
    const a0 = Math.PI + step * (i * 2);
    const a1 = a0 + step;
    return `M${cx} ${cy}L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}L${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}z`;
  });
  return (
    <svg role="presentation" aria-hidden className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} viewBox="0 0 400 200" preserveAspectRatio="xMidYMax slice">
      <g fill={color}>
        {wedges.map((d, i) => (
          <path key={i} d={d} opacity={strength} className={animate ? "ray" : undefined} style={animate ? ({ "--i": i } as React.CSSProperties) : undefined} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r="46" fill="none" stroke="var(--brass)" strokeWidth="1" opacity=".6" />
    </svg>
  );
}

/** Sigilo oculto: círculos, estrella y ojo geométrico. Marca de agua tenue, nunca sobre el contenido. */
export function Sigil({ className }: SvgProps) {
  return (
    <svg role="presentation" aria-hidden className={cn("pointer-events-none text-brass", className)} viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="60" cy="60" r="56" />
      <circle cx="60" cy="60" r="48" strokeDasharray="2 4" />
      <path d="M60 12l14 36 38 2-30 24 10 38-32-21-32 21 10-38L8 50l38-2z" opacity=".7" />
      <path d="M30 60q30-26 60 0-30 26-60 0z" />
      <circle cx="60" cy="60" r="8" />
      <circle cx="60" cy="60" r="2.5" fill="currentColor" />
    </svg>
  );
}

// [x, ancho, alto, aguja]: edificios escalonados tipo art déco
const TOWERS: [number, number, number, number][] = [
  [0, 40, 40, 0], [40, 34, 62, 8], [74, 44, 48, 0], [118, 30, 82, 18], [148, 38, 56, 0], [186, 36, 96, 26],
  [222, 28, 70, 0], [250, 40, 52, 0], [290, 32, 88, 14], [322, 44, 60, 0], [366, 30, 76, 10], [396, 40, 46, 0],
];

/** Skyline estilizado en línea fina (footer e inicio). Se repite en horizontal. */
export function Skyline({ className }: SvgProps) {
  const base = 150;
  return (
    // El motivo se repite a escala natural con <pattern>: no se deforma al ensanchar.
    <svg role="presentation" aria-hidden className={cn("w-full text-brass", className)} fill="none" stroke="currentColor" strokeWidth="1">
      <defs>
        <pattern id="skyline" width="436" height={base} patternUnits="userSpaceOnUse">
          {TOWERS.map(([x, w, h, spire], i) => (
            <g key={i}>
              <path d={`M${x} ${base}V${base - h}h${w}V${base}`} />
              <path d={`M${x + 6} ${base - h}V${base - h - 6}h${w - 12}V${base - h}`} opacity=".6" />
              {spire > 0 && <path d={`M${x + w / 2} ${base - h - 6}V${base - h - 6 - spire}`} />}
              {Array.from({ length: Math.floor(h / 14) }, (_, k) => (
                <path key={k} d={`M${x + 6} ${base - 10 - k * 14}h${w - 12}`} opacity=".25" />
              ))}
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height={base} fill="url(#skyline)" stroke="none" />
      <path d={`M0 ${base - 0.5}H4000`} />
    </svg>
  );
}

/** Emblema de marca: rueda de timón de 8 radios con pomos y un ojo geométrico en el centro. */
export function Emblem({ className }: SvgProps) {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    return { x1: 32 + c * 12, y1: 32 + s * 12, x2: 32 + c * 25, y2: 32 + s * 25, kx: 32 + c * 29, ky: 32 + s * 29 };
  });
  return (
    <svg role="presentation" aria-hidden className={cn("text-brass", className)} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="32" cy="32" r="25" />
      <circle cx="32" cy="32" r="12" />
      {spokes.map((p, i) => (
        <g key={i}>
          <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} />
          <circle cx={p.kx} cy={p.ky} r="2.4" fill="currentColor" stroke="none" />
        </g>
      ))}
      <path className="eye" d="M23.5 32q8.5-7 17 0-8.5 7-17 0z" strokeWidth="1.8" />
      <circle className="eye" cx="32" cy="32" r="2.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * Skyline nocturno para el footer: torres en silueta (color --night-tower) con ventanas
 * de latón encendidas. Las torres nacen sobre la banda `bg-night` que va justo debajo.
 */
export function NightSkyline({ className }: SvgProps) {
  const base = 150;
  const windows = TOWERS.flatMap(([x, w, h], i) => {
    const cols = Math.floor((w - 8) / 8), rows = Math.floor((h - 10) / 12);
    return Array.from({ length: cols * rows }, (_, n) => {
      const c = n % cols, r = Math.floor(n / cols);
      return (i * 7 + r * 3 + c * 5) % 4 === 0 ? { x: x + 6 + c * 8, y: base - 14 - r * 12, key: `${i}-${n}` } : null;
    }).filter(Boolean) as { x: number; y: number; key: string }[];
  });
  return (
    <svg role="presentation" aria-hidden className={cn("w-full", className)}>
      <defs>
        <pattern id="night-skyline" width="436" height={base} patternUnits="userSpaceOnUse">
          {TOWERS.map(([x, w, h, spire], i) => (
            <g key={i} fill="var(--night-tower)">
              <rect x={x} y={base - h} width={w} height={h} />
              <rect x={x + 6} y={base - h - 6} width={w - 12} height={6} />
              {spire > 0 && <rect x={x + w / 2 - 1} y={base - h - 6 - spire} width="2" height={spire} />}
            </g>
          ))}
          <g fill="var(--brass)" opacity=".85">{windows.map((p, n) => (
            <rect key={p.key} x={p.x} y={p.y} width="3" height="5" className={n % 4 === 0 ? "flicker" : undefined} style={n % 4 === 0 ? { animationDelay: `${-((n * 1.7) % 6).toFixed(1)}s` } : undefined} />
          ))}</g>
        </pattern>
      </defs>
      <rect width="100%" height={base} fill="url(#night-skyline)" />
    </svg>
  );
}

// Cable que cuelga entre edificios: dos curvas cuadráticas encadenadas (la segunda refleja el control de la primera).
const SEG1 = { p0: [0, 6], c: [250, 90], p1: [500, 34] } as const;
const SEG2 = { p0: [500, 34], c: [750, -22], p1: [1000, 14] } as const;
const quad = (s: typeof SEG1 | typeof SEG2, t: number) => {
  const u = 1 - t;
  return [u * u * s.p0[0] + 2 * u * t * s.c[0] + t * t * s.p1[0], u * u * s.p0[1] + 2 * u * t * s.c[1] + t * t * s.p1[1]] as const;
};
// Puntos de los que cuelga un símbolo (evitan el centro, donde va el emblema)
const HANGS = [[SEG1, 0.15], [SEG1, 0.4], [SEG1, 0.7], [SEG2, 0.3], [SEG2, 0.6], [SEG2, 0.85]] as const;

function Glyph({ kind }: { kind: number }) {
  if (kind === 0) {
    // círculo con ojo
    return (<><circle r="9" /><path d="M-5 0q5-4.5 10 0-5 4.5-10 0z" strokeWidth="1.2" /><circle r="1.6" fill="currentColor" stroke="none" /></>);
  }
  if (kind === 1) {
    // triángulo con círculo
    return (<><path d="M0-10L9.5 7h-19z" /><circle cy="2" r="3" /></>);
  }
  // círculo con cruz
  return (<><circle r="9" /><path d="M0-9v18M-9 0h18" strokeWidth="1.1" /></>);
}

/**
 * Cable con símbolos ocultos colgando, como en las calles del juego. Los símbolos se balancean suavemente.
 * Se coloca en absoluto en la parte alta de un panel; no captura el ratón.
 */
export function SigilWire({ className }: SvgProps) {
  return (
    <svg role="presentation" aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 w-full text-brass", className)} viewBox="0 0 1000 120" preserveAspectRatio="xMidYMin slice" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={`M${SEG1.p0} Q${SEG1.c} ${SEG1.p1} Q${SEG2.c} ${SEG2.p1}`} opacity=".7" />
      {HANGS.map(([seg, t], i) => {
        const [x, y] = quad(seg, t);
        const len = 14 + (i % 3) * 8;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
            <g className="sway" style={{ animationDelay: `${-i * 0.9}s` }}>
              <path d={`M0 0V${len}`} opacity=".7" />
              <g transform={`translate(0 ${len + 10})`}><Glyph kind={i % 3} /></g>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
