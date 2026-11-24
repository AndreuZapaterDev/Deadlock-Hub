import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetCached, httpSource } from "./http-source";
import { getSource } from "./index";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("getSource", () => {
  it("toda la web lee de la API real", () => {
    expect(getSource()).toBe(httpSource);
  });
});

describe("httpSource (fetch simulado)", () => {
  it("pide los assets en español, manda X-Api-Key y devuelve el estado", async () => {
    vi.stubEnv("DEADLOCK_API_KEY", "clave-test");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json([{ id: 1 }]));
    const r = await httpSource.get("/v1/assets/ranks", { only_active: true });
    const [url, init] = f.mock.calls[0] as [URL, RequestInit];
    expect(url.origin).toBe("https://api.deadlock-api.com");
    expect(url.searchParams.get("language")).toBe("spanish");
    expect(url.searchParams.get("only_active")).toBe("true");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("clave-test");
    expect(r).toMatchObject({ status: 200, data: [{ id: 1 }] });
  });

  it("sin clave configurada no manda X-Api-Key", async () => {
    vi.stubEnv("DEADLOCK_API_KEY", "");
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json([]));
    await httpSource.get("/v1/analytics/game-stats");
    expect((f.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("X-Api-Key");
  });

  it("no añade language fuera de los assets (builds usa otro enum)", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json([]));
    await httpSource.get("/v1/builds");
    expect((f.mock.calls[0][0] as URL).searchParams.has("language")).toBe(false);
  });

  it("reintenta el 503 respetando Retry-After y acaba devolviendo el 200", async () => {
    const f = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json({}, 503, { "retry-after": "0" }))
      .mockResolvedValueOnce(json({ ok: true }));
    const r = await httpSource.get("/v1/analytics/hero-ban-stats");
    expect(f).toHaveBeenCalledTimes(2);
    expect(r.status).toBe(200);
  });

  it("no reintenta el 504 ni el 429 de una consulta normal: los devuelve tal cual", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(json({}, 504));
    expect((await httpSource.get("/v1/analytics/hero-synergy-stats")).status).toBe(504);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("los errores 4xx se devuelven como resultado (las páginas los tratan), sin excepción", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ error: "forbidden" }, 403));
    expect((await httpSource.get("/v1/players/1/rank")).status).toBe(403);
  });

  it("peticiones idénticas simultáneas comparten una sola llamada", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => { await new Promise((r) => setTimeout(r, 20)); return json([{ id: 1 }]); });
    const [a, b] = await Promise.all([httpSource.get("/v1/analytics/item-stats"), httpSource.get("/v1/analytics/item-stats")]);
    expect(f).toHaveBeenCalledTimes(1);
    expect(a.data).toEqual(b.data);
  });
});

describe("caché en memoria de las respuestas grandes", () => {
  it("la segunda petición no sale a la red hasta que se olvida (p. ej. tras «Actualizar historial»)", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => json([{ match_id: 1 }]));
    const path = "/v1/players/123456/match-history";
    await httpSource.get(path);
    await httpSource.get(path);
    expect(f).toHaveBeenCalledTimes(1);
    forgetCached("/v1/players/123456/match-history");
    await httpSource.get(path);
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe("consultas lentas (kill-death-stats)", () => {
  it("reintenta el 504 y devuelve el resultado cuando la API ya lo tiene calculado", async () => {
    const f = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("error code: 504", { status: 504, headers: { "content-type": "text/plain" } }))
      .mockResolvedValueOnce(json([{ kills: 1 }]));
    const r = await httpSource.get("/v1/analytics/kill-death-stats", { hero_ids: 99 });
    expect(f).toHaveBeenCalledTimes(2);
    expect(r.status).toBe(200);
  });
});
