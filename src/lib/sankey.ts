import type { FlowData } from "@/lib/types";

export type SankeyData = { nodes: { name: string; column: number }[]; links: { source: number; target: number; value: number }[] };

/**
 * Flujo de objetos por fase: se quedan los `perColumn` objetos más comprados de cada columna y las transiciones
 * entre ellos (de la columna c a la c+1). Los enlaces cuyo origen o destino no se quedaron se descartan.
 */
export function buildFlowSankey(flow: FlowData, name: (itemId: number) => string, perColumn = 4): SankeyData {
  const columns = [...new Set(flow.nodes.map((n) => n.column))].sort((a, b) => a - b);
  const kept = columns.flatMap((c) => flow.nodes.filter((n) => n.column === c).sort((a, b) => b.matches - a.matches).slice(0, perColumn));
  const index = new Map(kept.map((n, i) => [`${n.column}-${n.item_id}`, i]));
  const links = flow.edges
    .map((e) => ({ source: index.get(`${e.from_column}-${e.from_item_id}`), target: index.get(`${e.from_column + 1}-${e.to_item_id}`), value: e.matches }))
    .filter((l): l is { source: number; target: number; value: number } => l.source !== undefined && l.target !== undefined && l.value > 0);
  return { nodes: kept.map((n) => ({ name: name(n.item_id), column: n.column })), links };
}
