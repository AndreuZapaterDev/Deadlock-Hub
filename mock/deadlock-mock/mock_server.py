#!/usr/bin/env python3
"""
Mock server de deadlock-api que sirve las respuestas reales capturadas por
fetch_all.py / fetch_fixtures.py.

Uso:
    python mock_server.py                # http://localhost:8080
    python mock_server.py --port 3000 --latency 150

Resolución de rutas GET (en orden):
  1. Ruta + query exactas.
  2. Misma ruta con la query capturada que más parámetros comparta.
  3. Misma plantilla del OpenAPI (p. ej. /v1/matches/{match_id}/metadata):
     se devuelve una respuesta real capturada para otro id.
  4. 404 en JSON con rutas parecidas.

POST/PUT/DELETE y endpoints con autenticación: respuesta sintética generada
del esquema OpenAPI (cabecera X-Mock-Synthetic: true).

Extras:
  GET /__routes      rutas capturadas
  GET /__coverage    endpoints del OpenAPI y si tienen respuesta
"""
import argparse
import json
import os
import re
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(ROOT, "fixtures")


def compile_tpl(t):
    return re.compile("^" + re.sub(r"\\\{[^}]*\\\}", "[^/]+", re.escape(t)) + "$")


class Store:
    def __init__(self):
        with open(os.path.join(FIX, "manifest.json")) as f:
            self.routes = json.load(f)["routes"]
        self.templates = []
        spec_file = self.routes.get("/openapi.json", {}).get("file")
        if spec_file:
            with open(os.path.join(FIX, spec_file)) as f:
                spec = json.load(f)
            # las plantillas más concretas (menos {}) primero
            paths = sorted(spec["paths"], key=lambda p: (p.count("{"), -len(p)))
            self.templates = [(p, compile_tpl(p), set(spec["paths"][p]) - {"parameters"}) for p in paths]
        self.by_path = {}
        for k, v in self.routes.items():
            if " " in k:
                continue
            p, _, q = k.partition("?")
            self.by_path.setdefault(p, []).append((dict(urllib.parse.parse_qsl(q)), v))

    def template_of(self, path):
        for t, rx, _ in self.templates:
            if rx.match(path):
                return t
        return None

    def resolve_get(self, path, query):
        q = dict(urllib.parse.parse_qsl(query))
        key = path + ("?" + urllib.parse.urlencode(sorted(q.items())) if q else "")
        if key in self.routes:
            return self.routes[key], "exact"

        def best(cands):
            ok = [c for c in cands if c[1]["status"] < 400] or cands
            return max(ok, key=lambda c: (sum(1 for k, v in q.items() if c[0].get(k) == v),
                                          -len(set(c[0]) - set(q))))[1]

        if path in self.by_path:
            return best(self.by_path[path]), "same-path"
        tpl = self.template_of(path)
        if tpl:
            cands = [c for p, cs in self.by_path.items() if self.template_of(p) == tpl for c in cs]
            if cands:
                return best(cands), "template"
            syn = self.routes.get(f"GET {tpl}")
            if syn:
                return syn, "synthetic"
        return None, None

    def resolve_other(self, method, path):
        tpl = self.template_of(path)
        return self.routes.get(f"{method} {tpl}") if tpl else None


class Handler(BaseHTTPRequestHandler):
    store = None
    latency = 0

    def _send(self, status, body, ctype="application/json", extra=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("X-Mock", "deadlock-api")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD" and status != 204:
            self.wfile.write(body)

    def _json(self, status, obj):
        self._send(status, json.dumps(obj, ensure_ascii=False, indent=1).encode())

    def _serve(self, entry, how):
        with open(os.path.join(FIX, entry["file"]), "rb") as f:
            body = f.read()
        extra = {"X-Mock-Match": how}
        if entry.get("synthetic"):
            extra["X-Mock-Synthetic"] = "true"
        self._send(entry["status"], body, entry.get("content_type") or "application/json", extra)

    def do_OPTIONS(self):
        self._send(204, b"")

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if self.latency:
            time.sleep(self.latency / 1000)
        u = urllib.parse.urlsplit(self.path)
        path = urllib.parse.unquote(u.path).rstrip("/") or "/"
        s = self.store
        if path == "/__routes":
            return self._json(200, sorted(s.routes))
        if path == "/__coverage":
            cov = {}
            for t, rx, methods in s.templates:
                for m in sorted(methods):
                    m = m.upper()
                    if m == "GET":
                        real = any(s.template_of(p) == t for p in s.by_path)
                        cov[f"GET {t}"] = "real" if real else ("synthetic" if f"GET {t}" in s.routes else "missing")
                    else:
                        cov[f"{m} {t}"] = "synthetic" if f"{m} {t}" in s.routes else "missing"
            return self._json(200, cov)
        entry, how = s.resolve_get(path, u.query)
        if not entry:
            prefix = "/".join(path.split("/")[:3])
            similar = sorted({p for p in s.by_path if p.startswith(prefix)})[:20]
            return self._json(404, {"error": "No mock for this route", "path": path, "similar": similar})
        self._serve(entry, how)

    def _other(self):
        if self.latency:
            time.sleep(self.latency / 1000)
        n = int(self.headers.get("Content-Length") or 0)
        if n:
            self.rfile.read(n)
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path).rstrip("/")
        entry = self.store.resolve_other(self.command, path)
        if not entry:
            return self._json(405, {"error": f"{self.command} no existe en la API para esta ruta", "path": path})
        self._serve(entry, "synthetic")

    do_POST = do_PUT = do_DELETE = do_PATCH = _other

    def log_message(self, fmt, *args):
        print(f"[mock] {self.command} {self.path} -> {args[1] if len(args) > 1 else ''}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--latency", type=int, default=0, help="latencia artificial en ms")
    a = ap.parse_args()
    if not os.path.exists(os.path.join(FIX, "manifest.json")):
        raise SystemExit("No existe fixtures/manifest.json. Ejecuta antes: python fetch_all.py")
    Handler.store = Store()
    Handler.latency = a.latency
    print(f"deadlock-api mock: {len(Handler.store.routes)} rutas en http://localhost:{a.port}"
          f"  (ver /__routes y /__coverage)")
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
