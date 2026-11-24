import type { MetadataRoute } from "next";
import { getHeroes, getItems } from "@/lib/lookup";
import { loadPatches } from "@/lib/patch-data";
import { SITE_URL, STATIC_ROUTES } from "@/lib/site";
import { slugify } from "@/lib/slug";

export const revalidate = 43200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [heroes, items, patches] = await Promise.all([getHeroes().catch(() => []), getItems().catch(() => []), loadPatches().catch(() => null)]);
  const url = (path: string) => `${SITE_URL}${path}`;
  return [
    ...STATIC_ROUTES.map((p) => ({ url: url(p), changeFrequency: "daily" as const, priority: p === "/" ? 1 : 0.7 })),
    ...heroes.map((h) => ({ url: url(`/heroes/${slugify(h.name)}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...items.filter((i) => i.type === "upgrade").map((i) => ({ url: url(`/items/${i.class_name}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...(patches?.ok ? patches.data.map((p) => ({ url: url(`/patches/${p.id}`), lastModified: new Date(p.date), changeFrequency: "yearly" as const, priority: 0.4 })) : []),
  ];
}
