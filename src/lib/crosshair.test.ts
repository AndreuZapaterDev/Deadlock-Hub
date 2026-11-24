import { describe, expect, it } from "vitest";
import { clampSettings, crosshairShapes, DEFAULTS, fromHex, isValidCode, toHex, toQuery } from "./crosshair";

describe("clampSettings", () => {
  it("sin entrada devuelve los valores por defecto de la API", () => {
    expect(clampSettings({})).toEqual(DEFAULTS);
  });
  it("recorta al rango y redondea los enteros", () => {
    const s = clampSettings({ pip_width: 99, pip_height: -4, pip_gap: 3.6, color_r: 300, dot_size: "7" });
    expect([s.pip_width, s.pip_height, s.pip_gap, s.color_r, s.dot_size]).toEqual([10, 0, 4, 255, 7]);
  });
  it("las opacidades se mantienen entre 0 y 1 con 2 decimales", () => {
    const s = clampSettings({ pip_opacity: 1.7, dot_opacity: 0.333333, pip_outline_opacity: -1 });
    expect([s.pip_opacity, s.dot_opacity, s.pip_outline_opacity]).toEqual([1, 0.33, 0]);
  });
  it("lo que no es un número toma el valor por defecto en vez de romper", () => {
    const s = clampSettings({ pip_width: "abc", pip_height: NaN, pip_gap: "", dot_size: null, color_g: undefined });
    expect([s.pip_width, s.pip_height, s.pip_gap, s.dot_size, s.color_g]).toEqual([2, 16, 4, 4, 255]);
  });
  it("los booleanos aceptan true / \"true\" y todo lo demás es false", () => {
    expect(clampSettings({ themed: true }).themed).toBe(true);
    expect(clampSettings({ themed: "true" }).themed).toBe(true);
    expect(clampSettings({ themed: "yes", pip_gap_static: 1 }).themed).toBe(false);
    expect(clampSettings({ pip_gap_static: "1" }).pip_gap_static).toBe(true);
  });
  it("descarta campos desconocidos (no se cuelan hacia la API)", () => {
    expect(clampSettings({ evil: "x", __proto__: { a: 1 } } as Record<string, unknown>)).not.toHaveProperty("evil");
  });
});

describe("toQuery", () => {
  it("convierte booleanos a texto y mantiene los números", () => {
    const q = toQuery({ ...DEFAULTS, themed: true });
    expect(q.themed).toBe("true");
    expect(q.pip_width).toBe(2);
    expect(Object.keys(q)).toHaveLength(20);
  });
});

describe("colores", () => {
  it("ida y vuelta RGB ↔ hex", () => {
    expect(toHex(255, 0, 128)).toBe("#ff0080");
    expect(fromHex("#ff0080")).toEqual([255, 0, 128]);
    expect(fromHex("FF0080")).toEqual([255, 0, 128]);
  });
  it("hex inválido → null", () => {
    expect(fromHex("#fff")).toBeNull();
    expect(fromHex("zzzzzz")).toBeNull();
  });
});

describe("isValidCode", () => {
  it("acepta un código con el formato del ejemplo", () => {
    expect(isValidCode("DL.AQDAdYkfAQK4NAKGAgIOAQWik5vGAgIFZmFsc2UCDgEFxvj3.gYCBWZhbHNlAgoBBe2f6qYGAgEyAgsB%3D")).toBe(true);
  });
  it("rechaza lo que no empieza por DL., lo vacío, lo enorme y los caracteres raros", () => {
    for (const bad of ["", "DL.", "abc", "XX.abcd", "DL.abc def", "DL.<script>", "DL." + "a".repeat(3000)]) expect(isValidCode(bad)).toBe(false);
  });
});

describe("crosshairShapes", () => {
  it("con los valores por defecto: 4 barras a 4 del centro, punto de 4", () => {
    const s = crosshairShapes(DEFAULTS);
    expect(s.pips).toHaveLength(4);
    expect(s.pips[0]).toEqual({ x: -1, y: -20, w: 2, h: 16 }); // arriba
    expect(s.pips[1]).toEqual({ x: -1, y: 4, w: 2, h: 16 }); // abajo
    expect(s.pips[2]).toEqual({ x: -20, y: -1, w: 16, h: 2 }); // izquierda
    expect(s.pips[3]).toEqual({ x: 4, y: -1, w: 16, h: 2 }); // derecha
    expect(s.dot).toEqual({ r: 2 });
  });
  it("el contorno envuelve a la barra a distancia hueco + borde/2", () => {
    const s = crosshairShapes({ ...DEFAULTS, pip_outline_border: 2, pip_outline_gap: 1 }); // o = 2
    expect(s.pipOutlines[0]).toEqual({ x: -3, y: -22, w: 6, h: 20 });
  });
  it("sin borde no hay contorno; con tamaño 0 no hay punto ni barras", () => {
    expect(crosshairShapes({ ...DEFAULTS, pip_outline_border: 0 }).pipOutlines).toEqual([]);
    expect(crosshairShapes({ ...DEFAULTS, dot_size: 0 }).dot).toBeNull();
    expect(crosshairShapes({ ...DEFAULTS, pip_width: 0 }).pips).toEqual([]);
  });
  it("el contorno del punto crece con hueco y borde", () => {
    expect(crosshairShapes({ ...DEFAULTS, dot_size: 6, dot_outline_border: 2, dot_outline_gap: 1 }).dotOutline).toEqual({ r: 5 });
  });
});
