import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PosterHeader } from "@/components/ui/poster-header";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("offline");
  return { title: t("title"), robots: { index: false } };
}

// El service worker la guarda al instalarse y la muestra cuando no hay red ni copia de la página pedida.
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <div className="space-y-8">
      <PosterHeader title={t("title")} subtitle={t("subtitle")}>
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/heroes">{t("heroes")}</Button>
          <Button href="/items" variant="secondary">{t("items")}</Button>
        </div>
      </PosterHeader>
      <p className="mx-auto max-w-prose text-center text-ink-muted">{t("text")}</p>
    </div>
  );
}
