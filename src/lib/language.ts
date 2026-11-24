import "server-only";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, resolveLanguage, type Language } from "@/lib/languages";

/**
 * Idioma elegido por el usuario (cookie `lang`). Fuera de una petición (sitemap, `generateStaticParams`, imágenes OG) no hay
 * cookies: ahí se usa el predeterminado.
 *
 * Importante: en el build, `cookies()` lanza una señal interna de Next (con `digest`) para marcar la página como dinámica. Hay que
 * dejarla pasar: si se captura, la página se prerenderiza en el idioma por defecto y la cookie se ignora en producción.
 */
export async function getLanguage(): Promise<Language> {
  try {
    return resolveLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value ?? process.env.DEADLOCK_API_LANGUAGE);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return resolveLanguage(process.env.DEADLOCK_API_LANGUAGE);
  }
}
