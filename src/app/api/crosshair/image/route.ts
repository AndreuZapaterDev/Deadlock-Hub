import { getSource } from "@/lib/api";
import { clampSettings, toQuery } from "@/lib/crosshair";

// Imagen oficial del crosshair (la genera la API). Se devuelve como PNG para poder usarla en un <img>.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const scale = Math.min(16, Math.max(1, Math.round(Number(params.scale)) || 4));
  try {
    const r = await getSource().get<Buffer | ArrayBuffer>("/v1/crosshair/settings/image", { ...toQuery(clampSettings(params)), screen_height: 1080, scale });
    if (r.status >= 400 || !r.data) return new Response("No se ha podido generar la imagen", { status: r.status >= 400 ? r.status : 502 });
    const bytes = Buffer.isBuffer(r.data) ? new Uint8Array(r.data) : new Uint8Array(r.data as ArrayBuffer);
    return new Response(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "public, s-maxage=86400" } });
  } catch {
    return new Response("No se ha podido generar la imagen", { status: 502 });
  }
}
