import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Versión del service worker: cambia en cada build (la URL /sw.js?v=... obliga al navegador a instalar el nuevo).
  env: { NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? String(Date.now()) },
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
  // Con la API real, 19 workers prerenderizando a la vez saturan el rate limit (429) y cortan descargas: se limitan.
  ...(process.env.NODE_ENV === "production" ? { experimental: { cpus: 3 } } : {}),
  // Dominios de las imágenes de la API (héroes, objetos, minimapa) y de los avatares de Steam.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets-bucket.deadlock-api.com" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
    ],
  },
};

export default createNextIntlPlugin()(nextConfig);
