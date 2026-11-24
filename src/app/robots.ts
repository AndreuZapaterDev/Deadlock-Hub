import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /api es para el propio navegador (proxy con caché) y /styleguide es solo de desarrollo.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/styleguide"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
