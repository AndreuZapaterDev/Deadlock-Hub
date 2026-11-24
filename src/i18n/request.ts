import { getRequestConfig } from "next-intl/server";

// Español por defecto, sin prefijo en la URL. Para añadir inglés: leer el idioma de una cookie aquí.
export default getRequestConfig(async () => {
  const locale = "es";
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
