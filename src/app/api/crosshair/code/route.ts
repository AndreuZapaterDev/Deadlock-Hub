import { getSource } from "@/lib/api";
import { clampSettings, toQuery } from "@/lib/crosshair";

// Ajustes → código. Los ajustes se sanean (rangos, campos desconocidos fuera) antes de llegar a la API.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  try {
    const r = await getSource().get<{ code: string }>("/v1/crosshair/settings/code", toQuery(clampSettings(params)));
    if (r.status >= 400 || typeof r.data?.code !== "string") return Response.json({ error: "apiCodeError" }, { status: r.status >= 400 ? r.status : 502 });
    return Response.json({ code: r.data.code }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  } catch {
    return Response.json({ error: "apiCodeError" }, { status: 502 });
  }
}
