import type { Metadata } from "next";
import { Chip } from "@/components/ui/chip";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { ApiError, getSource } from "@/lib/api";

export const metadata: Metadata = { title: "Estado" };
export const revalidate = 60;

type Health = { services: Record<string, boolean> };

export default async function StatusPage() {
  let health: Health | null = null;
  let error: string | null = null;
  try {
    const r = await getSource().get<Health>("/v1/info/health");
    if (r.status === 200) health = r.data;
    else error = `La API respondió ${r.status}`;
  } catch (e) {
    error = e instanceof ApiError ? e.message : "No se pudo consultar el estado";
  }

  return (
    <div className="space-y-6">
      <PosterHeader title="Estado" subtitle="Salud de la API de la que salen todos los datos" />
      <Card className="space-y-3">
        <p className="text-sm text-ink-muted">Origen de datos</p>
        <p className="text-lg font-semibold">API real · api.deadlock-api.com</p>
        <p className="text-xs text-ink-muted">Actualizado {new Date().toLocaleString("es-ES")} · caché de 60 s</p>
      </Card>
      {error && <ErrorState title="No se pudo comprobar el estado" hint={error} />}
      {health && (
        <Card>
          <ul className="grid gap-3 sm:grid-cols-3">
            {Object.entries(health.services).map(([name, ok]) => (
              <li key={name} className="flex items-center justify-between rounded-sm border border-brass/30 px-3 py-2">
                <span className="capitalize">{name}</span>
                <Chip tone={ok ? "sage" : "rose"}>{ok ? "Operativo" : "Caído"}</Chip>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
