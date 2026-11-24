import { loadHeat, loadMap } from "@/lib/map-data";
import { parseMapFilters, toHeatSearch } from "@/lib/map-filters";

// Heatmap del mapa para los filtros de la página. La API puede tardar (consultas de decenas de millones de filas) y reintenta
// los 504, así que se amplía el tiempo de la función. El navegador solo habla con este endpoint, nunca con la API externa.
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = parseMapFilters(Object.fromEntries(searchParams)); // valida: lo desconocido o inválido se ignora
  try {
    const map = await loadMap();
    if (!map.ok) return Response.json({ ok: false, status: map.status }, { status: map.status >= 400 ? map.status : 502 });
    const heat = await loadHeat(map.data.radius, filters);
    if (!heat.ok) return Response.json({ ok: false, status: heat.status }, { status: heat.status >= 400 ? heat.status : 502 });
    return Response.json(
      { ok: true, key: toHeatSearch(filters), ...heat.data },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
    );
  } catch {
    return Response.json({ ok: false, status: 502 }, { status: 502 });
  }
}
