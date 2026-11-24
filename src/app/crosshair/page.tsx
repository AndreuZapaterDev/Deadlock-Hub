import type { Metadata } from "next";
import { CrosshairEditor } from "@/components/tools/crosshair-editor";
import { PosterHeader } from "@/components/ui/poster-header";
import { clampSettings } from "@/lib/crosshair";

export const metadata: Metadata = { title: "Editor de crosshair", description: "Diseña tu crosshair de Deadlock con vista previa en tiempo real, e importa o genera su código." };

export default async function CrosshairPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // Los ajustes de la URL (enlace compartido) se sanean: lo inválido toma el valor por defecto
  const initial = clampSettings(await searchParams);
  return (
    <div className="space-y-8">
      <PosterHeader compact title="Crosshair" subtitle="Diséñalo, pruébalo y comparte su código" />
      <CrosshairEditor initial={initial} />
    </div>
  );
}
