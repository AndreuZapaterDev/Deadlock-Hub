import { Button } from "@/components/ui/button";
import { PosterHeader } from "@/components/ui/poster-header";

export default function NotFound() {
  return (
    <div className="space-y-8">
      <PosterHeader title="404" subtitle="Esta calle no lleva a ninguna parte">
        <div className="flex flex-wrap justify-center gap-3">
          <Button href="/">Volver al inicio</Button>
          <Button href="/players" variant="secondary">Buscar un jugador</Button>
          <Button href="/heroes" variant="ghost">Ver héroes</Button>
        </div>
      </PosterHeader>
      <p className="mx-auto max-w-prose text-center text-ink-muted">
        No existe la página que buscas. Puede que el enlace esté mal escrito, que el jugador, el héroe o el objeto no exista, o que se haya movido.
      </p>
    </div>
  );
}
