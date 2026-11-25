import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
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
  const [t, tl, th] = await Promise.all([getTranslations("heroPage"), getTranslations("labels"), getTranslations("heroes")]);
  if (!hero) return new ImageResponse(<OgCard title="Deadlock Hub" kicker={th("title")} />, size);
  const subtitle = [heroTypeLabel(tl, hero.hero_type), difficultyLabel(tl, hero.complexity)].filter(Boolean).join(" · ");
  return new ImageResponse(<OgCard title={hero.name} subtitle={subtitle} kicker={t("ogKicker")} />, size);
}
