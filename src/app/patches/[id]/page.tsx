import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { HeroChip } from "@/components/hero/hero-chip";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ErrorState } from "@/components/ui/feedback";
import { PosterHeader } from "@/components/ui/poster-header";
import { getHeroes } from "@/lib/lookup";
import { loadBigDays } from "@/lib/meta-data";
import { loadPatches, renderPatchHtml } from "@/lib/patch-data";
import { effectiveDate, excerpt, isBigDay, mentionedNames, readingMinutes } from "@/lib/patches";

export const revalidate = 3600;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const [res, t] = await Promise.all([loadPatches(), getTranslations("patches")]);
  const p = res.ok ? res.data.find((x) => x.id === id) : undefined;
  return p ? { title: p.title, description: t("patchDesc", { title: p.title }) } : { title: t("patchTitle") };
}

export default async function PatchPage({ params }: Params) {
  const { id } = await params;
  const [t, locale] = await Promise.all([getTranslations("patches"), getLocale()]);
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  const [res, bigDays, heroes] = await Promise.all([loadPatches(), loadBigDays(), getHeroes()]);
  if (!res.ok) {
    return (
      <div className="space-y-8">
        <PosterHeader compact title={t("patchTitle")} />
        <ErrorState title={t("patchLoadError")} hint={t("patchLoadErrorHint")} />
      </div>
    );
  }
  const patch = res.data.find((p) => p.id === id);
  if (!patch) notFound();
  const html = await renderPatchHtml(patch.html);
  const text = excerpt(patch.html, Number.POSITIVE_INFINITY);
  const mentioned = heroes.filter((h) => mentionedNames(text, [h.name]).length > 0);
  // La lista llega ordenada de más reciente a más antiguo: «siguiente» es el anterior en el índice
  const i = res.data.findIndex((x) => x.id === patch.id);
  const newer = i > 0 ? res.data[i - 1] : undefined;
  const older = i < res.data.length - 1 ? res.data[i + 1] : undefined;

  return (
    <div className="space-y-8">
      <PosterHeader compact title={patch.title || t("patchTitle")} subtitle={t("dateReading", { date: date(effectiveDate(patch)), minutes: readingMinutes(text) })} />
      <div className="flex flex-wrap items-center gap-2">
        <Button href="/patches" variant="ghost">{t("allPatches")}</Button>
        <Button href="/patches/diff" variant="secondary">{t("seeNumbers")}</Button>
        <Chip tone={patch.source === "forum" ? "teal" : "neutral"}>{patch.source === "forum" ? t("forum") : t("steam")}</Chip>
        {isBigDay(patch, bigDays) && <Chip tone="apricot">{t("bigUpdate")}</Chip>}
        <a href={patch.link} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm font-semibold text-teal-ink underline-offset-2 hover:underline">{t("seeOriginal")}</a>
      </div>
      {mentioned.length > 0 && (
        <section aria-labelledby="mentioned" className="space-y-2">
          <h2 id="mentioned" className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("mentioned", { count: mentioned.length })}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {mentioned.map((h) => <li key={h.id}><HeroChip id={h.id} name={h.name} /></li>)}
          </ul>
        </section>
      )}
      {/* HTML sanitizado en el servidor (sanitize-html): solo etiquetas de texto, enlaces https y, con imágenes remotas, <img> https. */}
      <article
        className="max-w-prose space-y-3 leading-relaxed [&_a]:font-semibold [&_a]:text-teal-ink [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-brass/50 [&_blockquote]:pl-4 [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-black [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-black [&_h3]:font-display [&_h3]:text-lg [&_h3]:font-black [&_h4]:font-semibold [&_img]:h-auto [&_img]:max-w-full [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <nav aria-label={t("otherPatches")} className="grid max-w-prose gap-3 sm:grid-cols-2">
        {older ? (
          <Link href={`/patches/${older.id}`} className="rounded-md border border-brass/30 bg-surface p-3 shadow-card transition-colors hover:bg-brass/10">
            <span className="block text-xs text-ink-muted">{t("prevPatch")}</span>
            <span className="block truncate font-semibold">{older.title || t("untitled")}</span>
          </Link>
        ) : <span />}
        {newer ? (
          <Link href={`/patches/${newer.id}`} className="rounded-md border border-brass/30 bg-surface p-3 text-right shadow-card transition-colors hover:bg-brass/10">
            <span className="block text-xs text-ink-muted">{t("nextPatch")}</span>
            <span className="block truncate font-semibold">{newer.title || t("untitled")}</span>
          </Link>
        ) : <span />}
      </nav>
    </div>
  );
}
