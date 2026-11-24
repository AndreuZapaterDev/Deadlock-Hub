// Se ejecuta una vez al arrancar el servidor. Calienta en segundo plano las respuestas más grandes y usadas (héroes, objetos,
// rangos, estadísticas globales): la primera visita no paga 1-3 s de descarga y análisis de JSON.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getSource } = await import("@/lib/api");
  const api = getSource();
  void Promise.allSettled(
    ["/v1/assets/heroes", "/v1/assets/items", "/v1/assets/ranks", "/v1/assets/npc-units", "/v1/analytics/hero-stats", "/v1/analytics/game-stats", "/v1/matches/active"].map((p) => api.get(p)),
  );
}
