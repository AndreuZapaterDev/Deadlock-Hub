import "server-only";
import { getLanguage } from "@/lib/language";
import { DEFAULT_LANGUAGE } from "@/lib/languages";
import { ApiError, type ApiResult, type DataSource, type Query } from "./types";

const BASE_URL = (process.env.DEADLOCK_API_BASE_URL ?? "https://api.deadlock-api.com").replace(/\/$/, "");
const TIMEOUT_MS = 15_000;
/** Consultas que la API calcula despacio (decenas de millones de filas): más tiempo y, si da 504, se reintenta (el cálculo queda en su caché y el segundo intento suele salir al instante). */
const SLOW = /^\/v1\/analytics\/kill-death-stats/;
const SLOW_TIMEOUT_MS = 50_000;
const SLOW_RETRIES = 2;
const MAX_RETRIES = 3;
const MAX_PARALLEL = 5; // la spec pide no más de ~5 peticiones en paralelo a la API externa

/** Idioma de los textos del juego. Solo lo admiten los assets (en `/v1/builds`, `language` es otro enum numérico). */
// El idioma lo elige el usuario (cookie `lang`, ver lib/language.ts); si no hay cookie, DEADLOCK_API_LANGUAGE o español.
const takesLanguage = (path: string) => path.startsWith("/v1/assets/");

/** Segundos de caché (ISR) según el tipo de dato — sección 8 de la spec. */
export function revalidateFor(path: string): number {
  if (path.startsWith("/v1/assets/")) return 12 * 3600;
  if (path.startsWith("/v1/analytics/")) return 30 * 60;
  if (path.startsWith("/v1/leaderboard/")) return 10 * 60;
  if (path.startsWith("/v1/matches/active") || path.startsWith("/v1/matches/live")) return 60;
  if (path.startsWith("/v2/patches") || path.startsWith("/v1/patches/")) return 3600;
  if (path.startsWith("/v1/info/")) return 60;
  if (path.startsWith("/v1/crosshair/")) return 24 * 3600;
  if (path.startsWith("/v1/builds")) return 10 * 60;
  return 4 * 60; // jugadores, historial, partidas
}

/**
 * Respuestas que superan los 2 MB: la caché de datos de Next las rechaza (y deja un error en el log), así que no se le
 * pasan y se cachean aquí, en memoria, con el mismo TTL.
 */
const LARGE = /^\/v1\/(assets\/(heroes|items|npc-units)$|analytics\/(lane-matchup-stats|kill-death-stats|hero-build-stats|hero-stats$)|players\/\d+\/match-history)/;
/** Tope de memoria: las respuestas de más de este tamaño (en bytes de texto) no se guardan. */
const MAX_CACHED_BYTES = 40_000_000;

type Cached = { at: number; result: ApiResult<unknown> };
const memory = new Map<string, Cached>();
const inflight = new Map<string, Promise<ApiResult<unknown>>>();

