import { getSource } from "@/lib/api";
import { clampSettings, isValidCode } from "@/lib/crosshair";

// Código → ajustes. Se valida el formato y el tamaño del código antes de enviarlo a la API.
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!isValidCode(code)) return Response.json({ error: "apiBadFormat" }, { status: 400 });
  try {
    const r = await getSource().get<Record<string, unknown>>("/v1/crosshair/code/settings", { code });
    if (r.status >= 400) return Response.json({ error: r.status === 400 || r.status === 404 ? "apiUnknownCode" : "apiReadError" }, { status: r.status });
    return Response.json({ settings: clampSettings(r.data ?? {}) }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch {
    return Response.json({ error: "apiReadError" }, { status: 502 });
  }
}
