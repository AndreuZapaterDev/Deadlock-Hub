import { parseAccountId } from "@/lib/steam-id";

/**
 * "Actualizar historial". Solo se llama desde el botón con cooldown, nunca automáticamente
 * (`force_refetch` está limitado a unas 5 peticiones por hora y clave).
 * En modo mock no hay nada que refrescar; el refetch real llega con `httpSource` (fase 9).
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseAccountId((await ctx.params).id);
  if (id === null) return Response.json({ error: "Cuenta no válida" }, { status: 400 });
  if (process.env.DATA_SOURCE === "api") return Response.json({ error: "Aún no implementado" }, { status: 501 });
  return Response.json({ ok: true, mock: true, accountId: id });
}
