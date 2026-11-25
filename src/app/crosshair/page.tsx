import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CrosshairEditor } from "@/components/tools/crosshair-editor";
import { PosterHeader } from "@/components/ui/poster-header";
import { clampSettings } from "@/lib/crosshair";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("crosshair");
  return { title: t("title"), description: t("metaDesc") };
}

export default async function CrosshairPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // Los ajustes de la URL (enlace compartido) se sanean: lo inválido toma el valor por defecto
  const t = await getTranslations("crosshair");
  const initial = clampSettings(await searchParams);
  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("header")} subtitle={t("subtitle")} />
      <CrosshairEditor initial={initial} />
    </div>
  );
}
