/**
 * "Lady Geist" → "lady-geist". Los acentos latinos se quitan ("Siete" y "Sïete" coinciden), pero se conservan las letras de otros
 * alfabetos (cirílico, griego, japonés…): los nombres de los héroes salen en el idioma elegido y no deben quedar vacíos.
 */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

/** Los parámetros de ruta de Next llegan codificados (%E3…): se descodifican antes de comparar con `slugify`. */
export const decodeSlug = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};
