import { defineConfig, devices } from "@playwright/test";

// Los tests e2e se ejecutan con `docker compose run --rm e2e` contra la vista previa de producción (servicio `preview`) y la API
// REAL de Deadlock: necesitan conexión a internet y que la API esté operativa. Por eso hay tiempos generosos (una consulta nueva
// puede tardar varios segundos en la API) y un reintento.
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil", use: { ...devices["Pixel 5"] } },
  ],
});
