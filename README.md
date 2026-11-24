# Deadlock Hub

Web fan no oficial sobre Deadlock. Especificación completa en [DEADLOCK_WEB_SPEC.md](DEADLOCK_WEB_SPEC.md).

Todo corre en Docker. En el anfitrión solo hacen falta Docker y Docker Compose: **no ejecutes `npm`/`node` fuera del contenedor**.

| Acción | Comando |
|---|---|
| Configurar | `cp .env.example .env` |
| Desarrollo | `docker compose up app` → http://localhost:3000 |
| Instalar dependencia | `docker compose run --rm app npm install <paquete>` |
| Lint / tipos | `docker compose run --rm app npm run lint` / `npm run typecheck` |
| Build | `docker compose run --rm app npm run build` |
| Tests unitarios | `docker compose run --rm test` |
| Tests e2e | `docker compose run --rm e2e` |
| Vista previa de producción | `docker compose up --build preview` → http://localhost:3001 |

Atajos equivalentes en el `Makefile` (`make dev`, `make test`…).

Datos: **todo sale de la API real** (`api.deadlock-api.com`); no hay modo demo ni datos de ejemplo, así que hace falta conexión a internet. `DEADLOCK_API_KEY` es opcional (sube el límite de peticiones); copia `.env.example` a `.env`.
Informe de los datos: [docs/DATA_REPORT.md](docs/DATA_REPORT.md). Decisiones: [NOTES.md](NOTES.md).
