import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";
import { getLanguage } from "@/lib/language";
import { htmlLang } from "@/lib/languages";
import { BRAND } from "@/lib/site";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [t, language] = await Promise.all([getTranslations("site"), getLanguage()]);
  return {
    name: "Deadlock Hub",
    short_name: "Deadlock Hub",
    description: t("description"),
    lang: htmlLang(language),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BRAND.night,
    theme_color: BRAND.poster,
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Atajos al mantener pulsado el icono (Android): lo que más se consulta mientras se juega.
    shortcuts: [
      { name: t("shortcutPlayers"), url: "/players" },
      { name: t("shortcutLive"), url: "/live" },
      { name: t("shortcutTier"), url: "/tier-list" },
    ],
  };
}
