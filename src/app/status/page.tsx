import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Chip } from "@/components/ui/chip";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { ApiError, getSource } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("statusPage"))("title") };
}
export const revalidate = 60;

type Health = { services: Record<string, boolean> };

export default async function StatusPage() {
  const [t, locale] = await Promise.all([getTranslations("statusPage"), getLocale()]);
  let health: Health | null = null;
  let error: string | null = null;
  try {
    const r = await getSource().get<Health>("/v1/info/health");
    if (r.status === 200) health = r.data;
    else error = t("apiResponded", { status: r.status });
  } catch (e) {
    error = e instanceof ApiError ? e.message : t("checkFailed");
  }

  return (
    <div className="space-y-6">
      <PosterHeader title={t("title")} subtitle={t("subtitle")} />
      <Card className="space-y-3">
        <p className="text-sm text-ink-muted">{t("source")}</p>
        <p className="text-lg font-semibold">{t("realApi")}</p>
        <p className="text-xs text-ink-muted">{t("updated", { when: new Date().toLocaleString(locale) })}</p>
      </Card>
      {error && <ErrorState title={t("errorTitle")} hint={error} />}
      {health && (
        <Card>
          <ul className="grid gap-3 sm:grid-cols-3">
            {Object.entries(health.services).map(([name, ok]) => (
              <li key={name} className="flex items-center justify-between rounded-sm border border-brass/30 px-3 py-2">
                <span className="capitalize">{name}</span>
                <Chip tone={ok ? "sage" : "rose"}>{ok ? t("up") : t("down")}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
