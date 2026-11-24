import { describe, expect, it } from "vitest";
import { buildFlowSankey } from "./sankey";

const flow = {
  nodes: [
    { column: 0, item_id: 1, matches: 100 }, { column: 0, item_id: 2, matches: 50 }, { column: 0, item_id: 3, matches: 5 },
    { column: 1, item_id: 10, matches: 80 }, { column: 1, item_id: 11, matches: 20 },
  ],
  edges: [
    { from_column: 0, from_item_id: 1, to_item_id: 10, matches: 60 },
    { from_column: 0, from_item_id: 2, to_item_id: 11, matches: 15 },
    { from_column: 0, from_item_id: 3, to_item_id: 10, matches: 4 }, // origen descartado
    { from_column: 0, from_item_id: 1, to_item_id: 99, matches: 9 }, // destino que no existe
  ],
};
const name = (id: number) => `Objeto ${id}`;

describe("buildFlowSankey", () => {
  it("se queda con los más comprados de cada columna", () => {
    const s = buildFlowSankey(flow, name, 2);
    expect(s.nodes.map((n) => n.name)).toEqual(["Objeto 1", "Objeto 2", "Objeto 10", "Objeto 11"]);
    expect(s.nodes.map((n) => n.column)).toEqual([0, 0, 1, 1]);
  });
  it("descarta enlaces con origen o destino fuera", () => {
    const s = buildFlowSankey(flow, name, 2);
    expect(s.links).toEqual([{ source: 0, target: 2, value: 60 }, { source: 1, target: 3, value: 15 }]);
  });
  it("sin datos: vacío", () => {
    expect(buildFlowSankey({ nodes: [], edges: [] }, name)).toEqual({ nodes: [], links: [] });
  });
});
