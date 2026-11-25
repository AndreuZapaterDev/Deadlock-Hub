import "server-only";
import { getTranslations } from "next-intl/server";

/** Pista para un error de la API: 503/429 = está saturada (se arregla esperando); cualquier otro, reintentar más tarde. */
export async function apiErrorHint(status: number) {
  const t = await getTranslations("common");
  return status === 503 || status === 429 ? t("apiBusy") : t("retryLater");
}
