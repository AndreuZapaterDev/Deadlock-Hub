export type ManifestEntry = { file: string; status: number; content_type: string };
export type Manifest = { routes: Record<string, ManifestEntry> };
export type Match = "exact" | "same-path" | "template";

type Saved = [Record<string, string>, ManifestEntry];

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compile = (tpl: string) => new RegExp("^" + tpl.split(/\{[^}]*\}/).map(escapeRx).join("[^/]+") + "$");
const parseQuery = (q: string) => Object.fromEntries(new URLSearchParams(q));

/** Réplica en TS de Store.resolve_get de mock_server.py: exacta → misma ruta → plantilla OpenAPI. */
export function createResolver(manifest: Manifest, templates: string[]) {
  // plantillas más concretas (menos {}) primero
  const tpls = [...templates]
    .sort((a, b) => a.split("{").length - b.split("{").length || b.length - a.length)
    .map((t) => [t, compile(t)] as const);
  const templateOf = (path: string) => tpls.find(([, rx]) => rx.test(path))?.[0] ?? null;

  const byPath = new Map<string, Saved[]>();
  for (const [k, v] of Object.entries(manifest.routes)) {
    if (k.includes(" ")) continue; // claves "POST /v1/..." = sintéticas, la web no las usa
    const [p, q = ""] = k.split("?");
    byPath.set(p, [...(byPath.get(p) ?? []), [parseQuery(q), v]]);
  }

  return function resolve(
    path: string,
    query: Record<string, string> = {},
  ): { entry: ManifestEntry; match: Match } | null {
    const sorted = Object.entries(query).sort(([a], [b]) => (a < b ? -1 : 1));
    const key = path + (sorted.length ? "?" + new URLSearchParams(sorted).toString() : "");
    if (manifest.routes[key]) return { entry: manifest.routes[key], match: "exact" };

    // gana la query guardada que más parámetros comparte; a igualdad, la que menos sobra
    const score = ([saved]: Saved) => [
      Object.entries(query).filter(([k, v]) => saved[k] === v).length,
      -Object.keys(saved).filter((k) => !(k in query)).length,
    ];
    const best = (c: Saved[]) => {
      const ok = c.filter((x) => x[1].status < 400);
      return (ok.length ? ok : c).reduce((a, b) => {
        const [sa, ta] = score(a);
        const [sb, tb] = score(b);
        return sb > sa || (sb === sa && tb > ta) ? b : a;
      })[1];
    };

    const same = byPath.get(path);
    if (same) return { entry: best(same), match: "same-path" };
    const tpl = templateOf(path);
    if (tpl) {
      const cands = [...byPath].filter(([p]) => templateOf(p) === tpl).flatMap(([, c]) => c);
      if (cands.length) return { entry: best(cands), match: "template" };
    }
    return null;
  };
}
