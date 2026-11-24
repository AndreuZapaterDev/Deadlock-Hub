import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/brand-image";
import { getHeroBySlug } from "@/lib/lookup";
import { difficultyLabel, heroTypeLabel } from "@/lib/labels";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Ficha de héroe de Deadlock Hub";
export const revalidate = 43200;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hero = await getHeroBySlug(slug).catch(() => undefined);
  if (!hero) return new ImageResponse(<OgCard title="Deadlock Hub" kicker="Héroes" />, size);
  const subtitle = [heroTypeLabel(hero.hero_type), difficultyLabel(hero.complexity)].filter(Boolean).join(" · ");
  return new ImageResponse(<OgCard title={hero.name} subtitle={subtitle} kicker="Héroe de Deadlock" />, size);
}
