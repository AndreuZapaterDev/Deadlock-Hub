#!/usr/bin/env python3
"""
Descarga respuestas REALES de https://api.deadlock-api.com y las guarda como
fixtures para el mock server.

Uso:
    python fetch_fixtures.py                 # región Europe por defecto
    python fetch_fixtures.py --region NAmerica --matches 5

Solo usa la librería estándar. Respeta el rate limit con una pausa entre
peticiones (--delay).
"""
import argparse
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://api.deadlock-api.com"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
MANIFEST = os.path.join(OUT, "manifest.json")

manifest = {}  # "<path>?<query>" -> {"file":..., "status":..., "content_type":...}


def key_for(path, params):
    q = urllib.parse.urlencode(sorted((params or {}).items()), doseq=True)
    return f"{path}?{q}" if q else path


def fname_for(key):
    safe = key.strip("/").replace("/", "__").split("?")[0] or "root"
    if "?" in key:
        safe += "__" + hashlib.md5(key.encode()).hexdigest()[:8]
    return safe


def get(path, params=None, delay=0.6, binary=False):
    """GET real y guarda la respuesta. Devuelve el JSON parseado (o None)."""
    params = params or {}
    url = BASE + urllib.parse.quote(path, safe="/:,") + ("?" + urllib.parse.urlencode(params, doseq=True) if params else "")
    key = key_for(path, params)
    req = urllib.request.Request(url, headers={"User-Agent": "deadlock-mock-fixtures/1.0",
                                               "Accept": "application/json, */*"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            body, status, ctype = r.read(), r.status, r.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        body, status, ctype = e.read(), e.code, e.headers.get("Content-Type", "")
    except Exception as e:  # red, timeout...
        print(f"  ✗ {key}: {e}", file=sys.stderr)
        return None
    finally:
        time.sleep(delay)

    is_json = "json" in ctype
    ext = ".json" if is_json else (".png" if "png" in ctype else ".webp" if "webp" in ctype else ".bin")
    fname = fname_for(key) + ext
    with open(os.path.join(OUT, fname), "wb") as f:
        if is_json:
            try:
                f.write(json.dumps(json.loads(body), ensure_ascii=False, indent=1).encode())
            except ValueError:
                f.write(body)
        else:
            f.write(body)
    manifest[key] = {"file": fname, "status": status, "content_type": ctype or "application/json"}
    print(f"  {'✓' if status < 400 else '!'} {status} {key}")
    if is_json and status < 400:
        try:
            return json.loads(body)
        except ValueError:
            return None
    return None


def first(seq, *keys):
    """Saca el primer valor no vacío de una lista de dicts probando varias claves."""
    for item in seq or []:
        if isinstance(item, dict):
            for k in keys:
                v = item.get(k)
                if isinstance(v, list) and v:
                    return v[0]
                if v not in (None, "", []):
                    return v
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--region", default="Europe", help="Europe | Asia | NAmerica | SAmerica | Oceania")
    ap.add_argument("--matches", type=int, default=3, help="nº de partidas con metadata completa")
    ap.add_argument("--delay", type=float, default=0.6, help="segundos entre peticiones")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    d = a.delay

    print("== OpenAPI / info")
    get("/openapi.json", delay=d)
    get("/v1/info", delay=d)
    get("/v1/info/health", delay=d)
    get("/v1/patches", delay=d)

    print("== Assets")
    heroes = get("/v1/assets/heroes", {"only_active": "true"}, delay=d) or []
    get("/v1/assets/heroes", delay=d)
    for p in ["/v1/assets/items", "/v1/assets/ranks", "/v1/assets/ranked-seasons",
              "/v1/assets/map", "/v1/assets/build-tags", "/v1/assets/accolades",
              "/v1/assets/client-versions", "/v1/assets/colors", "/v1/assets/generic-data"]:
        get(p, delay=d)
    for slot in ["weapon", "spirit", "vitality"]:
        get(f"/v1/assets/items/by-slot-type/{slot}", delay=d)
    for t in ["ability", "weapon", "upgrade"]:
        get(f"/v1/assets/items/by-type/{t}", delay=d)
    hero_ids = [h["id"] for h in heroes if isinstance(h, dict) and "id" in h]
    for hid in hero_ids:
        get(f"/v1/assets/heroes/{hid}", delay=d)
        get(f"/v1/assets/items/by-hero-id/{hid}", delay=d)
    if heroes and heroes[0].get("name"):
        get(f"/v1/assets/heroes/by-name/{heroes[0]['name']}", delay=d)

    print("== Analytics")
    get("/v1/analytics/hero-stats", delay=d)
    get("/v1/analytics/item-stats", delay=d)
    get("/v1/analytics/badge-distribution", delay=d)
    get("/v1/analytics/hero-counter-stats", delay=d)
    get("/v1/analytics/hero-synergy-stats", delay=d)
    get("/v1/analytics/hero-comb-stats", {"comb_size": 2}, delay=d)
    get("/v1/analytics/hero-ban-stats", delay=d)
    get("/v1/analytics/game-stats", delay=d)
    get("/v1/analytics/scoreboards/heroes", {"sort_by": "matches"}, delay=d)
    get("/v1/analytics/scoreboards/players", {"sort_by": "matches", "limit": 50}, delay=d)
    for hid in hero_ids[:3]:
        get("/v1/analytics/item-stats", {"hero_ids": hid}, delay=d)
        get("/v1/analytics/hero-build-stats", {"hero_ids": hid}, delay=d)
        get("/v1/analytics/ability-order-stats", {"hero_id": hid}, delay=d)

    print("== Leaderboard")
    lb = get(f"/v1/leaderboard/{a.region}", delay=d) or {}
    if hero_ids:
        get(f"/v1/leaderboard/{a.region}/{hero_ids[0]}", delay=d)
    entries = lb.get("entries", []) if isinstance(lb, dict) else lb

    print("== Players")
    account_id = first(entries, "possible_account_ids", "account_id")
    if account_id:
        aid = account_id
        hist = get(f"/v1/players/{aid}/match-history", delay=d) or []
        get("/v1/players/steam", {"account_ids": aid}, delay=d)
        get("/v1/players/hero-stats", {"account_ids": aid}, delay=d)
        get("/v1/players/rank", {"account_ids": aid}, delay=d)
        get(f"/v1/players/{aid}/rank", delay=d)
        get(f"/v1/players/{aid}/mate-stats", delay=d)
        get(f"/v1/players/{aid}/enemy-stats", delay=d)
        get("/v1/players/rank/distribution", delay=d)
    else:
        print("  (no se encontró account_id en el leaderboard)")
        hist = []

    print("== Matches")
    active = get("/v1/matches/active", delay=d) or []
    get("/v1/matches/recently-fetched", delay=d)
    match_ids = [m["match_id"] for m in hist if isinstance(m, dict) and "match_id" in m]
    if not match_ids:
        match_ids = [m["match_id"] for m in active if isinstance(m, dict) and "match_id" in m]
    for mid in match_ids[: a.matches]:
        get(f"/v1/matches/{mid}/metadata", delay=d)

    with open(MANIFEST, "w") as f:
        json.dump({"base": BASE, "fetched_at": int(time.time()), "region": a.region,
                   "routes": manifest}, f, indent=1)
    ok = sum(1 for v in manifest.values() if v["status"] < 400)
    print(f"\nListo: {ok}/{len(manifest)} respuestas OK guardadas en {OUT}")


if __name__ == "__main__":
    main()
