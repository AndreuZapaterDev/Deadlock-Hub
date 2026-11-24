import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PosterHeader } from "@/components/ui/poster-header";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="space-y-8">
      <PosterHeader title="404" subtitle={t("notFound.subtitle")}>
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/">{t("notFound.home")}</Button>
          <Button href="/players" variant="secondary">{t("notFound.searchPlayer")}</Button>
          <Button href="/heroes" variant="ghost">{t("home.seeHeroes")}</Button>
        </div>
      </PosterHeader>
      <p className="mx-auto max-w-prose text-center text-ink-muted">{t("notFound.text")}</p>
    </div>
  );
}
