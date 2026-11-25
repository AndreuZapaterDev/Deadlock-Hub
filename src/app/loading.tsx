import { getTranslations } from "next-intl/server";

const RAYS = 16;

// Se muestra al instante mientras la página espera a la API. Mismo lenguaje visual que los carteles (rayos + zigurat).
export default async function Loading() {
  const t = await getTranslations("loading");
  return (
    <div role="status" aria-live="polite" className="flex min-h-[60vh] flex-col items-center justify-center gap-8 text-center">
      <svg viewBox="0 0 200 200" className="h-44 w-44 sm:h-56 sm:w-56" aria-hidden="true">
        <g className="load-ring" fill="none" stroke="var(--brass)" strokeWidth="1.5">
          <circle cx="100" cy="100" r="92" strokeDasharray="2 7" />
          <circle cx="100" cy="100" r="80" opacity="0.5" />
        </g>
        {Array.from({ length: RAYS }, (_, i) => (
          <line
            key={i}
            className="load-ray"
            style={{ "--i": i } as React.CSSProperties}
            x1="100" y1="22" x2="100" y2="48"
            stroke="var(--brass)" strokeWidth="4" strokeLinecap="round"
            transform={`rotate(${(360 / RAYS) * i} 100 100)`}
          />
        ))}
        <g className="load-core">
          <path d="M100 56 L144 100 L100 144 L56 100 Z" fill="var(--poster)" stroke="var(--brass)" strokeWidth="2.5" />
          <path d="M100 74 L126 100 L100 126 L74 100 Z" fill="none" stroke="var(--accent)" strokeWidth="2" />
          <circle cx="100" cy="100" r="6" fill="var(--brass)" />
        </g>
      </svg>
      <div className="space-y-3">
        <p className="font-serif text-3xl font-semibold tracking-wide text-ink">{t("title")}</p>
        <p className="text-sm text-ink-muted">{t("subtitle")}</p>
      </div>
      <div className="load-bar relative h-1 w-48 overflow-hidden rounded-full bg-brass/25" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-accent" />
      </div>
    </div>
  );
}
