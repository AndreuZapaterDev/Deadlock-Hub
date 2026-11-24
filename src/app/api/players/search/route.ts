import { searchPlayers } from "@/lib/player-data";

// Autocompletado del buscador. El navegador llama aquí, nunca a la API externa: así se cachea y se respeta el rate limit.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 64) return Response.json({ results: [] });
  const results = (await searchPlayers(q)).slice(0, 8);
  return Response.json({ results }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
