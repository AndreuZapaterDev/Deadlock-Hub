import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/feedback";

export default async function Loading() {
  const t = await getTranslations("playerPage");
  return (
    <div className="space-y-10" role="status" aria-label={t("matchLoadingLabel")}>
      <Skeleton className="h-64 w-full" />
      <div className="space-y-2">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10" />)}</div>
      <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
    </div>
  );
}
