import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Deadlock Hub",
    short_name: "Deadlock Hub",
    description: "Web fan no oficial sobre Deadlock: wiki, estadísticas y tracker de jugadores.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BRAND.night,
    theme_color: BRAND.poster,
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atajos al mantener pulsado el icono (Android): lo que más se consulta mientras se juega.
    shortcuts: [
      { name: "Buscar jugador", url: "/players" },
      { name: "En directo", url: "/live" },
      { name: "Tier list", url: "/tier-list" },
    ],
  };
}
