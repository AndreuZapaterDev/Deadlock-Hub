import { loadLive } from "@/lib/live-data";

// El navegador refresca /live desde aquí (nunca llama directamente a la API externa).
export async function GET() {
  try {
    const data = await loadLive();
    return Response.json(data, { status: data.ok ? 200 : data.status, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } });
  } catch {
    return Response.json({ ok: false, status: 502 }, { status: 502 });
  }
}
