import { getTranslations } from "next-intl/server";

/** Banner discreto: solo en modo mock (se quita con DATA_SOURCE=api). */
export async function MockBanner() {
  if (process.env.DATA_SOURCE === "api") return null;
  const t = await getTranslations("demo");
  return <div className="bg-brass/20 px-4 py-1 text-center text-xs text-ink">{t("banner")}</div>;
}
