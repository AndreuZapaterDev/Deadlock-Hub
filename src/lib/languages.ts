// Idiomas de la web. Cada uno sirve a la vez para los textos del juego (parámetro `language` de /v1/assets/*, enum del OpenAPI)
// y para la interfaz propia (src/messages/<ui>.json). La API admite más (ver NOTES.md): añadir uno es una línea aquí + su fichero
// de mensajes (un test comprueba que no falte ninguna clave).
// Función pura: sin servidor, para poder usarla también en el selector del navegador.

export const DEFAULT_LANGUAGE = "spanish";
export const LANGUAGE_COOKIE = "lang";

/** `api` = valor del parámetro `language`; `ui` = fichero de mensajes; `tag` = etiqueta BCP 47 para `<html lang>`; `name` = nombre en su idioma. */
export const LANGUAGES = [
  { api: "english", ui: "en", tag: "en", name: "English" },
  { api: "spanish", ui: "es", tag: "es", name: "Español" },
  { api: "portuguese", ui: "pt", tag: "pt", name: "Português" },
  { api: "french", ui: "fr", tag: "fr", name: "Français" },
  { api: "german", ui: "de", tag: "de", name: "Deutsch" },
  { api: "russian", ui: "ru", tag: "ru", name: "Русский" },
] as const;

export type Language = (typeof LANGUAGES)[number]["api"];
export type UiLocale = (typeof LANGUAGES)[number]["ui"];

export const isLanguage = (v: string | undefined | null): v is Language => LANGUAGES.some((l) => l.api === v);

/** Valor seguro: si la cookie falta o trae un idioma desconocido (p. ej. uno que ya se quitó), el predeterminado. */
export const resolveLanguage = (v: string | undefined | null): Language => (isLanguage(v) ? v : DEFAULT_LANGUAGE);

const find = (l: Language) => LANGUAGES.find((x) => x.api === l)!;

export const htmlLang = (l: Language) => find(l).tag;

/** Idioma de la interfaz propia (menú, pie, inicio…): el mismo que el de los textos del juego. */
export const uiLocale = (l: Language): UiLocale => find(l).ui;
