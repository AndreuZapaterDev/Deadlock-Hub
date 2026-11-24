/* Service worker de Deadlock Hub (sección 8.1 de la spec).
 *
 * Estrategias:
 *  - Estáticos de la web (/_next/static, iconos, fuentes): cache-first.
 *  - Imágenes (retratos e iconos de la API): cache-first con límite de 200 y 30 días.
 *  - Wiki (héroes, objetos, mecánicas, NPCs, rangos, herramientas): stale-while-revalidate → se pueden leer sin conexión.
 *  - Todo lo demás (jugadores, partidas, directo, estadísticas): network-first con la última versión guardada como respaldo.
 *  - Sin red y sin copia: página /offline.
 *
 * Se escribe a mano (sin Serwist) porque Next 16 compila con Turbopack, que Serwist aún no soporta.
 * La versión llega en la URL (/sw.js?v=...): cambia en cada build y obliga al navegador a instalar el nuevo worker.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const IMAGES = "images-v1"; // las imágenes no cambian con cada despliegue: se conservan
const OFFLINE_URL = "/offline";
const IMAGE_LIMIT = 200;
const IMAGE_MAX_AGE = 30 * 24 * 3600 * 1000;
const PAGE_LIMIT = 120;

const WIKI = /^\/(heroes|items|mechanics|npcs|ranks|build-planner|crosshair|about)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE_URL, "/icons/192"])));
  // No se llama a skipWaiting() aquí: el usuario decide cuándo recargar (aviso "Nueva versión disponible").
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if ((key.startsWith("static-") && key !== STATIC) || (key.startsWith("pages-") && key !== PAGES)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function imageStrategy(request) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(request);
  if (hit) {
    const at = Number(hit.headers.get("x-cached-at") || 0);
    if (!at || Date.now() - at < IMAGE_MAX_AGE) return hit;
  }
  try {
    const res = await fetch(request);
    // Las imágenes de otros dominios llegan "opacas" (status 0): se guardan igual.
    if (res.ok || res.type === "opaque") {
      cache.put(request, res.clone());
      trim(IMAGES, IMAGE_LIMIT);
    }
    return res;
  } catch (e) {
    if (hit) return hit;
    throw e;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(PAGES);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) {
        cache.put(request, res.clone());
        trim(PAGES, PAGE_LIMIT);
      }
      return res;
    })
    .catch(() => undefined);
  return hit || (await network) || offline(request);
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok) {
      cache.put(request, res.clone());
      trim(PAGES, PAGE_LIMIT);
    }
    return res;
  } catch {
    return (await cache.match(request)) || offline(request);
  }
}

async function offline(request) {
  if (request.mode === "navigate") return (await caches.match(OFFLINE_URL)) || Response.error();
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.destination === "image" && (url.origin !== self.location.origin || url.pathname.startsWith("/icons/"))) {
    event.respondWith(imageStrategy(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  // /api es para datos vivos (directo, crosshair…): nunca de caché.
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || request.destination === "font") {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (WIKI.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  // Navegaciones y cargas RSC del resto de páginas.
  event.respondWith(networkFirst(request));
});
