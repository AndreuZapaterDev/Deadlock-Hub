/** URL pública de la web (SEO, sitemap, imágenes Open Graph). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://deadlockhub.vercel.app").replace(/\/$/, "");

// Colores del modo Noche para las imágenes generadas (iconos y Open Graph). Son los mismos valores que `--poster`, `--brass`…
// de globals.css: las imágenes se dibujan fuera del DOM y no pueden leer variables CSS.
export const BRAND = { night: "#101E1E", poster: "#173F3E", ray: "#276864", brass: "#D6A441", cream: "#F0E6CE", accent: "#C23A22" } as const;

/** Rutas públicas fijas (sin las dinámicas: héroes, objetos y parches, que añade sitemap.ts). */
export const STATIC_ROUTES = [
  "/", "/heroes", "/heroes/compare", "/items", "/tier-list", "/meta", "/lanes", "/counters", "/builds", "/build-planner", "/map", "/ranks",
  "/leaderboard", "/players", "/live", "/patches", "/patches/diff", "/crosshair", "/mechanics", "/npcs", "/about", "/status",
] as const;
