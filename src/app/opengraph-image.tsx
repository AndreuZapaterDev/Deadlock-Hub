import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { OG_SIZE, OgCard } from "@/lib/brand-image";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Deadlock Hub: wiki, estadísticas y tracker de Deadlock";

export default async function Image() {
  const t = await getTranslations("site");
  return new ImageResponse(<OgCard title="Deadlock Hub" subtitle={t("ogSubtitle")} kicker={t("ogKicker")} />, size);
}
