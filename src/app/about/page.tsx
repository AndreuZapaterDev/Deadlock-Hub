import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PosterHeader } from "@/components/ui/poster-header";
import { SectionTitle } from "@/components/ui/section-title";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("title"), description: t("metaDesc") };
}

const ext = "font-semibold text-teal-ink underline underline-offset-2";

export default async function AboutPage() {
  const t = await getTranslations("about");
  const b = (c: React.ReactNode) => <strong>{c}</strong>;
  return (
    <div className="space-y-10">
      <PosterHeader compact title={t("title")} subtitle={t("subtitle")} />

      <section aria-labelledby="unofficial" className="space-y-3">
        <SectionTitle id="unofficial">{t("unofficial")}</SectionTitle>
        <p className="max-w-prose">
          {t("unofficialText")}
        </p>
      </section>

      <section aria-labelledby="credits" className="space-y-3">
        <SectionTitle id="credits">{t("credits")}</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-2">
            <h3 className="font-display text-lg font-black">Deadlock API</h3>
            <p className="text-sm text-ink-muted">
              {t.rich("apiText", { link: (c) => <a className={ext} href="https://deadlock-api.com" target="_blank" rel="noopener noreferrer">{c}</a> })}
            </p>
          </Card>
          <Card className="space-y-2">
            <h3 className="font-display text-lg font-black">{t("valveTitle")}</h3>
            <p className="text-sm text-ink-muted">
              {t.rich("valveText", { link: (c) => <a className={ext} href="https://forums.playdeadlock.com/forums/changelog.10/" target="_blank" rel="noopener noreferrer">{c}</a> })}
            </p>
          </Card>
        </div>
        <p className="max-w-prose text-sm text-ink-muted">
          {t("textsNote")}
        </p>
      </section>

      <section aria-labelledby="accuracy" className="space-y-3">
        <SectionTitle id="accuracy">{t("approx")}</SectionTitle>
        <ul className="max-w-prose list-disc space-y-1 pl-5 text-sm">
          <li>{t.rich("approx1", { b })}</li>
          <li>{t.rich("approx2", { b })}</li>
          <li>{t.rich("approx3", { b })}</li>
        </ul>
      </section>

      <section aria-labelledby="privacy" className="space-y-3">
        <SectionTitle id="privacy">{t("privacy")}</SectionTitle>
        <p className="max-w-prose text-sm">
          {t("privacyText")}
        </p>
      </section>
    </div>
  );
}
