# deadlock-api mock

Mock local de https://api.deadlock-api.com con **una consulta de ejemplo por cada endpoint**
y su respuesta real (capturada el 24/11/2026). Solo usa la librería estándar de Python 3.9+.

- 116 endpoints GET: 113 con respuesta real (3 de ellos son errores reales de la API: 404/500),
  2 sintéticos (requieren cuenta de patrocinador) y 1 sin datos (`/v1/matches/demo/live/query`,
  un stream que la API no llegó a responder).
- 13 endpoints POST/PUT/DELETE: respuesta sintética generada del esquema OpenAPI
  (no se llamaron a la API real para no crear partidas ni enviar nada).

La lista completa con el ejemplo y el fichero de cada endpoint está en **EXAMPLES.md**.

## Arrancar

```bash
python mock_server.py --port 8080 [--latency 150]
```

Apunta tu cliente a `http://localhost:8080` en lugar de `https://api.deadlock-api.com`.

- Cualquier id o parámetro funciona: si no coincide con el ejemplo guardado, se devuelve el
  ejemplo real de ese mismo endpoint (cabecera `X-Mock-Match: exact | same-path | template`).
- Las respuestas sintéticas llevan la cabecera `X-Mock-Synthetic: true`.
- `GET /__routes` lista las consultas guardadas y `GET /__coverage` el estado de cada endpoint.
- CORS abierto (`*`).

## Volver a capturar

```bash
python fetch_fixtures.py   # captura básica
python fetch_all.py        # todos los endpoints y variantes (tarda y ocupa cientos de MB)
```
