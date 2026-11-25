import { getHeroes, getItems } from "@/lib/lookup";
import { slugify } from "@/lib/slug";

// Índice compacto para la paleta de búsqueda (Ctrl+K): héroes y objetos de tienda en el idioma elegido. Se cachea en el CDN una hora.
export async function GET() {
  try {
    const [heroes, items] = await Promise.all([getHeroes(), getItems()]);
    return Response.json(
      {
        heroes: heroes.map((h) => ({ n: h.name, href: `/heroes/${slugify(h.name)}` })),
        items: items.filter((i) => i.type === "upgrade" && i.shopable).map((i) => ({ n: i.name, href: `/items/${i.class_name}` })),
      },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return Response.json({ heroes: [], items: [] }, { status: 502 });
  }
}
