import { describe, expect, it, vi } from "vitest";
import { createResolver, type Manifest } from "./manifest-resolver";
import { mockSource } from "./mock-source";
import { httpSource } from "./http-source";
import { ApiError } from "./types";

const entry = (file: string, status = 200) => ({ file, status, content_type: "application/json" });
const manifest: Manifest = {
  routes: {
    "/v1/a?x=1": entry("a1.json"),
    "/v1/a?x=1&y=2": entry("a12.json"),
    "/v1/items/5": entry("item5.json"),
    "/v1/bad": entry("bad.json", 500),
  },
};
const resolve = createResolver(manifest, ["/v1/a", "/v1/items/{id}", "/v1/bad"]);

describe("manifest resolver", () => {
  it("ruta exacta (query ordenada)", () => {
    expect(resolve("/v1/a", { y: "2", x: "1" })).toMatchObject({ match: "exact", entry: { file: "a12.json" } });
  });
  it("misma ruta: la query guardada que más parámetros comparte", () => {
    expect(resolve("/v1/a", { x: "1", z: "9" })).toMatchObject({ match: "same-path", entry: { file: "a1.json" } });
  });
  it("plantilla OpenAPI: otro id devuelve el fixture guardado", () => {
    expect(resolve("/v1/items/999")).toMatchObject({ match: "template", entry: { file: "item5.json" } });
  });
  it("conserva el estado guardado (500)", () => {
    expect(resolve("/v1/bad")?.entry.status).toBe(500);
  });
  it("sin fixture devuelve null", () => {
    expect(resolve("/v1/nope")).toBeNull();
  });
});

describe("mockSource (fixtures reales)", () => {
  it("héroes: exacta", async () => {
    const r = await mockSource.get<unknown[]>("/v1/assets/heroes");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
  });
  it("otra cuenta devuelve el mismo ejemplo por plantilla", async () => {
    const r = await mockSource.get("/v1/players/1/rank");
    expect(r.status).toBe(200);
    expect(r.match).toBe("template");
  });
  it("devuelve el 500 real de live/url", async () => {
    expect((await mockSource.get("/v1/matches/1/live/url")).status).toBe(500);
  });
  it("ruta desconocida lanza ApiError 404", async () => {
    await expect(mockSource.get("/v1/no-existe")).rejects.toMatchObject({ status: 404 });
  });
});

describe("cuentas de demostración del mock (estados de error del tracker)", () => {
  it("403, 404 y 503 devuelven ese estado", async () => {
    expect((await mockSource.get("/v1/players/403/rank")).status).toBe(403);
    expect((await mockSource.get("/v1/players/404/match-history")).status).toBe(404);
    expect((await mockSource.get("/v1/players/503/hero-stats")).status).toBe(503);
    expect((await mockSource.get("/v1/matches/404/metadata")).status).toBe(404);
  });
  it("una cuenta normal sigue devolviendo el ejemplo (200)", async () => {
    expect((await mockSource.get("/v1/players/483770846/rank")).status).toBe(200);
    expect((await mockSource.get("/v1/players/4030/rank")).status).toBe(200);
    expect((await mockSource.get("/v1/matches/142529961/metadata")).status).toBe(200);
  });
});

describe("modo mock sin red", () => {
  it("httpSource lanza si DATA_SOURCE no es api y nunca llama a fetch", async () => {
    const f = vi.spyOn(globalThis, "fetch");
    await expect(httpSource.get("/v1/assets/heroes")).rejects.toBeInstanceOf(ApiError);
    expect(f).not.toHaveBeenCalled();
  });
});
