#!/usr/bin/env python3
"""
Captura COMPLETA de deadlock-api: recorre todos los endpoints GET del OpenAPI
y rellena los parámetros con ids reales (héroes, items, jugadores, partidas,
builds, tablas SQL...). Incremental: lo ya capturado no se vuelve a pedir.

Los endpoints que no son GET (POST/PUT/DELETE) y los que requieren cuenta
de patrocinador no se llaman en la API real (tienen efectos o requieren auth):
se generan respuestas sintéticas a partir del esquema OpenAPI, marcadas como tal.

Uso:
    python fetch_all.py                 # todo
    python fetch_all.py --quick         # sin el detalle item a item / entidad a entidad
"""
import argparse
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_fixtures as F  # noqa: E402

REGIONS = ["Europe", "Asia", "NAmerica", "SAmerica", "Oceania"]


def load(path, params=None):
    e = F.manifest.get(F.key_for(path, params or {}))
    if not e or e["status"] >= 400 or not e["file"].endswith(".json"):
        return None
    with open(os.path.join(F.OUT, e["file"])) as f:
        return json.load(f)


STREAMS = ("/v1/info/live-requests", "/v1/matches/demo/live/query")


def stream_get(path, params, seconds=6):
    """Lee un text/event-stream durante unos segundos y guarda lo recibido."""
    import socket
    import urllib.error
    import urllib.parse
    import urllib.request
    url = F.BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    k = F.key_for(path, params)
    body, status, ctype = b"", 0, "text/event-stream"
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "deadlock-mock-fixtures/1.0"}),
                                   timeout=seconds)
        status, ctype = r.status, r.headers.get("Content-Type", ctype)
        end = time.time() + seconds
        try:
            while time.time() < end and len(body) < 200_000:
                chunk = r.read1(4096) if hasattr(r, "read1") else r.read(4096)
                if not chunk:
                    break
                body += chunk
        except (socket.timeout, TimeoutError):
            pass
        r.close()
    except urllib.error.HTTPError as e:
        body, status, ctype = e.read(), e.code, e.headers.get("Content-Type", "")
    except Exception as e:
        print(f"  ✗ {k}: {e}")
        return None
    ext = ".json" if "json" in ctype else ".txt"
    fname = F.fname_for(k) + ext
    with open(os.path.join(F.OUT, fname), "wb") as f:
        f.write(body)
    F.manifest[k] = {"file": fname, "status": status, "content_type": ctype}
    print(f"  {'✓' if status < 400 else '!'} {status} {k} (stream {len(body)} B)")


def g(path, params=None, delay=0.4):
    """GET incremental con un reintento si hay 5xx/timeout."""
    params = params or {}
    k = F.key_for(path, params)
    if k in F.manifest and F.manifest[k]["status"] < 500:
        return load(path, params)
    if path in STREAMS:
        return stream_get(path, params)
    r = F.get(path, params, delay=delay)
    if F.manifest.get(k, {}).get("status", 599) >= 500:
        time.sleep(3)
        r = F.get(path, params, delay=delay)
    return r


def save():
    with open(F.MANIFEST, "w") as f:
        json.dump({"base": F.BASE, "fetched_at": int(time.time()), "routes": F.manifest}, f, indent=1)


# ---------------------------------------------------------------- sintéticos
def example(schema, spec, depth=0):
    if depth > 6 or not isinstance(schema, dict):
        return None
    if "$ref" in schema:
        name = schema["$ref"].split("/")[-1]
        return example(spec["components"]["schemas"].get(name, {}), spec, depth + 1)
    for k in ("example", "default"):
        if k in schema:
            return schema[k]
    if "enum" in schema:
        return schema["enum"][0]
    for k in ("oneOf", "anyOf", "allOf"):
        if k in schema:
            opts = [s for s in schema[k] if s.get("type") != "null"] or schema[k]
            if k == "allOf":
                out = {}
                for s in opts:
                    v = example(s, spec, depth + 1)
                    if isinstance(v, dict):
                        out.update(v)
                return out
            return example(opts[0], spec, depth + 1)
    t = schema.get("type")
    if isinstance(t, list):
        t = next((x for x in t if x != "null"), "null")
    if t == "object" or "properties" in schema:
        return {p: example(s, spec, depth + 1) for p, s in schema.get("properties", {}).items()}
    if t == "array":
        return [example(schema.get("items", {}), spec, depth + 1)]
    return {"integer": 0, "number": 0.0, "boolean": False, "string": "string"}.get(t)


