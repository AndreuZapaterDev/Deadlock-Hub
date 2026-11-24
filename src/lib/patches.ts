// Utilidades puras de las notas de parche (sin servidor): ids, "big days" y enlazado automático de héroes y objetos.

export type Patch = { id: string; source: "steam" | "forum"; title: string; date: string; link: string; html: string };

/** Id estable de un parche: la parte numérica final del guid (hilo del foro o noticia de Steam). */
export function patchId(guid: string): string {
  return /(\d+)\/?$/.exec(guid)?.[1] ?? guid.replace(/\W+/g, "-");
}

/** Los parches del foro se titulan con su fecha ("09-29-2026"): devuelve esa fecha en ISO (AAAA-MM-DD) o null. */
export function titleDate(title: string): string | null {
  const m = /(\d{2})-(\d{2})-(\d{4})/.exec(title);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

/** Un parche es "big day" si su fecha (la del título, si la tiene; si no, la de publicación) coincide con un día grande. */
export function isBigDay(p: Pick<Patch, "title" | "date">, bigDays: string[]): boolean {
  const days = new Set(bigDays.map((d) => d.slice(0, 10)));
  return days.has(titleDate(p.title) ?? p.date.slice(0, 10));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Enlaza en un HTML YA SANITIZADO los nombres de héroes y objetos a sus fichas. Solo toca el texto (nunca atributos ni el
 * interior de enlaces existentes). Distingue mayúsculas y salta nombres de menos de 4 letras para evitar falsos positivos.
 */
export function linkEntities(html: string, entities: { name: string; href: string }[]): string {
  const usable = entities.filter((e) => e.name.length >= 4);
  if (!usable.length) return html;
  const byName = new Map(usable.map((e) => [e.name, e.href]));
  const names = [...byName.keys()].sort((a, b) => b.length - a.length);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${names.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "gu");

  let inLink = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<a[\s>]/i.test(part)) inLink++;
        else if (/^<\/a>/i.test(part)) inLink = Math.max(0, inLink - 1);
        return part;
      }
      return inLink ? part : part.replace(re, (name) => `<a href="${byName.get(name)}">${name}</a>`);
    })
    .join("");
}
