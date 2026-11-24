import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, htmlLang, isLanguage, LANGUAGES, resolveLanguage, uiLocale } from "./languages";
import { decodeSlug, slugify } from "./slug";

describe("idiomas", () => {
  it("son los seis pedidos y todos existen en el enum `language` del OpenAPI (ninguno inventado)", () => {
    const spec = JSON.parse(readFileSync("src/lib/api/openapi.json", "utf8"));
    const param = spec.paths["/v1/assets/heroes"].get.parameters.find((p: { name: string }) => p.name === "language");
    const fromApi: string[] = param.schema.oneOf.find((s: { enum?: string[] }) => s.enum).enum;
    expect(LANGUAGES.map((l) => l.api).sort()).toEqual(["english", "french", "german", "portuguese", "russian", "spanish"]);
    for (const l of LANGUAGES) expect(fromApi, l.api).toContain(l.api);
  });
  it("sin repeticiones y con etiqueta BCP 47, nombre y fichero de mensajes", () => {
    expect(new Set(LANGUAGES.map((l) => l.api)).size).toBe(LANGUAGES.length);
    expect(new Set(LANGUAGES.map((l) => l.ui)).size).toBe(LANGUAGES.length);
    expect(LANGUAGES.every((l) => l.tag && l.name && l.ui)).toBe(true);
  });
  it("resolveLanguage ignora valores desconocidos o de idiomas ya quitados", () => {
    expect(resolveLanguage("german")).toBe("german");
    expect(resolveLanguage("japanese")).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
    expect(isLanguage("russian")).toBe(true);
    expect(isLanguage("")).toBe(false);
  });
  it("etiqueta HTML y fichero de interfaz de cada idioma", () => {
    expect(htmlLang("portuguese")).toBe("pt");
    expect(uiLocale("spanish")).toBe("es");
    expect(uiLocale("german")).toBe("de");
    expect(uiLocale("russian")).toBe("ru");
  });
});

// Traducciones de la interfaz: ninguna clave puede faltar, sobrar, quedar vacía ni perder variables.
type Messages = { [k: string]: string | Messages };
const load = (ui: string) => JSON.parse(readFileSync(`src/messages/${ui}.json`, "utf8")) as Messages;
function flat(m: Messages, prefix = ""): Record<string, string> {
  return Object.entries(m).reduce<Record<string, string>>((acc, [k, v]) => (typeof v === "string" ? { ...acc, [prefix + k]: v } : { ...acc, ...flat(v, `${prefix}${k}.`) }), {});
}
const base = flat(load("es"));
const vars = (s: string) => [...s.matchAll(/\{(\w+)(?:,|\})/g)].map((m) => m[1]).sort();
const tags = (s: string) => [...s.matchAll(/<(\/?\w+)>/g)].map((m) => m[1]).sort();

describe.each(LANGUAGES.map((l) => l.ui))("mensajes «%s»", (ui) => {
  const msgs = flat(load(ui));
  it("tiene exactamente las mismas claves que el español", () => {
    expect(Object.keys(msgs).sort()).toEqual(Object.keys(base).sort());
  });
  it("no deja ningún texto vacío", () => {
    for (const [k, v] of Object.entries(msgs)) expect(v.trim(), k).not.toBe("");
  });
  it("conserva las variables y las etiquetas de cada texto", () => {
    for (const [k, v] of Object.entries(msgs)) {
      expect(vars(v), `variables de ${k}`).toEqual(vars(base[k]));
      expect(tags(v), `etiquetas de ${k}`).toEqual(tags(base[k]));
    }
  });
  it("el plural de «liveCount» define todas las formas que exige el idioma", () => {
    const forms = [...msgs["home.liveCount"].matchAll(/\b(zero|one|two|few|many|other)\s*\{/g)].map((m) => m[1]);
    expect(forms).toContain("other");
    if (ui === "ru") expect(forms).toEqual(expect.arrayContaining(["one", "few", "many", "other"]));
  });
});

describe("slugify con varios alfabetos", () => {
  it("mantiene el comportamiento anterior en latino", () => {
    expect(slugify("Lady Geist")).toBe("lady-geist");
    expect(slugify("Siete")).toBe("siete");
    expect(slugify("Señor Ñandú!")).toBe("senor-nandu");
    expect(slugify("  Mo & Krill ")).toBe("mo-krill");
  });
  it("no deja vacíos los nombres de otros alfabetos", () => {
    expect(slugify("Инферн")).toBe("инферн");
    expect(slugify("インファーナス")).toBe("インファーナス");
    expect(slugify("Ιβυ Ιβυ")).toBe("ιβυ-ιβυ");
    expect(slugify("ไอวี่").length).toBeGreaterThan(0);
    expect(slugify("인페르누스")).toBe("인페르누스");
  });
  it("decodeSlug deshace la codificación de la URL y tolera basura", () => {
    expect(decodeSlug(encodeURIComponent("インファーナス"))).toBe("インファーナス");
    expect(decodeSlug("%E0%A4%A")).toBe("%E0%A4%A");
  });
});
