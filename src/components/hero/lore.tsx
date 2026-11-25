import { useTranslations } from "next-intl";

/** Historia del héroe en párrafos: el primero siempre visible, con capitular, y el resto plegado (<details>, sin JavaScript). */
export function Lore({ paragraphs }: { paragraphs: string[] }) {
  const t = useTranslations("heroUi");
  if (paragraphs.length === 0) return <p className="text-ink-muted">{t("loreNone")}</p>;
  const [first, ...rest] = paragraphs;
  return (
    <div className="max-w-prose space-y-3 font-serif text-lg leading-relaxed">
      <p className="first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-display first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8] first-letter:text-brass">{first}</p>
      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none font-sans text-sm font-semibold text-teal-ink underline-offset-2 hover:underline marker:content-none">
            <span className="group-open:hidden">{t("readMore", { count: rest.length })}</span>
            <span className="hidden group-open:inline">{t("showLess")}</span>
          </summary>
          <div className="mt-3 space-y-3">{rest.map((p, i) => <p key={i}>{p}</p>)}</div>
        </details>
      )}
    </div>
  );
}
