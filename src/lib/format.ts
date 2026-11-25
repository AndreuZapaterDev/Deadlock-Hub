const nf = new Intl.NumberFormat("es-ES");
const nf1 = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

export const fmtNum = (n: number) => nf.format(n);
export const fmtPct = (ratio: number, digits = 1) =>
  new Intl.NumberFormat("es-ES", { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(ratio);
export const fmtDec = (n: number) => nf1.format(n);

/** 2414 → "40:14" */
export const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const rtfs = new Map<string, Intl.RelativeTimeFormat>();
const rtfFor = (locale: string) => rtfs.get(locale) ?? rtfs.set(locale, new Intl.RelativeTimeFormat(locale, { numeric: "auto" })).get(locale)!;
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
/** Fecha relativa a partir de un timestamp unix (segundos). */
export function timeAgo(unix: number, locale = "es", now = Date.now() / 1000) {
  const rtf = rtfFor(locale);
  const d = unix - now;
  for (const [u, s] of UNITS) if (Math.abs(d) >= s) return rtf.format(Math.round(d / s), u);
  return rtf.format(Math.round(d), "second");
}

/** Los textos del juego traen HTML (spans, svg, <br>): para tooltips usamos texto plano. */
export const stripHtml = (h = "") =>
  h.replace(/<br\s*\/?>/gi, " ").replace(/<svg[\s\S]*?<\/svg>/gi, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/** "Lady Geist" → "LG" */
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