// Semáforo sencillo para limitar las peticiones simultáneas.
let active = 0;
const waiting: (() => void)[] = [];
async function acquire() {
  if (active >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  active++;
}
function release() {
  active--;
  waiting.shift()?.();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildUrl(path: string, query: Query, language: string) {
  const url = new URL(BASE_URL + path);
  const q = { ...query };
  if (takesLanguage(path) && q.language === undefined) q.language = language;
  for (const [k, v] of Object.entries(q)) if (v !== undefined) url.searchParams.set(k, String(v));
  return url;
}

function retryDelay(res: Response, attempt: number) {
  const header = Number(res.headers.get("retry-after"));
  const base = Number.isFinite(header) && header > 0 ? header * 1000 : 500 * 2 ** attempt;
  return Math.min(base, 8000);
}

async function request(path: string, url: URL, headers: Record<string, string>): Promise<ApiResult<unknown>> {
  await acquire();
  try {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(SLOW.test(path) ? SLOW_TIMEOUT_MS : TIMEOUT_MS),
          // Las grandes van sin opciones de caché de Next (la rechazaría); se cachean en memoria. `no-store` volvería la página dinámica.
          ...(LARGE.test(path) ? {} : { next: { revalidate: revalidateFor(path) } }),
        });
      } catch (e) {
        if (e instanceof Error && "digest" in e) throw e; // señales internas de Next (p. ej. página dinámica): no son fallos de red
        // Timeout: no se reintenta (como el 504). Fallo de red: backoff exponencial, que en el build absorbe los picos.
        const timedOut = e instanceof Error && e.name === "TimeoutError";
        if (!timedOut && attempt < MAX_RETRIES) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        const c = e instanceof Error ? (e.cause as { code?: string; message?: string } | undefined) : undefined;
        const cause = c ? ` (${c.code ?? c.message})` : "";
        const why = timedOut ? "timed out" : "no connection";
        console.error(`[deadlock-api] ${path}: ${why}${cause}`);
        throw new ApiError(504, `Deadlock API: ${why}`);
      }

      // 504 en una consulta lenta: se reintenta (ver SLOW). En las demás, el 504 y el 429 no se reintentan.
      if (res.status === 504 && SLOW.test(path) && attempt < SLOW_RETRIES) {
        await sleep(1500);
        continue;
      }
      // 503 = base de datos ocupada: backoff exponencial y respeto a Retry-After.
      if (res.status === 503 && attempt < MAX_RETRIES) {
        await sleep(retryDelay(res, attempt));
        continue;
      }
      if (res.status >= 500 || res.status === 429) console.error(`[deadlock-api] ${path} → ${res.status}`);

      const contentType = res.headers.get("content-type") ?? "application/octet-stream";
      let data: unknown;
      let bytes = Number(res.headers.get("content-length")) || 0;
      try {
        if (contentType.includes("json")) {
          const text = await res.text();
          bytes = text.length;
          data = text ? JSON.parse(text) : null;
        } else if (contentType.startsWith("text/")) data = await res.text();
        else data = await res.arrayBuffer();
      } catch {
        // Cuerpo cortado a mitad (conexión reiniciada): se trata como un fallo de red y se reintenta.
        if (attempt < MAX_RETRIES) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        console.error(`[deadlock-api] ${path}: respuesta incompleta`);
        throw new ApiError(502, "Deadlock API: incomplete response");
      }
      return Object.assign({ status: res.status, contentType, data }, { bytes });
    }
  } finally {
    release();
  }
}

export const httpSource: DataSource = {
  async get<T>(path: string, query: Query = {}): Promise<ApiResult<T>> {
    const url = buildUrl(path, query, takesLanguage(path) ? await getLanguage() : DEFAULT_LANGUAGE);
    const key = url.toString();
    const headers: Record<string, string> = { Accept: "application/json, image/*;q=0.9" };
    if (process.env.DEADLOCK_API_KEY) headers["X-Api-Key"] = process.env.DEADLOCK_API_KEY;

    const large = LARGE.test(path);
    if (large) {
      const hit = memory.get(key);
      if (hit && Date.now() - hit.at < revalidateFor(path) * 1000) return hit.result as ApiResult<T>;
    }
    // Peticiones idénticas simultáneas (varios componentes pidiendo lo mismo) comparten una sola llamada.
    let pending = inflight.get(key);
    if (!pending) {
      pending = request(path, url, headers)
        .then((result) => {
          const bytes = (result as { bytes?: number }).bytes ?? 0;
          // Solo se guardan los éxitos y no los gigantes (p. ej. lane-matchup-stats sin filtrar).
          if (large && result.status === 200 && bytes < MAX_CACHED_BYTES) memory.set(key, { at: Date.now(), result });
          return result;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    return (await pending) as ApiResult<T>;
  },
};

/**
 * Olvida las respuestas guardadas en memoria cuya ruta empieza por `pathPrefix` (p. ej. el historial de un jugador tras
 * «Actualizar historial»). Solo afecta a las respuestas grandes que se cachean en memoria; el resto usa la caché de Next.
 */
export function forgetCached(pathPrefix: string) {
  for (const key of memory.keys()) {
    if (new URL(key).pathname.startsWith(pathPrefix)) memory.delete(key);
  }
}