def synthetic(spec):
    os.makedirs(os.path.join(F.OUT, "synthetic"), exist_ok=True)
    n = 0
    for path, ops in spec["paths"].items():
        for method, op in ops.items():
            if method == "parameters":
                continue
            if method == "get" and not op.get("security"):
                continue  # los GET públicos se capturan de verdad
            resp = op.get("responses", {})
            code = next((c for c in ("200", "201", "202", "204") if c in resp), None) or "200"
            content = resp.get(code, {}).get("content", {})
            ctype = next(iter(content), "application/json")
            body = example(content.get(ctype, {}).get("schema", {}), spec) if content else None
            fname = f"synthetic/{method.upper()}_{path.strip('/').replace('/', '__').replace('{', '').replace('}', '')}.json"
            with open(os.path.join(F.OUT, fname), "w") as f:
                json.dump(body, f, indent=1)
            F.manifest[f"{method.upper()} {path}"] = {"file": fname, "status": int(code),
                                                      "content_type": "application/json",
                                                      "synthetic": True}
            n += 1
    print(f"  {n} respuestas sintéticas (no-GET / con auth)")


# ---------------------------------------------------------------- captura
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true")
    a = ap.parse_args()
    os.makedirs(F.OUT, exist_ok=True)
    if os.path.exists(F.MANIFEST):
        F.manifest.update(json.load(open(F.MANIFEST))["routes"])

    spec = g("/openapi.json") or load("/openapi.json")
    gets = {p: o["get"] for p, o in spec["paths"].items() if "get" in o}

    def enum_of(path, name):
        for p in gets[path].get("parameters", []):
            if p["name"] == name:
                s = p.get("schema", {})
                if "$ref" in s:
                    s = spec["components"]["schemas"][s["$ref"].split("/")[-1]]
                for k in ("anyOf", "oneOf"):
                    for x in s.get(k, []):
                        if "$ref" in x:
                            s = spec["components"]["schemas"][x["$ref"].split("/")[-1]]
                return s.get("enum", [])
        return []

    print("== Básicos")
    for p in ["/v1/info", "/v1/info/health", "/v1/info/live-requests", "/v1/patches",
              "/v1/patches/big-days", "/v2/patches", "/v1/graphql"]:
        g(p)

    print("== Assets (listas)")
    heroes = g("/v1/assets/heroes", {"only_active": "true"}) or []
    all_heroes = g("/v1/assets/heroes") or heroes
    lists = {}
    for p in ["items", "ranks", "ranked-seasons", "map", "build-tags", "accolades", "client-versions",
              "colors", "generic-data", "convars", "fonts", "icons", "images", "models", "sounds",
              "misc-entities", "modifiers", "npc-units", "steam-info", "steam-info/all"]:
        lists[p] = g(f"/v1/assets/{p}")
    for s in enum_of("/v1/assets/items/by-slot-type/{slot_type}", "slot_type") or ["weapon", "spirit", "vitality"]:
        g(f"/v1/assets/items/by-slot-type/{s}")
    for t in enum_of("/v1/assets/items/by-type/{type}", "type") or ["ability", "weapon", "upgrade"]:
        g(f"/v1/assets/items/by-type/{t}")

    hero_ids = [h["id"] for h in all_heroes]
    active_ids = [h["id"] for h in heroes]
    print(f"== Assets por héroe ({len(hero_ids)})")
    for h in all_heroes:
        g(f"/v1/assets/heroes/{h['id']}")
        g(f"/v1/assets/heroes/by-name/{h['name']}")
        g(f"/v1/assets/items/by-hero-id/{h['id']}")

    print("== Assets detalle")
    for x in lists["accolades"] or []:
        g(f"/v1/assets/accolades/{x['id']}")
        g(f"/v1/assets/accolades/by-name/{x['class_name']}")
    for x in lists["build-tags"] or []:
        g(f"/v1/assets/build-tags/{x['id']}")
        g(f"/v1/assets/build-tags/by-name/{x['class_name']}")
    for name in list(lists["convars"] or {})[:10] + ["citadel_hero_testing_enabled"]:
        g(f"/v1/assets/convars/{name}")
    for r in lists["ranks"] or []:
        g(f"/v1/assets/ranks/{r['tier']}")
        for sub in range(1, 7):
            g(f"/v1/assets/ranks/{r['tier']}/{sub}/image", {"format": "webp"})
    g("/v1/assets/ranks/11/1/image", {"format": "png"})
    detail = {"items": "items", "misc-entities": "misc-entities", "modifiers": "modifiers", "npc-units": "npc-units"}
    for lst, ep in detail.items():
        objs = lists[lst] or []
        if a.quick:
            objs = objs[:5]
        print(f"   {ep}: {len(objs)}")
        for x in objs:
            g(f"/v1/assets/{ep}/{x['id']}", delay=0.25)
        if objs:
            g(f"/v1/assets/{ep}/{objs[0]['class_name']}")
    save()

    print("== Analytics")
    simple = ["hero-stats", "item-stats", "badge-distribution", "buff-stats", "build-item-stats",
              "game-stats", "hero-ban-stats", "hero-build-stats", "hero-comb-stats", "hero-counter-stats",
              "hero-swap-stats", "hero-synergy-stats", "item-flow-stats", "item-permutation-stats",
              "kill-death-stats", "lane-matchup-stats", "lane-soul-curve", "player-performance-curve",
              "player-stats/metrics"]
    for e in simple:
        g(f"/v1/analytics/{e}")
    for e in ["hero-stats", "game-stats", "hero-ban-stats", "hero-swap-stats", "item-stats"]:
        for b in enum_of(f"/v1/analytics/{e}", "bucket"):
            g(f"/v1/analytics/{e}", {"bucket": b})
    for mm in enum_of("/v1/analytics/hero-stats", "match_mode"):
        g("/v1/analytics/hero-stats", {"match_mode": mm})
    for gm in enum_of("/v1/analytics/hero-stats", "game_mode"):
        g("/v1/analytics/hero-stats", {"game_mode": gm})
    for size in (2, 3, 4, 5, 6):
        g("/v1/analytics/hero-comb-stats", {"comb_size": size})
    for team in (0, 1):
        g("/v1/analytics/kill-death-stats", {"team": team})
    for sb in enum_of("/v1/analytics/scoreboards/heroes", "sort_by"):
        g("/v1/analytics/scoreboards/heroes", {"sort_by": sb})
    for sb in ["matches", "wins", "winrate", "kills", "net_worth", "player_damage"]:
        g("/v1/analytics/scoreboards/players", {"sort_by": sb, "limit": 50, "min_matches": 50}, delay=1)
    save()

    print(f"== Analytics por héroe ({len(active_ids)})")
    for hid in active_ids:
        g("/v1/analytics/item-stats", {"hero_ids": hid})
        g("/v1/analytics/hero-build-stats", {"hero_ids": hid})
        g(f"/v1/analytics/hero-build-stats/{hid}")
        g("/v1/analytics/hero-counter-stats", {"hero_id": hid})
        g("/v1/analytics/hero-synergy-stats", {"hero_id1": hid})
        g("/v1/analytics/build-item-stats", {"hero_id": hid})
        g("/v1/analytics/item-flow-stats", {"hero_ids": hid})
        g("/v1/analytics/item-permutation-stats", {"hero_ids": hid, "comb_size": 2})
        g("/v1/analytics/player-performance-curve", {"hero_ids": hid})
        g("/v1/analytics/player-stats/metrics", {"hero_ids": hid})
        g("/v1/analytics/lane-matchup-stats", {"hero_ids": hid})
        g("/v1/analytics/scoreboards/players", {"sort_by": "matches", "hero_id": hid, "limit": 25}, delay=0.8)
        # los de orden de habilidades pesan ~15 MB sin filtrar: se limita por nº de partidas
        g("/v1/analytics/ability-order-stats", {"hero_id": hid, "min_matches": 500})
        g("/v1/analytics/ability-max-first-stats", {"hero_id": hid})
        g("/v1/analytics/ability-order-tree", {"hero_id": hid, "min_matches": 500})
        save()

    print("== Leaderboards")
    lbs = {}
    for r in REGIONS:
        lbs[r] = g(f"/v1/leaderboard/{r}") or {}
        g(f"/v1/leaderboard/{r}/raw")
    for hid in active_ids:
        g(f"/v1/leaderboard/Europe/{hid}")
    g(f"/v1/leaderboard/Europe/{active_ids[0]}/raw")

    print("== Jugadores")
    accounts, names = [], []
    for r in REGIONS:
        for e in (lbs[r].get("entries") or [])[:3 if r == "Europe" else 1]:
            if e.get("possible_account_ids"):
                accounts.append(e["possible_account_ids"][0])
                names.append(e.get("account_name"))
    accounts = list(dict.fromkeys(accounts))
    ids_csv = ",".join(map(str, accounts))
    for p in ["/v1/players/steam", "/v1/players/hero-stats", "/v1/players/rank", "/v1/players/region"]:
        g(p, {"account_ids": ids_csv})
    g("/v1/players/rank/image", {"account_ids": accounts[0]})
    g("/v1/players/rank/distribution")
    for n in [x for x in names if x][:3]:
        g("/v1/players/steam-search", {"search_query": n})
    match_ids = []
    for aid in accounts:
        hist = g(f"/v1/players/{aid}/match-history") or []
        match_ids += [m["match_id"] for m in hist[:4] if isinstance(m, dict)]
        for p in ["rank", "mate-stats", "enemy-stats", "region", "ingest-status"]:
            g(f"/v1/players/{aid}/{p}")
        g(f"/v1/players/{aid}/rank/image")
        for p in ["/v1/players/steam", "/v1/players/hero-stats", "/v1/players/rank"]:
            g(p, {"account_ids": aid})
        g("/v1/commands/variables/resolve", {"account_id": aid})
    save()

    print("== Partidas")
    active = g("/v1/matches/active") or []
    g("/v1/matches/active/raw")
    g("/v1/matches/recently-fetched")
    g("/v1/matches/metadata")
    g("/v1/matches/metadata", {"limit": 100, "include_player_info": "true"})
    g("/v1/matches/live/urls")
    g("/v1/matches/demo/schema")
    match_ids = list(dict.fromkeys(match_ids))[:20]
    for mid in match_ids:
        g(f"/v1/matches/{mid}/metadata")
    if match_ids:
        g(f"/v1/matches/{match_ids[0]}/metadata/raw")
        g(f"/v1/matches/{match_ids[0]}/salts")
    for m in active[:3]:
        g(f"/v1/matches/{m['match_id']}/live/url")
    if active:
        g("/v1/matches/demo/live/query", {"match_id": active[0]["match_id"], "query": "SELECT 1"})
    # ids inexistentes a propósito: devuelven el error real de la API
    g("/v1/matches/demo/query/00000000-0000-0000-0000-000000000000")
    g("/v1/matches/custom/1/match-id")
    save()

    print("== Builds")
    builds = g("/v1/builds") or []
    for hid in active_ids:
        g("/v1/builds", {"hero_id": hid})
    for b in builds[:15]:
        hb = b["hero_build"]
        g(f"/v1/builds/{hb['hero_id']}/{hb['hero_build_id']}")
    for aid in list(dict.fromkeys(b["hero_build"]["author_account_id"] for b in builds))[:5]:
        g(f"/v1/builds/by-author/{aid}")

    print("== Commands / crosshair / SQL")
    g("/v1/commands/variables/available")
    g("/v1/commands/widgets/versions")
    if accounts:
        g("/v1/commands/resolve", {"account_id": accounts[0], "region": "Europe",
                                   "template": "{steam_account_name} es {leaderboard_rank}"})
    code = (g("/v1/crosshair/settings/code") or {}).get("code")
    g("/v1/crosshair/settings/image")
    if code:
        g("/v1/crosshair/code/settings", {"code": code})
        g("/v1/crosshair/code/image", {"code": code})
    tables = g("/v1/sql/tables") or []
    for t in tables:
        g(f"/v1/sql/tables/{t}/schema")
    for q in ["SELECT match_id, start_time, duration_s, winning_team FROM match_info ORDER BY match_id DESC LIMIT 20",
              "SELECT hero_id, count() AS games FROM match_player WHERE start_time > now() - INTERVAL 1 DAY GROUP BY hero_id ORDER BY games DESC"]:
        g("/v1/sql", {"query": q}, delay=1)

    print("== Cobertura del resto de GET")
    def covered(p):
        rx = "^" + re.sub(r"\\\{[^}]*\\\}", "[^/]+", re.escape(p)) + "$"
        return any(re.match(rx, k.split("?")[0]) for k in F.manifest if not k.startswith(("POST", "PUT", "DELETE")))
    for p, op in gets.items():
        if not covered(p) and not op.get("security") and "{" not in p:
            g(p)

    print("== Sintéticos")
    synthetic(spec)
    save()
    missing = [p for p, op in gets.items() if not covered(p) and not op.get("security")]
    ok = sum(1 for v in F.manifest.values() if v["status"] < 400 and not v.get("synthetic"))
    print(f"\nListo: {len(F.manifest)} rutas ({ok} reales OK). GET sin capturar: {missing or 'ninguno'}")


if __name__ == "__main__":
    main()
