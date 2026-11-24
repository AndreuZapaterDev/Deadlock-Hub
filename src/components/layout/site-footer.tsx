import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { NightSkyline } from "@/components/deco";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  return (
    <footer className="mt-20 bg-linear-to-t from-brass/20 to-transparent">
      {/* Fuera de pantalla el navegador no procesa las ventanas que parpadean (content-visibility). */}
      <div className="cv-auto [--cv-h:150px]"><NightSkyline className="h-[150px]" /></div>
      <div className="bg-night text-cream-muted">
        <div className="mx-auto max-w-6xl space-y-2 border-t border-brass/40 px-4 pb-10 pt-6 text-xs leading-relaxed">
          <p className="max-w-3xl">{t("disclaimer")}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-cream">{t("wiki")}:</span>
            <Link href="/ranks" className="link-brass text-cream">{t("ranks")}</Link>
            <Link href="/npcs" className="link-brass text-cream">{t("npcs")}</Link>
            <Link href="/mechanics" className="link-brass text-cream">{t("mechanics")}</Link>
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-cream">{t("tools")}:</span>
            <Link href="/build-planner" className="link-brass text-cream">{t("planner")}</Link>
            <Link href="/crosshair" className="link-brass text-cream">{t("crosshair")}</Link>
          </p>
          <p>
            {t("credits")}{" "}
            <a href="https://deadlock-api.com" className="link-brass text-cream" rel="noopener noreferrer" target="_blank">Deadlock API</a>
            {" · "}
            <Link href="/about" className="link-brass text-cream">{t("about")}</Link>
            {" · "}
            <Link href="/status" className="link-brass text-cream">{t("status")}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
