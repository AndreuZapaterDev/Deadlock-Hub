import type { Metadata } from "next";
import { LiveList } from "@/components/match/live-list";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { loadLive } from "@/lib/live-data";

export const metadata: Metadata = { title: "En directo", description: "Las partidas de Deadlock que se están jugando ahora mismo, con sus héroes, espectadores y enlace de retransmisión." };
export const revalidate = 60;

export default async function LivePage() {
  const live = await loadLive().catch(() => ({ ok: false as const, status: 502 }));
  return (
    <div className="space-y-8">
      <PosterHeader compact title="En directo" subtitle="Lo que se está jugando ahora mismo" />
      {live.ok ? (
        <LiveList initial={live} />
      ) : (
        <ErrorState title="No se han podido cargar las partidas en directo" hint="La API está ocupada. Vuelve a intentarlo en un momento." />
      )}
    </div>
  );
}
