import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import type { ProfileState } from "@/lib/player-stats";

const COPY: Record<Exclude<ProfileState, "ok">, { title: string; hint: string }> = {
  private: {
    title: "Este perfil es privado o está protegido",
    hint: "Su dueño no permite ver sus datos públicamente, así que no podemos mostrarlos. No es un fallo de la web.",
  },
  notfound: {
    title: "No hemos encontrado esta cuenta",
    hint: "Comprueba el ID. Si la cuenta existe pero juega poco, puede que todavía no tengamos datos suyos.",
  },
  busy: {
    title: "La API está ocupada ahora mismo",
    hint: "Hay mucha demanda y no hemos podido consultar los datos. Espera unos segundos y vuelve a intentarlo.",
  },
  error: {
    title: "No se han podido cargar los datos",
    hint: "Ha ocurrido un error al consultar la API. Inténtalo de nuevo en unos minutos.",
  },
};

/** Mensaje claro (nunca un error genérico) para los perfiles o partidas que no se pueden mostrar. */
export function ProfileProblem({ state, subject, backHref = "/players", backLabel = "Volver al buscador" }: { state: Exclude<ProfileState, "ok">; subject?: string; backHref?: string; backLabel?: string }) {
  const c = COPY[state];
  return (
    <div className="mx-auto max-w-2xl space-y-5 py-10">
      <ErrorState title={c.title} hint={c.hint}>
        {subject && <p className="mt-1 text-xs text-ink-muted">{subject}</p>}
      </ErrorState>
      <div className="flex flex-wrap gap-3">
        <Button href={backHref}>{backLabel}</Button>
        {state === "busy" && <Link href="" className="link-brass self-center text-sm font-semibold">Reintentar</Link>}
      </div>
    </div>
  );
}
