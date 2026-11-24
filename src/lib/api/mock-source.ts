import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createResolver, type Manifest } from "./manifest-resolver";
import { ApiError, type ApiResult, type DataSource, type Query } from "./types";

const FIX = join(process.cwd(), "mock", "deadlock-mock", "fixtures");
const parsed = new Map<string, unknown>(); // los ficheros grandes se parsean una sola vez

let resolver: ReturnType<typeof createResolver> | undefined;
function getResolver() {
  if (!resolver) {
    const manifest = JSON.parse(readFileSync(join(FIX, "manifest.json"), "utf8")) as Manifest;
    const spec = JSON.parse(readFileSync(join(FIX, manifest.routes["/openapi.json"].file), "utf8"));
    resolver = createResolver(manifest, Object.keys(spec.paths));
  }
  return resolver;
}

/**
 * Cuentas y partidas de DEMOSTRACIÓN solo del modo mock: los fixtures tienen un único ejemplo por endpoint, así que no hay
 * forma de ver los estados de error del tracker. `/players/403` (privado), `/players/404` (no existe),
 * `/players/503` (API ocupada) y `/matches/404`. No existen en la API real.
 */
const DEMO_STATUS: Record<string, number> = { "403": 403, "404": 404, "503": 503 };
const DEMO_MESSAGE: Record<number, string> = { 403: "Forbidden", 404: "Not found", 503: "Service unavailable" };
export function demoErrorStatus(path: string): number | null {
  const player = /^\/v1\/players\/(\d+)(?:\/|$)/.exec(path);
  if (player && DEMO_STATUS[player[1]]) return DEMO_STATUS[player[1]];
  return /^\/v1\/matches\/404\//.test(path) ? 404 : null;
}

export const mockSource: DataSource = {
  async get<T>(path: string, query: Query = {}): Promise<ApiResult<T>> {
    const demo = demoErrorStatus(path);
    if (demo) return { status: demo, contentType: "application/json", data: { status: demo, error: DEMO_MESSAGE[demo] } as T, match: "exact" };
    const q = Object.fromEntries(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
    const hit = getResolver()(path, q);
    if (!hit) throw new ApiError(404, `Mock: sin fixture para ${path}`);

    const latency = Number(process.env.MOCK_LATENCY_MS ?? 0);
    if (latency > 0) await new Promise((r) => setTimeout(r, latency));

    const { file, status, content_type } = hit.entry;
    const isJson = content_type.includes("json");
    let data = parsed.get(file);
    if (data === undefined) {
      const raw = readFileSync(join(FIX, file));
      data = isJson ? JSON.parse(raw.toString("utf8")) : raw;
      if (isJson) parsed.set(file, data);
    }
    return { status, contentType: content_type, data: data as T, match: hit.match };
  },
};
