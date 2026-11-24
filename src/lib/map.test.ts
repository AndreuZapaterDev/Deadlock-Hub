import { describe, expect, it } from "vitest";
import { buildHeat, heatRange, intensity, parseObjective, worldToRel } from "./map";

describe("worldToRel", () => {
  it("el centro del mundo es el centro del mapa", () => {
    expect(worldToRel(0, 0, 10752)).toEqual({ left: 0.5, top: 0.5 });
  });
  it("coincide con las posiciones relativas de la API (campamento dock_camp y cámara)", () => {
    expect(worldToRel(-9248, 0, 10752).left).toBeCloseTo(0.06994, 4);
    const v = worldToRel(3248, -1888, 10752);
    expect(v.left).toBeCloseTo(0.651, 3);
    expect(v.top).toBeCloseTo(0.5878, 3);
  });
  it("y positiva queda arriba", () => {
    expect(worldToRel(0, 5000, 10000).top).toBeLessThan(0.5);
  });
});

describe("buildHeat", () => {
  const pts = [
    { position_x: 0, position_y: 0, kills: 2, deaths: 1 },
    { position_x: 10, position_y: -10, kills: 3, deaths: 4 }, // misma celda
    { position_x: -32768, position_y: -32768, kills: 99, deaths: 99 }, // centinela fuera del mapa
  ];
  it("suma los puntos de la misma celda y descarta los de fuera", () => {
    const h = buildHeat(pts, 10752, 48);
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ kills: 5, deaths: 5 });
  });
});


describe("parseObjective", () => {
  it("lee equipo, tipo y carril", () => {
    expect(parseObjective("team1_tier2_3")).toEqual({ team: 1, kind: "tier2", lane: 3 });
    expect(parseObjective("team0_core")).toEqual({ team: 0, kind: "core", lane: undefined });
  });
  it("rechaza claves desconocidas", () => {
    expect(parseObjective("otra_cosa")).toBeNull();
  });
});

import { DEFAULT_LAYERS, ENTITY_KINDS, heatStats, layersToParam, parseLayers, ziplineToRel } from "./map";

describe("capas del mapa", () => {
  it("sin parámetro: capas por defecto; con parámetro, solo las conocidas y sin repetir", () => {
    expect(parseLayers(undefined)).toEqual(DEFAULT_LAYERS);
    expect(parseLayers("zip,heat,zip,inventada")).toEqual(["zip", "heat"]);
    expect(parseLayers("")).toEqual([]);
  });
  it("la URL solo lleva las capas si difieren de las de por defecto", () => {
    expect(layersToParam(DEFAULT_LAYERS)).toBeNull();
    expect(layersToParam([...DEFAULT_LAYERS].reverse())).toBeNull();
    expect(layersToParam(["zip", "crates"])).toBe("crates,zip");
  });
  it("ninguna entidad se repite y todas tienen texto", () => {
    expect(new Set(ENTITY_KINDS.map((e) => e.key)).size).toBe(ENTITY_KINDS.length);
    expect(ENTITY_KINDS.every((e) => e.label && e.text)).toBe(true);
  });
});

describe("ziplineToRel", () => {
  it("suma el origen, convierte a posición relativa y descarta trazados vacíos", () => {
    const z = ziplineToRel({ origin: [0, 0, 0], color: "#fff", P0_points: [[0, 0, 0], [1075.2, 0, 0]], P1_points: [] }, 10752);
    expect(z.paths).toHaveLength(1);
    expect(z.paths[0][0]).toEqual([0.5, 0.5]);
    expect(z.paths[0][1][0]).toBeCloseTo(0.55, 3);
  });
});

describe("heatStats", () => {
  it("totales y máximos", () => {
    expect(heatStats([{ col: 0, row: 0, kills: 2, deaths: 5 }, { col: 1, row: 0, kills: 7, deaths: 1 }])).toEqual({ kills: 9, deaths: 6, maxKills: 7, maxDeaths: 5 });
  });
});

import { buildScene } from "./map";

describe("buildScene", () => {
  const map = {
    radius: 10752,
    images: { minimap: "m.png", mid_tunnels: "t.png", rat_tunnels: "r.png" },
    objective_positions: { team0_core: { left_relative: 0.3, top_relative: 0.9 }, raro: { left_relative: 0, top_relative: 0 } },
    neutral_camps: [{ name: "dock_camp", kind: "strong", position: [-9248.4, 0.2, 288], left_relative: 0.07, top_relative: 0.5 }],
    zipline_paths: [{ origin: [0, 0, 0], color: "#abc", P0_points: [[0, 0, 0], [100, 100, 0]] }],
    entities: {
      teleporters: [{ position: [-3904, 1792, -128], left_relative: 0.3185, top_relative: 0.4167, target: [3584, 2656, -128] }],
      shops: [{ position: [1, 2, 3], left_relative: 0.1, top_relative: 0.2, team: 0, kind: "lane" }],
      desconocida: [{ position: [0, 0, 0], left_relative: 0, top_relative: 0 }],
    },
  };
  it("filtra lo desconocido, redondea y calcula el destino de los teletransportadores", () => {
    const s = buildScene(map, [], true);
    expect(s.objectives.map((o) => o.key)).toEqual(["team0_core"]);
    expect(s.camps[0].world).toEqual([-9248, 0]);
    expect(s.entities.map((e) => e.kind)).toEqual(["teleporters", "shops"]);
    expect(s.entities[0].target?.left).toBeCloseTo(0.6667, 3);
    expect(s.entities[1]).toMatchObject({ team: 0, shopKind: "lane" });
    expect(s.zips).toHaveLength(1);
  });
  it("sin imágenes remotas no lleva ninguna URL", () => {
    expect(buildScene(map, [], false).images).toEqual({});
    expect(buildScene(map, [], true).images).toEqual({ minimap: "m.png", tunnels: "t.png", rats: "r.png" });
  });
});

describe("heatRange e intensity", () => {
  const values = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
  it("el rango sale de los percentiles 25 y 97, ignorando ceros", () => {
    const { lo, hi } = heatRange([0, 0, ...values]);
    expect(lo).toBe(26);
    expect(hi).toBe(98);
  });
  it("por debajo de lo no se pinta, por encima de hi es 1 y en medio crece", () => {
    const { lo, hi } = heatRange(values);
    expect(intensity(lo, lo, hi)).toBe(0);
    expect(intensity(5, lo, hi)).toBe(0);
    expect(intensity(hi, lo, hi)).toBe(1);
    expect(intensity(10_000, lo, hi)).toBe(1);
    const mid = intensity((lo + hi) / 2, lo, hi);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });
  it("sin datos o con todos los valores iguales no divide por cero", () => {
    expect(heatRange([])).toEqual({ lo: 0, hi: 1 });
    const same = heatRange([7, 7, 7]);
    expect(same.hi).toBeGreaterThan(same.lo);
    expect(Number.isFinite(intensity(7, same.lo, same.hi))).toBe(true);
  });
});
