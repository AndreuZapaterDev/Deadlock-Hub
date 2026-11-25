import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LiveList } from "@/components/match/live-list";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { loadLive } from "@/lib/live-data";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("live");
  return { title: t("title"), description: t("metaDesc") };
}

export default async function LivePage() {
  const t = await getTranslations("live");
  const live = await loadLive().catch(() => ({ ok: false as const, status: 502 }));
  return (
    <div className="space-y-8">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />
      {live.ok ? (
        <LiveList initial={live} />
      ) : (
        <ErrorState title={t("loadError")} hint={t("loadErrorHint")} />
      )}
    </div>
  );
}
