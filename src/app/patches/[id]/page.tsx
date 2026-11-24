import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { loadBigDays } from "@/lib/meta-data";
import { loadPatches, renderPatchHtml } from "@/lib/patch-data";
import { isBigDay } from "@/lib/patches";

export const revalidate = 3600;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const res = await loadPatches();
  const p = res.ok ? res.data.find((x) => x.id === id) : undefined;
  return p ? { title: p.title, description: `Notas del parche «${p.title}» de Deadlock.` } : { title: "Parche" };
}

const date = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export default async function PatchPage({ params }: Params) {
  const { id } = await params;
  const [res, bigDays] = await Promise.all([loadPatches(), loadBigDays()]);
  if (!res.ok) {
    return (
      <div className="space-y-8">
        <PosterHeader compact title="Parche" />
        <ErrorState title="No se ha podido cargar el parche" hint="La API no responde ahora mismo." />
      </div>
    );
  }
  const patch = res.data.find((p) => p.id === id);
  if (!patch) notFound();
  const html = await renderPatchHtml(patch.html);

  return (
    <div className="space-y-8">
      <PosterHeader compact title={patch.title || "Parche"} subtitle={date(patch.date)} />
      <div className="flex flex-wrap items-center gap-2">
        <Button href="/patches" variant="ghost">← Todos los parches</Button>
        <Button href="/patches/diff" variant="secondary">Ver los cambios de números</Button>
        <Chip tone={patch.source === "forum" ? "teal" : "neutral"}>{patch.source === "forum" ? "Foro" : "Steam"}</Chip>
        {isBigDay(patch, bigDays) && <Chip tone="apricot">Gran actualización</Chip>}
        <a href={patch.link} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm font-semibold text-teal-ink underline-offset-2 hover:underline">Ver el original ↗</a>
      </div>
      {/* HTML sanitizado en el servidor (sanitize-html): solo etiquetas de texto, enlaces https y, con imágenes remotas, <img> https. */}
      <article
        className="max-w-prose space-y-3 leading-relaxed [&_a]:font-semibold [&_a]:text-teal-ink [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-brass/50 [&_blockquote]:pl-4 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-black [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-black [&_h4]:font-semibold [&_img]:h-auto [&_img]:max-w-full [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
