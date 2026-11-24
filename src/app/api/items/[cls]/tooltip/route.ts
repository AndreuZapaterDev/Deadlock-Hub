import { tooltipData } from "@/components/item/item-tooltip";
import { getItemIndex } from "@/lib/lookup";

// Datos del tooltip de un objeto (JSON pequeño). La tienda tiene 156 objetos y llevar todos los tooltips ya pintados dentro de la
// página sumaba cientos de kB de HTML y miles de nodos; ahora se piden al pasar el ratón (o enfocar) y el navegador los cachea.
export async function GET(_req: Request, { params }: { params: Promise<{ cls: string }> }) {
  const { cls } = await params;
  const { byClass } = await getItemIndex();
  const item = byClass.get(cls);
  if (!item) return Response.json({ error: "No existe" }, { status: 404 });
  return Response.json(tooltipData(item), { headers: { "Cache-Control": "private, max-age=43200", Vary: "Cookie" } });
}
