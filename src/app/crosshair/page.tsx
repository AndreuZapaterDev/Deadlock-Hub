import type { Metadata } from "next";
import { CrosshairEditor } from "@/components/tools/crosshair-editor";
import { DemoNote } from "@/components/ui/demo-note";
import { PosterHeader } from "@/components/ui/poster-header";
import { clampSettings } from "@/lib/crosshair";

export const metadata: Metadata = { title: "Editor de crosshair", description: "Diseña tu crosshair de Deadlock con vista previa en tiempo real, e importa o genera su código." };

export default async function CrosshairPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // Los ajustes de la URL (enlace compartido) se sanean: lo inválido toma el valor por defecto
  const initial = clampSettings(await searchParams);
  return (
    <div className="space-y-8">
      <PosterHeader compact title="Crosshair" subtitle="Diséñalo, pruébalo y comparte su código" />
      <DemoNote>La vista previa responde a tus ajustes, pero el código y la imagen oficial los genera la API: en modo demo, importar un código devuelve siempre el crosshair de ejemplo y el código generado es siempre el mismo.</DemoNote>
      <CrosshairEditor initial={initial} />
    </div>
  );
}
