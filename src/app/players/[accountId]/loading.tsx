import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/feedback";

// Esqueleto mientras se cargan el historial (varios MB en el servidor) y el resto de datos del perfil.
export default async function Loading() {
  const t = await getTranslations("playerPage");
  return (
    <div className="space-y-10" role="status" aria-label={t("loadingLabel")}>
      <Skeleton className="h-72 w-full" />
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <Skeleton className="h-36" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
    </div>
  );
}
