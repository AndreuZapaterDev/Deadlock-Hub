import { SectionTitle } from "@/components/ui/section-title";

/** Marcador de una sección que llega por streaming: reserva su sitio y avisa de que está cargando. */
export function SectionSkeleton({ id, title, height = 240 }: { id: string; title: string; height?: number }) {
  return (
    <section id={id} aria-busy="true" aria-label={`${title} (cargando)`} className="scroll-mt-40 space-y-4">
      <SectionTitle id={`${id}-t`}>{title}</SectionTitle>
      <div style={{ height }} className="animate-pulse-soft rounded-md border border-brass/20 bg-ink/5" />
    </section>
  );
}
