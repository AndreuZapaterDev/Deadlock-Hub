import { getRequestConfig } from "next-intl/server";
import { getLanguage } from "@/lib/language";
import { uiLocale } from "@/lib/languages";

// Sin prefijo en la URL: el idioma sale de la cookie `lang`. La interfaz propia solo existe en español e inglés (ver `uiLocale`).
export default getRequestConfig(async () => {
  const locale = uiLocale(await getLanguage());
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
