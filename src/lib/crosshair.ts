// Editor de crosshair: ajustes, validación y geometría de la vista previa. Puro (sin red) para poder probarlo.
// Los nombres y valores por defecto salen de `/v1/crosshair/settings/code` en el OpenAPI.

export type CrosshairSettings = {
  themed: boolean;
  pip_gap_static: boolean;
  pip_width: number;
  pip_height: number;
  pip_gap: number;
  pip_opacity: number;
  pip_outline_border: number;
  pip_outline_gap: number;
  pip_outline_opacity: number;
  dot_size: number;
  dot_opacity: number;
  dot_outline_border: number;
  dot_outline_gap: number;
  dot_outline_opacity: number;
  color_r: number;
  color_g: number;
  color_b: number;
  outline_color_r: number;
  outline_color_g: number;
  outline_color_b: number;
};

export const DEFAULTS: CrosshairSettings = {
  themed: false, pip_gap_static: false,
  pip_width: 2, pip_height: 16, pip_gap: 4, pip_opacity: 0.5,
  pip_outline_border: 1, pip_outline_gap: 0, pip_outline_opacity: 0.7,
  dot_size: 4, dot_opacity: 0.7, dot_outline_border: 2, dot_outline_gap: 0, dot_outline_opacity: 0.7,
  color_r: 255, color_g: 255, color_b: 255, outline_color_r: 0, outline_color_g: 0, outline_color_b: 0,
};

type Range = { min: number; max: number; step: number };
/** Rangos del editor. El OpenAPI solo fija mínimo 0 en los colores; el resto son límites razonables para que la vista previa tenga sentido. */
export const RANGES: Record<Exclude<keyof CrosshairSettings, "themed" | "pip_gap_static">, Range> = {
  pip_width: { min: 0, max: 10, step: 1 },
  pip_height: { min: 0, max: 40, step: 1 },
  pip_gap: { min: 0, max: 30, step: 1 },
  pip_opacity: { min: 0, max: 1, step: 0.05 },
  pip_outline_border: { min: 0, max: 5, step: 1 },
  pip_outline_gap: { min: 0, max: 5, step: 1 },
  pip_outline_opacity: { min: 0, max: 1, step: 0.05 },
  dot_size: { min: 0, max: 16, step: 1 },
  dot_opacity: { min: 0, max: 1, step: 0.05 },
  dot_outline_border: { min: 0, max: 5, step: 1 },
  dot_outline_gap: { min: 0, max: 5, step: 1 },
  dot_outline_opacity: { min: 0, max: 1, step: 0.05 },
  color_r: { min: 0, max: 255, step: 1 },
  color_g: { min: 0, max: 255, step: 1 },
  color_b: { min: 0, max: 255, step: 1 },
  outline_color_r: { min: 0, max: 255, step: 1 },
  outline_color_g: { min: 0, max: 255, step: 1 },
  outline_color_b: { min: 0, max: 255, step: 1 },
};

const bool = (v: unknown) => v === true || v === "true" || v === "1";

/**
 * Convierte cualquier entrada (JSON del usuario, query string, respuesta de la API) en ajustes válidos:
 * los campos desconocidos se descartan, los que faltan o no son números toman el valor por defecto y los números se recortan al rango.
 */
export function clampSettings(input: Record<string, unknown>): CrosshairSettings {
  const out: CrosshairSettings = { ...DEFAULTS };
  out.themed = "themed" in input ? bool(input.themed) : DEFAULTS.themed;
  out.pip_gap_static = "pip_gap_static" in input ? bool(input.pip_gap_static) : DEFAULTS.pip_gap_static;
  for (const key of Object.keys(RANGES) as (keyof typeof RANGES)[]) {
    const { min, max, step } = RANGES[key];
    const raw = input[key];
    const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
    if (!Number.isFinite(n)) continue;
    const clamped = Math.min(max, Math.max(min, n));
    out[key] = step >= 1 ? Math.round(clamped) : Math.round(clamped * 100) / 100;
  }
  return out;
}

/** Parámetros para las llamadas a la API (`settings/code` y `settings/image`). */
export const toQuery = (s: CrosshairSettings): Record<string, string | number> =>
  Object.fromEntries(Object.entries(s).map(([k, v]) => [k, typeof v === "boolean" ? String(v) : v]));

export const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
export function fromHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Un código de crosshair tiene prefijo `DL.` y solo caracteres de URL; se limita el tamaño antes de enviarlo a la API. */
export const isValidCode = (code: string) => code.length >= 4 && code.length <= 2000 && /^DL\.[A-Za-z0-9._%\-=+/]+$/.test(code);

export type Rect = { x: number; y: number; w: number; h: number };
export type Shapes = {
  /** Las 4 barras (arriba, abajo, izquierda, derecha), con el centro del crosshair en (0, 0). */
  pips: Rect[];
  /** Contorno de cada barra: rectángulo para dibujar con trazo (ya desplazado por el hueco del contorno). */
  pipOutlines: Rect[];
  dot: { r: number } | null;
  dotOutline: { r: number } | null;
};

/**
 * Geometría de la vista previa (aproximada: la imagen oficial la genera la API).
 * Las barras se colocan a `pip_gap` del centro; el contorno se dibuja con trazo de `border` de grosor
 * a `gap` de distancia del borde de la barra; el punto central es un círculo de `dot_size` de diámetro.
 */
export function crosshairShapes(s: CrosshairSettings): Shapes {
  const { pip_width: w, pip_height: h, pip_gap: g } = s;
  const pips: Rect[] = w > 0 && h > 0
    ? [
        { x: -w / 2, y: -(g + h), w, h },
        { x: -w / 2, y: g, w, h },
        { x: -(g + h), y: -w / 2, w: h, h: w },
        { x: g, y: -w / 2, w: h, h: w },
      ]
    : [];
  const o = s.pip_outline_gap + s.pip_outline_border / 2;
  const pipOutlines = s.pip_outline_border > 0 ? pips.map((p) => ({ x: p.x - o, y: p.y - o, w: p.w + 2 * o, h: p.h + 2 * o })) : [];
  const r = s.dot_size / 2;
  return {
    pips,
    pipOutlines,
    dot: r > 0 ? { r } : null,
    dotOutline: r > 0 && s.dot_outline_border > 0 ? { r: r + s.dot_outline_gap + s.dot_outline_border / 2 } : null,
  };
}
