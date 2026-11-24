import { forgetCached, httpSource } from "@/lib/api/http-source";
import { parseAccountId } from "@/lib/steam-id";

/**
 * "Actualizar historial". Solo se llama desde el botón con cooldown, nunca automáticamente: `force_refetch` está limitado a unas
 * 5 peticiones por hora y clave de la API. Pide a la API que vuelva a descargar el historial y olvida lo que había en memoria para
 * que la página muestre lo nuevo.
 */
export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseAccountId((await ctx.params).id);
  if (id === null) return Response.json({ error: "Cuenta no válida" }, { status: 400 });
  try {
    const r = await httpSource.get(`/v1/players/${id}/match-history`, { force_refetch: true });
    if (r.status === 429) return Response.json({ error: "Demasiadas actualizaciones: prueba más tarde" }, { status: 429 });
    if (r.status >= 400) return Response.json({ error: "La API no ha podido actualizar el historial" }, { status: r.status });
    forgetCached(`/v1/players/${id}/match-history`);
    return Response.json({ ok: true, accountId: id });
  } catch {
    return Response.json({ error: "La API no responde" }, { status: 502 });
  }
}
