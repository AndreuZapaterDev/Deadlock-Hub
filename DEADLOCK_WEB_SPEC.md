# Especificación: "Deadlock Hub", web fan completa sobre Deadlock (Valve)

> **Para Claude Code:** este documento es el encargo completo. Léelo entero antes de empezar.
> Construye la web por fases (sección 10). Al final de cada fase, comprueba que funciona
> (`docker compose run --rm app npm run build`, sin errores de tipos ni de lint) antes de pasar a la siguiente.
> **Todo el desarrollo se hace dentro de Docker** (sección 2.1): no instales Node ni dependencias en la máquina anfitriona.
> **Modo mock primero (sección 3.0):** hasta la fase final, la web **no hace ni una sola petición a la API real**. Todos los datos salen de los fixtures de `mock/deadlock-mock/fixtures/`, que son respuestas reales de la API capturadas el 24/11/2026.
> Si algo de este documento no coincide con los fixtures, **los fixtures mandan**: adapta el código y apunta la diferencia en `NOTES.md`.
>
> **Estado del proyecto (actualizado tras la fase 3):**
> - ✅ **Fases 0, 1, 2 y 3** completadas (Docker y datos; sistema de diseño; wiki estática; tracker de jugadores y detalle de partida), todo con los fixtures y sin conectar la API real. ⏳ **Siguiente: fase 4** (meta y estadísticas).
> - Lo que cambió respecto al texto original va marcado como **(Cambio)** y detallado en `NOTES.md`. Los datos reales de los fixtures están en `docs/DATA_REPORT.md`. La referencia visual es `art-examples/`.

---

## 1. Objetivo

Una web fan que reúna **toda la información posible** sobre Deadlock en un solo sitio:

- **Wiki**: héroes, habilidades, objetos, mapa, rangos, NPCs, mecánicas.
- **Estadísticas y meta**: win rate, pick rate y ban rate, builds, counters y sinergias.
- **Tracker de cuentas**: buscar jugadores y ver perfil, rango, historial, héroes, compañeros y rivales.
- **Partidas**: detalle de partida, partidas en directo y leaderboards por región.
- **Herramientas**: build planner, calculadora de estadísticas y editor de crosshair.
- **Noticias**: parches y changelog.

Idioma principal: **español**. Debe estar preparada para añadir inglés (i18n).

---

## 2. Stack técnico

| Pieza | Elección |
|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript 5.9** (modo estricto). **(Cambio)** TypeScript fijado a 5.x porque `openapi-typescript` aún no admite la 6 |
| Estilos | **Tailwind CSS 4** (tokens en `src/app/globals.css` con `@theme inline`) |
| Componentes | **(Cambio)** Componentes propios, sin shadcn ni Radix por ahora (tooltip con CSS y pestañas con teclado propio). Radix solo si hace falta un diálogo o menú complejo |
| Gráficas | Recharts (o visx si hace falta un heatmap del mapa) |
| Animación | **Motion** (`motion/react`) para aparición al hacer scroll, contadores y pestañas; el resto con CSS y View Transitions (sección 7.5) |
| Tipografías | **Playfair Display** (títulos) e **Inter** (datos), con `next/font` (se alojan en el propio sitio) |
| Datos en cliente | TanStack Query para lo que se refresca en el navegador. *Pendiente: se instala cuando haya un uso real (p. ej. `/live`)* |
| Validación | Zod para validar las respuestas de la API. *Pendiente: se instala con `httpSource` (fase 9)* |
| i18n | next-intl con **español fijo y sin prefijo en la URL** (`src/i18n/request.ts`). `en.json` existe pero no se activa hasta la fase 10 |
| Tests | Vitest para utilidades (conversión de IDs, cálculos) ✅ (10 tests de la capa de datos), Playwright para smoke tests de las páginas clave *(pendiente: el servicio `e2e` está definido sin tests)* |
| Desarrollo | **Docker** (sección 2.1): desarrollo, tests y vista previa de producción en local |
| Publicación | **Vercel** en `https://deadlockhub.vercel.app` (sección 2.2) |
| Persistencia | **Sin base de datos propia.** Todo sale de la API y de la caché de Next. Lo que sea del usuario (favoritos, builds guardadas, preferencias) va en localStorage |
| Datos | **Modo mock** con los fixtures de `mock/deadlock-mock/fixtures/` (sección 3.0). La API real solo se conecta en la última fase |

### 2.1 Docker (desarrollo local)

**La app se crea, se desarrolla y se prueba dentro de contenedores Docker.** Se publica en Vercel (sección 2.2), que construye desde el código, no desde la imagen Docker. En la máquina anfitriona solo hacen falta Docker y Docker Compose. Node, npm y las dependencias viven solo dentro del contenedor.

**Archivos que hay que crear (en la fase 0, antes que nada):**

- `Dockerfile` **multi-stage** con:
  - `base`: `node:22-alpine` (o la LTS vigente), con `corepack` activado y `WORKDIR /app`.
  - `deps`: instala dependencias con `npm ci` a partir de `package-lock.json`. **(Cambio)** Si todavía no hay lockfile (primer arranque) cae a `npm install`.
  - `dev`: para desarrollo, con `npm run dev` y hot reload.
  - `preview`: ejecuta `npm run build` y después `npm run start`, con `NODE_ENV=production`, para probar en local la web tal y como funcionará en Vercel.
- `docker-compose.yml` con estos servicios:
  - `app` (target `dev`): monta el código como volumen para el hot reload, con **volúmenes con nombre** para `node_modules` y `.next` (para que no choquen con la máquina anfitriona), puerto `3000:3000`, `env_file: .env` y `WATCHPACK_POLLING=true` si el hot reload no detecta cambios.
  - `test`: misma imagen, para lanzar Vitest.
  - `e2e`: imagen oficial de Playwright (`mcr.microsoft.com/playwright`) para los tests end-to-end contra `app`.
  - `preview` (target `preview`): vista previa de producción en http://localhost:3001.
- `.dockerignore`: `node_modules`, `.next`, `.git`, `.env*` (excepto `.env.example`), logs y `playwright-report`.
- Ruta `/api/health` que devuelva `200` (para comprobar que la web responde, en local y en Vercel).

**Comandos (documéntalos en el `README.md` y como scripts en un `Makefile`):**

| Acción | Comando |
|---|---|
| Arrancar en desarrollo | `docker compose up app` → http://localhost:3000 |
| Instalar una dependencia | `docker compose run --rm app npm install <paquete>` |
| Lint y tipos | `docker compose run --rm app npm run lint` / `npm run typecheck` |
| Tests unitarios | `docker compose run --rm test` |
| Tests e2e | `docker compose run --rm e2e` |
| Vista previa de producción | `docker compose up --build preview` → http://localhost:3001 |
| Publicar en Vercel | `git push` a `main` (despliegue automático) o `docker compose run --rm app npx vercel --prod` |

**Reglas:**
- **Nunca** ejecutes `npm`, `npx` ni `node` directamente en la máquina anfitriona. Todo pasa por `docker compose run`/`exec`.
- Los scripts propios (generación de tipos, preparación de datos mock) también se ejecutan dentro del contenedor.
- La carpeta `mock/` se monta en el contenedor de desarrollo **solo lectura** (`:ro`).
- Los secretos (`DEADLOCK_API_KEY`, `STEAM_API_KEY`) se pasan por `.env` y **no** se copian en la imagen.
- **(Cambio)** `npm run build` fija `NODE_ENV=production` en el propio script: la imagen `dev` define `NODE_ENV=development` y `next build` falla en el prerender de `/_global-error` si no.
- **(Cambio)** El proyecto vive en la **raíz del repo**. `create-next-app` no escribe en una carpeta con archivos, así que `package.json` y las configuraciones se escribieron a mano y las dependencias se instalaron con `docker compose run`.
- **(Cambio)** Para abrir la web en desarrollo usa `localhost`: desde otro host (p. ej. `host.docker.internal`) Next 16 bloquea la hidratación y las gráficas salen vacías. La vista previa (`preview`) no tiene esa restricción.

### 2.2 Publicación en Vercel

- **URL:** `https://deadlockhub.vercel.app` (proyecto de Vercel llamado `deadlockhub`). `NEXT_PUBLIC_SITE_URL` apunta ahí para el SEO, el sitemap y las imágenes Open Graph.
- **Despliegue:** se conecta el repositorio de GitHub a Vercel. Cada push a `main` publica en producción, y cada pull request genera una URL de vista previa. **No crees ni configures el proyecto en Vercel por tu cuenta:** prepara el código y explícame en `docs/DEPLOY.md` los pasos para hacerlo yo.
- **Variables de entorno en Vercel:** `DATA_SOURCE=mock`, `MOCK_REMOTE_IMAGES=false`, `MOCK_LATENCY_MS=0` y `NEXT_PUBLIC_SITE_URL`. Las claves (`DEADLOCK_API_KEY`, `STEAM_API_KEY`) solo cuando se conecte la API real, y siempre como variables de Vercel, nunca en el código.
- **Fixtures en Vercel (modo demo):**
  - Las funciones de Vercel tienen un límite de tamaño, así que solo se incluyen los fixtures que la web usa. Configura `outputFileTracingIncludes` en `next.config` con la lista de ficheros necesarios, y `outputFileTracingExcludes` para dejar fuera el resto.
  - Excluye siempre `v1__assets__sounds.json`, `v1__assets__models.json`, `v1__matches__demo__schema.json`, `v1__info__live-requests.txt`, los `*.bin`, la carpeta `synthetic/`, los fixtures de `sql`, `patron` y `custom`, y los scripts `*.py`.
  - Mejor aún: genera en el build (`scripts/prepare-mock-data.ts`) versiones **reducidas** de los fixtures grandes, solo con los campos que usa la web, en `mock/derived/`. Así las páginas que se generan en el build (héroes, objetos) no dependen de leer ficheros de 7 MB en cada petición.
  - Comprueba al final de cada fase que el tamaño de las funciones queda holgadamente por debajo del límite de Vercel. Anótalo en `NOTES.md`.
  - **(Estado)** `next.config.ts` ya incluye `fixtures/**` y excluye lo anterior: quedan **~49 MB de 75 MB** por función (límite 250 MB). Es una estimación local; medir tras el primer despliegue. `scripts/prepare-mock-data.ts` sigue pendiente.
- **Caché:** la ISR (`revalidate`) funciona de serie en Vercel. No hace falta ningún volumen.
- **Imágenes:** en modo demo no se cargan imágenes remotas (sección 3.0), así que no se gasta cuota de optimización de imágenes de Vercel. Con la API real, revisa el límite de optimizaciones del plan y usa `unoptimized` para los iconos pequeños si hace falta.
- **Plan gratuito (Hobby):** es para uso personal y no comercial. Si algún día la web lleva anuncios o patrocinios, habrá que pasar al plan Pro. Apúntalo en `docs/DEPLOY.md`.
- **Analítica opcional:** Vercel Analytics y Speed Insights, desactivados por defecto. Solo se activan si yo lo pido.

**Regla de arquitectura:** el navegador **nunca** llama directamente a la API externa para datos pesados.
Todo pasa por **route handlers propios** (`/app/api/...`) o por Server Components con caché (`fetch` con `next: { revalidate }`).
Así se respeta el rate limit, se cachea y se puede cambiar de proveedor sin tocar la UI.

---

## 3. Fuente de datos principal: Deadlock API

### 3.0 Modo mock (obligatorio hasta la última fase)

El proyecto incluye la carpeta **`mock/deadlock-mock/`** (la copio yo antes de empezar). Contiene:

| Archivo | Qué es |
|---|---|
| `fixtures/manifest.json` | Índice: para cada consulta (`ruta?query`) indica el fichero, el código de estado HTTP y el `content_type`. Las claves con espacio (`"POST /v1/..."`, `"GET /v1/patron/..."`) son respuestas sintéticas |
| `fixtures/*.json`, `*.png`, `*.webp`, `*.bin`, `*.txt` | Una respuesta **real** por endpoint, capturada el 24/11/2026 |
| `fixtures/synthetic/` | Respuestas inventadas a partir del esquema (POST/PUT/DELETE y endpoints de patrocinador). **La web no las usa** |
| `fixtures/openapi.json.json` | La especificación OpenAPI completa. Es la fuente para generar los tipos |
| `EXAMPLES.md` | Tabla con la consulta de ejemplo, el estado y el fichero de cada endpoint. **Léela antes de empezar** |
| `README.md` | Explicación del mock |
| `mock_server.py`, `fetch_fixtures.py`, `fetch_all.py` | Scripts de Python. **No los ejecutes.** Los `fetch_*` llaman a la API real, y la web no necesita el servidor Python |

**Cómo funciona el modo mock:**

- La capa de datos (`src/lib/api/`) tiene **dos implementaciones con la misma interfaz**:
  - `mockSource`: lee los fixtures del disco (solo en el servidor: Server Components y route handlers).
  - `httpSource`: hace `fetch` a la API real.
  Se elige con `DATA_SOURCE=mock|api` (por defecto `mock`). **Las páginas y componentes no saben de dónde vienen los datos.**
- `mockSource` reimplementa en TypeScript la resolución del manifest, en este orden:
  1. Ruta + query exactas (con los parámetros ordenados).
  2. Misma ruta con la query guardada que más parámetros comparta.
  3. Misma plantilla del OpenAPI (por ejemplo, `/v1/matches/{match_id}/metadata`): devuelve el fixture de otro id.
  4. Si no hay nada, error 404 tipado.
  Devuelve también el **código de estado guardado**, para que la web pruebe sus estados de error con respuestas reales (por ejemplo, `/v1/matches/{id}/live/url` está guardado como 500 y `/v1/matches/custom/{id}/match-id` como 404).
- Opcional: `MOCK_LATENCY_MS` para simular latencia (por defecto 150 ms en desarrollo) y ver los skeletons.
- **Prohibido en modo mock:** cualquier petición a `api.deadlock-api.com` o a otros dominios de Deadlock API. `httpSource` debe lanzar un error si `DATA_SOURCE` no es `api`. Añade un test que lo compruebe.
- **Imágenes:** las URLs de imágenes que vienen dentro de los fixtures apuntan a CDNs reales. En modo mock **no se cargan desde fuera**: se muestra un placeholder con el estilo de la web (silueta + iniciales del héroe u objeto, en el color de su categoría). Las únicas imágenes reales disponibles son las que están en los fixtures (`v1__assets__ranks__3__3__image__*.webp`, `v1__players__*__rank__image.png` y las imágenes de crosshair). Pon `MOCK_REMOTE_IMAGES=false` por defecto, y si en algún momento lo activo a `true`, que se carguen las URLs reales.

**Limitaciones conocidas de los fixtures (diséñalas, no las ocultes):**

- **Un solo ejemplo por endpoint.** Pedir otro id devuelve el mismo ejemplo (por ejemplo, `/v1/assets/heroes/{id}` devuelve siempre Opera, id 82, y `/v1/players/{id}/...` devuelve siempre la cuenta `483770846`). Por eso:
  - Las **fichas de héroes y objetos** se construyen filtrando las listas completas (`v1__assets__heroes.json` y `v1__assets__items.json`), que contienen todos. Usa los endpoints de detalle solo con la API real.
  - Las **habilidades de cada héroe** se sacan de la lista de objetos (los items de tipo `ability`). **(Confirmado en la fase 0)** El enlace es `hero.items.signature1..4`, que contiene el `class_name` del item (176/176 resueltos en los 44 héroes jugables); `item.heroes[]` también incluye el id del héroe. Las habilidades innatas y el arma están en `hero.items.ability_innate1..3`, `weapon_primary` y `weapon_melee` (220/220 resueltos). `v1__assets__items__by-hero-id__83.json` está vacío (`[]`), así que no dependas de ese endpoint.
  - El **tracker** se desarrolla con la cuenta `483770846`. Cualquier búsqueda lleva a ese mismo perfil en modo mock. Muéstralo con un banner discreto: "Modo demo: datos de ejemplo".
- **Builds de un autor vacías** (`v1__builds__by-author__464664477.json` = `[]`): úsalo para diseñar el estado vacío. El ejemplo de `/v1/builds/{hero_id}/{build_id}` está mal asociado en el manifest. Para el detalle de build usa `v1__builds__2__1007.json` o una build de `v1__builds.json`.
- **Leaderboard por héroe:** usa `v1__leaderboard__Europe__1.json`. Los `*.bin` son protobuf: **la web no los usa**.
- **Comparador de parches:** solo hay datos de **una versión**. Para desarrollar la interfaz, crea en `mock/derived/` (carpeta tuya, no toques `deadlock-mock/`) una **copia modificada** de héroes y objetos con cambios inventados y marcados como tales (algunos números subidos y bajados, un objeto nuevo y uno eliminado). Con la API real se usará el parámetro `client_version` (ver 3.2).
- **Idioma:** los fixtures están en **inglés**. La API acepta `language=spanish` en los assets (también `latam`), pero no hay fixtures en español. En modo mock se muestran los textos del juego en inglés con la interfaz en español. Prepara todo para que, con la API real, se pida `language=spanish`.
- **Ficheros enormes:** `v1__assets__sounds.json` (unos 19 MB), `v1__assets__items.json` (unos 7,6 MB), `v1__matches__demo__schema.json` (unos 7,4 MB), `v1__analytics__hero-build-stats.json` (unos 6,4 MB), `v1__players__483770846__match-history.json` (unos 5,6 MB), `v1__analytics__kill-death-stats.json` (unos 3,2 MB), etc. **Nunca** se envían enteros al navegador. Se leen en el servidor, se filtran o paginan y se mandan solo los campos necesarios. Cachea en memoria los ya parseados. Los sonidos, modelos y el demo schema no se usan en la v1.
- **No uses** los fixtures de `sql`, `patron`, `custom`, `feedback`, `graphql`, `salts`, `ingest-status` ni `info/live-requests`.
- **(Hallazgos de la fase 0, ver `docs/DATA_REPORT.md`)**
  - **Formatos distintos entre endpoints:** `matches/metadata` trae `start_time` y `match_outcome` como **texto**; `match-history` y `matches/{id}/metadata` los traen como número. Normalizar en `lookup.ts`/`format.ts`.
  - **Rango:** `badge = tier*10 + subrank` (116 → tier 11, subrank 6).
  - **Analytics con un único `bucket: 0`:** no hay serie temporal ni desglose por rango.
  - **Nombres de cuentas:** `mate-stats`, `enemy-stats` y el leaderboard traen solo ids; los nombres se piden en lote a `/v1/players/steam`.
  - **Leaderboard:** cada fila trae `possible_account_ids[]` (hasta 5 candidatos), no un `account_id` único.
  - **`matches/active`:** 150 partidas (no 200) y sin rango medio por partida.
  - **Sin campos de vídeo** en las habilidades. El lore existe en 48 de 65 héroes y solo en inglés.

### 3.0b Fuente real (solo en la fase final)

- Base URL: `https://api.deadlock-api.com`
- Especificación OpenAPI: genera los tipos desde **`mock/deadlock-mock/fixtures/openapi.json.json`** (sin descargar nada) con `openapi-typescript` en `src/lib/api/schema.d.ts`. No inventes nombres de parámetros: sácalos de ahí.
- Docs interactivas: `https://api.deadlock-api.com/docs`
- Clientes generados: `https://github.com/deadlock-api/openapi-clients`
- Proyecto comunitario, **no oficial de Valve**. Se le debe dar crédito en el footer.

### 3.1 Límites y comportamiento

- Rate limit aproximado: **200 peticiones/min por IP** sin clave (400/min y 2.500/h con clave). Prepara `DEADLOCK_API_KEY` como variable de entorno opcional.
- `503` con `Retry-After`: la base de datos está ocupada. Hay que esperar y reintentar con backoff.
- `504`: la consulta ha tardado demasiado. **No reintentes**: estrecha los filtros o muestra un error amable.
- `429`: rate limit. Devuelve lo que haya en caché y muestra un aviso.
- `match-history` con `force_refetch=true` está muy limitado (unas 5 peticiones/h por clave). **No lo uses automáticamente**: solo detrás de un botón "Actualizar" con cooldown.

Implementa un único cliente `src/lib/api/client.ts` con:
- reintentos con backoff exponencial para 503 y respeto a `Retry-After`,
- timeout,
- validación Zod opcional,
- logs de errores legibles,
- cabecera `X-Api-Key` si existe la variable de entorno.

### 3.2 Endpoints disponibles (verificar contra openapi.json)

**Parámetros comunes de los assets (confirmados en openapi.json):**
- `language`: idioma de los textos del juego. Incluye `spanish` y `latam` (además de `english` y otros). La web usará `spanish`.
- `client_version`: versión del cliente del juego. Permite pedir los datos de parches anteriores (lista de versiones en `/v1/assets/client-versions`). Lo usa el comparador de parches.
- `/v1/assets/heroes` acepta también `only_active`.

**Assets / datos estáticos del juego** (`/v1/assets/...`). Se cachean mucho (revalidate 6–24 h):

| Endpoint | Uso en la web |
|---|---|
| `/v1/assets/heroes`, `/heroes/{hero_id}`, `/heroes/by-name/{name}` | Lista y ficha de héroes |
| `/v1/assets/items`, `/items/{id_or_class_name}`, `/items/by-slot-type/{slot_type}`, `/items/by-type/{type}`, `/items/by-hero-id/{id}` | Objetos (weapon/spirit/vitality) y habilidades de cada héroe. **(Cambio)** En mock las habilidades salen de `hero.items.signature1..4` sobre la lista completa; `by-hero-id` solo con la API real |
| `/v1/assets/map` | Mapa interactivo: objetivos, carriles y campamentos neutrales |
| `/v1/assets/ranks`, `/ranks/{tier}`, `/ranks/{tier}/{subrank}/image` | Rangos e insignias |
| `/v1/assets/ranked-seasons` | Temporadas ranked |
| `/v1/assets/npc-units`, `/npc-units/{id}` | NPCs: tropas, guardianes, jefes |
| `/v1/assets/modifiers`, `/modifiers/{id}` | Buffs y debuffs (tooltips) |
| `/v1/assets/accolades` | Logros y menciones de fin de partida |
| `/v1/assets/build-tags` | Etiquetas de builds |
| `/v1/assets/generic-data` | Constantes globales del juego (almas, tiempos, etc.) |
| `/v1/assets/misc-entities` | Otras entidades del mapa |
| `/v1/assets/colors`, `/fonts`, `/icons`, `/images`, `/sounds`, `/models` | Recursos visuales y de audio |
| `/v1/assets/convars` | Variables de consola (sección "avanzado") |
| `/v1/assets/client-versions`, `/steam-info`, `/steam-info/all` | Versiones y parches del cliente |

**Analytics / meta** (revalidate 15–60 min):

| Endpoint | Uso |
|---|---|
| `/v1/analytics/hero-stats` | Tier list: win/pick rate por héroe, filtrable por rango y fechas |
| `/v1/analytics/hero-ban-stats` | Ban rate |
| `/v1/analytics/hero-counter-stats` | Counters 1 contra 1 |
| `/v1/analytics/hero-synergy-stats` | Parejas que funcionan bien en el mismo equipo |
| `/v1/analytics/hero-comb-stats` | Composiciones de equipo |
| `/v1/analytics/hero-swap-stats` | Cambios de héroe antes de la partida |
| `/v1/analytics/hero-build-stats` | Rendimiento de builds |
| `/v1/analytics/item-stats` | Win rate y pick rate de cada objeto |
| `/v1/analytics/item-flow-stats` | Objetos por fase de partida y transiciones entre ellos (diagrama tipo Sankey) |
| `/v1/analytics/item-permutation-stats` | Combinaciones de objetos |
| `/v1/analytics/build-item-stats` | Objetos más usados en builds |
| `/v1/analytics/ability-order-stats`, `/ability-order-tree`, `/ability-max-first-stats` | Orden de subida de habilidades |
| `/v1/analytics/badge-distribution` | Distribución de jugadores por rango |
| `/v1/analytics/buff-stats` | Power-ups: cuántos se recogen y cuándo |
| `/v1/analytics/game-stats` | Estadísticas globales: duración media, etc. |
| `/v1/analytics/kill-death-stats` | **Heatmap de kills/muertes** sobre el mapa (raster 128x128) |
| `/v1/analytics/lane-matchup-stats`, `/lane-soul-curve` | Duelos de carril y ventaja de almas en el tiempo (marcados como inestables) |
| `/v1/analytics/player-performance-curve` | Curva de rendimiento durante la partida |
| `/v1/analytics/player-stats/metrics` | Distribución de métricas (percentiles) |
| `/v1/analytics/scoreboards/heroes`, `/scoreboards/players` | Rankings por estadística |

**Jugadores / tracker** (revalidate 2–10 min):

| Endpoint | Uso |
|---|---|
| `/v1/players/steam-search` | Buscador por nombre o ID |
| `/v1/players/steam` | Avatar, nombre y URL de Steam (en lote) |
| `/v1/players/{account_id}/match-history` | Historial de partidas |
| `/v1/players/{account_id}/rank`, `/v1/players/rank` (lote) | Rango actual |
| `/v1/players/{account_id}/rank/image` | Insignia |
| `/v1/players/hero-stats` | Estadísticas por héroe del jugador |
| `/v1/players/{account_id}/mate-stats` | Con quién juega más y con quién gana más |
| `/v1/players/{account_id}/enemy-stats` | Contra quién juega y su récord |
| `/v1/players/{account_id}/region`, `/v1/players/region` | Región |

**Partidas:**

| Endpoint | Uso |
|---|---|
| `/v1/matches/{match_id}/metadata` | Detalle completo de una partida |
| `/v1/matches/metadata` | Varias partidas a la vez (para el historial) |
| `/v1/matches/active` | Top 200 partidas en curso (pestaña "Ver" del juego) |
| `/v1/matches/live/urls`, `/v1/matches/{id}/live/url` | Enlaces de retransmisión en directo |
| `/v1/matches/recently-fetched` | Partidas recientes |

**Leaderboards:** `/v1/leaderboard/{region}` y `/v1/leaderboard/{region}/{hero_id}`.

**Builds:** `/v1/builds` (búsqueda), `/v1/builds/{hero_id}/{build_id}` y `/v1/builds/by-author/{account_id}`.

**Crosshair:** `/v1/crosshair/code/settings`, `/settings/code`, `/code/image` y `/settings/image`.

**Parches:** `/v2/patches` (changelog del foro + noticias de Steam) y `/v1/patches/big-days`.

**Otros:** `/v1/info/health` para la página de estado. `/v1/commands/*` sirve para comandos de bots de Twitch; inclúyelo solo como extra opcional. **No uses** los endpoints `internal`, los de `custom` (crear lobbies), los de `patron` ni los `/v1/sql` (deprecados).

### 3.3 Fuentes secundarias (opcionales)

- **Steam Web API**: "Iniciar sesión con Steam" (OpenID) para que el usuario vea su perfil con un clic. Necesita `STEAM_API_KEY`. Es opcional en la v1.
- **Liquipedia Deadlock** (`liquipedia.net/deadlock`): torneos y esports. Usa su API MediaWiki respetando sus condiciones de uso: user-agent identificable, rate limit estricto y caché agresiva. Atribución obligatoria (CC-BY-SA). Fase opcional.
- **Página oficial de Steam / foro de Valve**: enlazar, no copiar.

---

## 4. Conceptos clave que hay que implementar bien

- **IDs de cuenta:** la API usa **SteamID32 (`account_id`)**. Acepta en el buscador:
  - SteamID32 (número),
  - SteamID64 (`7656...`). Se convierte con `account_id = steamId64 - 76561197960265728n` (usa `BigInt`),
  - URL de perfil de Steam (`steamcommunity.com/profiles/<id64>`),
  - URL con vanity (`steamcommunity.com/id/<nombre>`). Se resuelve con `steam-search` o, si hay clave, con la Steam Web API,
  - nombre de usuario, con `steam-search`.
  Crea `src/lib/steam-id.ts` con tests.
- **Cuentas protegidas/privadas:** algunos endpoints devuelven `403` o excluyen la cuenta. Muestra un estado "Este perfil es privado o está protegido", nunca un error genérico.
- **Historial incompleto:** el historial puede no tener todas las partidas. Muestra una nota informativa discreta.
- **IDs a nombres:** héroes, objetos y rangos llegan como IDs. Mantén un "diccionario" en caché (assets) y resuélvelos en un único sitio (`src/lib/lookup.ts`).
- **Parches:** los stats cambian por parche. Todos los filtros de analytics deben tener un selector "Desde el parche…" usando `/v1/patches/big-days`.
- **Filtros comunes de analytics:** rango (min/max badge), rango de fechas, duración de partida y región. Recógelos de openapi.json y crea un componente de filtros reutilizable que guarde su estado en la URL (search params), para que cualquier vista se pueda compartir.

---

## 5. Mapa del sitio (páginas)

```
/                         Inicio
/heroes                   Lista de héroes (grid filtrable)
/heroes/[slug]            Ficha de héroe
/heroes/compare           Comparar héroes lado a lado
/items                    Tienda: todos los objetos
/items/[slug]             Ficha de objeto
/tier-list                Tier list de héroes
/meta                     Panel de meta (objetos, builds, composiciones)
/counters                 Matriz de counters y sinergias
/builds                   Buscador de builds
/builds/[heroId]/[buildId]Detalle de build
/build-planner            Herramienta: build planner / calculadora
/map                      Mapa interactivo + heatmaps
/ranks                    Rangos, distribución de jugadores, temporadas
/leaderboard              Leaderboard por región (y por héroe)
/players                  Buscador de jugadores
/players/[accountId]      Perfil del jugador (tracker)
/matches/[matchId]        Detalle de partida
/live                     Partidas en directo
/patches                  Notas de parche
/patches/[id]             Detalle de parche
/patches/diff             Comparador automático de parches
/crosshair                Editor de crosshair
/mechanics                Guía de mecánicas (almas, objetivos, buffs, NPCs, modificadores)
/npcs                     NPCs y jefes
/esports                  (opcional) Torneos vía Liquipedia
/about                    Créditos, aviso legal, fuentes
/status                   Estado de la API
/styleguide               Sistema de diseño (solo en desarrollo, noindex)
```

---

## 6. Detalle de cada sección

### 6.1 Inicio `/`
- Buscador de jugadores destacado ("Busca tu cuenta").
- Último parche (resumen + enlace).
- Top 5 héroes por win rate y los más jugados de esta semana.
- Número de partidas en directo ahora mismo + enlace a `/live`.
- Accesos rápidos a Héroes, Objetos, Tier list y Build planner.
- **(Estado)** Inicio provisional ya hecho con datos reales de los fixtures: cartel de portada, banda de cifras (partidas, jugadores, héroes, duración media), los 3 héroes con más win rate y los accesos rápidos. Incluye también una franja con el número de partidas en directo (dato real de `matches/active`). Faltan el último parche y el top 5 con "más jugados", que llegan con sus fases.

### 6.2 Héroes `/heroes` y `/heroes/[slug]`
- Grid con retrato, nombre y rol/etiquetas. Filtros por rol, dificultad y estilo de juego (los campos que traiga la API). Buscador.
- **Ficha de héroe:**
  - Cabecera: imagen, nombre, descripción, lore si existe, dificultad y etiquetas.
  - Estadísticas base: vida, velocidad, arma (daño, cadencia, cargador, caída de daño…) y escalado por nivel/almas. Usa todos los campos que tenga el asset.
  - **Habilidades** (de `hero.items.signature1..4`, ver 3.0): icono, descripción, cooldown, valores, mejoras T1/T2/T3 (`ability.upgrades[]`). **(Cambio)** No hay vídeo en los datos: se omite.
  - **Stats del meta:** win rate, pick rate y ban rate. **(Cambio)** La gráfica de tendencia por parche queda desactivada en mock (un solo `bucket`) y se activa con la API real.
  - **Orden de habilidades** más popular y su win rate (ability-order-stats/tree).
  - **Builds populares** (hero-build-stats + builds) y objetos por fase (item-flow-stats).
  - **Counters y sinergias:** "Fuerte contra", "Débil contra", "Mejores compañeros".
  - **Leaderboard del héroe** (top 10 de la región elegida).
  - Rendimiento por rango (gráfica de win rate según rango). **(Cambio)** Igual que la tendencia: desactivado en mock, activo con la API real.

### 6.2b Comparar héroes `/heroes/compare?h=a,b,c`
- Compara **2 o 3 héroes** lado a lado. Se eligen con un selector con buscador, y la URL guarda la selección para poder compartirla.
- **Stats base** en filas alineadas (vida, velocidad, daño, cadencia, cargador, escalado…), resaltando en `sage` el mejor valor de cada fila y en `rose` el peor.
- **Gráfica de radar** con los ejes principales (daño, aguante, movilidad, utilidad…), normalizados entre todos los héroes. Documenta cómo se normaliza cada eje.
- **Habilidades** en columnas paralelas, con cooldowns y valores clave.
- **Meta:** win rate, pick rate y ban rate de cada uno, y el **cara a cara** entre ellos (hero-counter-stats) si están en equipos contrarios. También la sinergia (hero-synergy-stats) si juegan juntos.
- Botón "Comparar con…" desde cada ficha de héroe.

### 6.3 Objetos `/items` y `/items/[slug]`
- Vista tipo tienda del juego: tres columnas (Weapon / Vitality / Spirit), agrupadas por tier y coste.
- Filtros: categoría, tier, activo/pasivo, componentes. Buscador.
- Tooltip rico al pasar el ratón: estadísticas, efecto pasivo/activo, cooldown, componentes y mejoras.
- **Ficha:** todo lo anterior + árbol de componentes (de qué se construye y en qué se convierte) + estadísticas de compra. **(Cambio)** `item-stats` solo da el tiempo medio de compra (`avg_buy_time_s`), sin desglose por minuto, y `upgrade.heroes` viene siempre vacío: "héroes que más lo usan" solo con la API real.

### 6.4 Tier list `/tier-list`
- Tiers S/A/B/C/D calculados a partir del win rate ajustado por número de partidas (documenta la fórmula en la página).
- Filtros: rango, parche y región.
- Alternar entre vista de tiers y tabla ordenable (win rate, pick rate, ban rate, KDA, almas/min, partidas).

### 6.5 Meta `/meta`
- Objetos más fuertes y más comprados.
- Sankey de flujo de objetos por fase (item-flow-stats).
- Mejores combinaciones de objetos (item-permutation-stats).
- Composiciones de equipo con más win rate (hero-comb-stats).
- Power-ups: cuándo se recogen (buff-stats).
- Stats globales: duración media, etc. (game-stats).
- Estadísticas de carril, marcadas como "beta" (lane-matchup-stats, lane-soul-curve).

### 6.6 Counters `/counters`
- Matriz héroe contra héroe (heatmap de win rate), con selector de dos héroes para el detalle.
- Matriz de sinergias (mismo equipo).

### 6.7 Builds `/builds`
- Buscador de builds de la comunidad (filtros: héroe, etiquetas, autor, idioma, ordenar por popularidad o fecha).
- Detalle: objetos por fase con notas del autor, orden de habilidades, autor (enlace a su perfil) y **código o ID para importar en el juego**.

### 6.8 Build planner `/build-planner`
- Elige héroe, añade objetos (máximo de slots según el juego) y ve en tiempo real:
  - estadísticas resultantes (vida, DPS de arma, poder spirit, resistencias…),
  - coste total en almas,
  - orden de compra.
- Fórmulas: usa los valores de `generic-data`, de los héroes y de los objetos. **Documenta en el código** las fórmulas que asumas y marca la calculadora como "aproximada".
- Guardar en localStorage (con try/catch) y compartir por URL (estado codificado en el query string).

### 6.9 Mapa `/map`
- Mapa SVG/canvas generado con `/v1/assets/map`: carriles, objetivos (guardianes, walkers, patrones), campamentos neutrales.
- Capas activables: objetivos, campamentos y **heatmap de kills/muertes** (kill-death-stats), con filtros por héroe y minuto.
- Al hacer clic en un objetivo o NPC se muestra su ficha (npc-units).

### 6.10 Rangos `/ranks`
- Los 12 rangos con sus insignias y subrangos.
- Distribución de jugadores por rango (badge-distribution o players/rank/distribution).
- Temporadas ranked (ranked-seasons).

### 6.11 Leaderboard `/leaderboard`
- Pestañas por región (las que acepte el endpoint: Europa, Norteamérica, Sudamérica, Asia, Oceanía… según openapi).
- Selector de héroe para el leaderboard de ese héroe.
- **(Cambio)** Cada fila trae `possible_account_ids[]` (hasta 5 candidatos), no un `account_id` único: enlaza al primero y muestra "posibles cuentas" si hay más de uno.

### 6.12 Tracker: buscador `/players` y perfil `/players/[accountId]`
- **Buscador** con autocompletado (debounce 300 ms) que acepte todos los formatos de la sección 4.
- **Perfil:**
  - Cabecera: avatar y nombre de Steam, enlace a Steam, región, **insignia de rango actual**, última partida.
  - Resumen: partidas, win rate, KDA medio, almas/min, héroes favoritos.
  - **Historial de partidas** paginado: héroe, resultado, K/D/A, duración, almas, objetos finales, hace cuánto. Cada fila enlaza a `/matches/[id]`.
  - **Gráficas:** win rate acumulado y partidas por día, calculados **solo con el historial que devuelve la API**. Como no hay base de datos, no se guarda la evolución del rango. Solo se muestra si los propios datos de las partidas incluyen el rango; si no, se muestra únicamente el rango actual. **(Dato)** En el fixture solo 645 de 7.783 partidas llevan `ranked_display_badge`: se dibuja solo con esas.
  - **Héroes del jugador:** tabla con partidas, win rate, KDA y rendimiento medio.
  - **Compañeros** (mate-stats): con quién juega más y con quién gana más, enlazados a sus perfiles. **(Cambio)** Solo traen ids: se muestra `#id` y los nombres se resuelven por lotes con `/v1/players/steam` (en mock casi todos quedan sin nombre).
  - **Rivales** (enemy-stats), con el mismo criterio.
  - **Builds publicadas** por el jugador (builds/by-author).
  - Botón **"Actualizar historial"** con cooldown visible (usa force_refetch con mucha moderación).
  - **"Seguir jugador"**: lista de favoritos en localStorage, visible en `/players`.
  - **Comparar** dos jugadores lado a lado (`/players/compare?a=..&b=..`).
- Estados: cargando (skeletons), perfil privado/protegido, sin partidas, error de API.

### 6.13 Partida `/matches/[matchId]`
- Cabecera: resultado, duración, fecha, modo, rango medio.
- Scoreboard de los dos equipos: héroe, jugador (enlace), K/D/A, almas, daño a héroes y objetivos, curación, objetos.
- Gráficas: diferencia de almas en el tiempo entre equipos, timeline de objetivos destruidos, compras de objetos por jugador en el tiempo.
- Accolades de la partida.
- Mapa con las posiciones de muertes, si los metadatos las incluyen.

### 6.14 En directo `/live`
- Lista de partidas activas (matches/active), refrescada cada 60 s en cliente: héroes de cada equipo, duración actual y espectadores. **(Cambio)** `matches/active` no trae rango medio por partida: se calcula solo si los datos lo permiten y, si no, se omite.
- Enlace de retransmisión si existe.

### 6.15 Parches `/patches`
- Feed de `/v2/patches` con fecha, título y fuente (foro o Steam).
- Detalle renderizado de forma segura (sanitiza el HTML con DOMPurify o similar).
- Cuando sea posible, enlaza automáticamente los nombres de héroes y objetos del texto a sus fichas.
- Marca los "big days" (grandes actualizaciones).

### 6.15b Comparador de parches `/patches/diff?from=X&to=Y`
- Calcula **automáticamente qué números cambiaron** entre dos versiones del juego, sin depender de las notas oficiales.
- **Cómo:** los assets de héroes, objetos y el resto aceptan `client_version`. Las versiones disponibles están en `/v1/assets/client-versions` y `steam-info/all`. Se piden los datos de las dos versiones y se comparan campo a campo con una función genérica `diffAssets(old, new)` en `src/lib/patch-diff.ts`, con tests. **En modo mock** se compara el fixture real con la copia modificada de `mock/derived/` (sección 3.0).
- **Qué muestra:**
  - Resumen: número de héroes y objetos con cambios, objetos nuevos y objetos eliminados.
  - Por héroe y por objeto: cada propiedad cambiada como `valor antiguo → valor nuevo`, con la diferencia en % y una flecha verde (`sage`) para mejoras o roja (`rose`) para nerfs. Define en un mapa qué propiedades son "más es mejor" (daño) y cuáles "menos es mejor" (cooldown, coste).
  - Filtros: solo héroes, solo objetos, solo buffs, solo nerfs, y buscador.
- Por defecto compara **el último parche con el anterior**. Enlázalo desde cada nota de parche ("Ver los cambios de números") y desde las fichas de héroes y objetos ("Historial de cambios": lista de los parches en los que cambió).
- Oculta los cambios irrelevantes (IDs internos, rutas de archivos, campos de depuración) con una lista de campos ignorados.
- Si al conectar la API real `client_version` no devolviera versiones antiguas, apúntalo en `NOTES.md` y propón una alternativa (por ejemplo, un snapshot JSON en el repo en cada build), pero **no** añadas una base de datos.

### 6.16 Crosshair `/crosshair`
- Editor visual (grosor, longitud, hueco, color, punto…, según los campos de la API) con vista previa (settings/image).
- Pegar un código para importarlo y copiar el código generado.

### 6.17 Mecánicas `/mechanics` y NPCs `/npcs`
- Páginas generadas a partir de generic-data, npc-units, modifiers y misc-entities: almas, objetivos, guardianes, walkers, patrón, campamentos, power-ups y buffs/debuffs.
- Texto explicativo propio (escrito para la web, no copiado de otras wikis).

### 6.18 Esports `/esports` (opcional, última fase)
- Torneos próximos y recientes desde Liquipedia, con atribución.

### 6.19 About y Status
- **About:** "Deadlock Hub es una web fan no oficial. No está afiliada ni respaldada por Valve. Deadlock y todos sus recursos son propiedad de Valve Corporation." Créditos a Deadlock API (enlace a su web y a su Patreon/GitHub Sponsors) y a otras fuentes.
- **Status:** estado de `/v1/info/health` y última actualización de cada caché. **(Estado)** `/status` ya existe: muestra el origen de datos (mock o API real) y los servicios de `health`. `/about` aún no.

---

## 7. Diseño

> **Referencia visual:** la carpeta `art-examples/` (arte, portada, póster y capturas de la interfaz del juego). Es solo referencia: **no se copian sus imágenes a la web**.

### 7.1 Dirección artística: el cartel de la ciudad

- **Qué se busca:** que la web parezca parte del mundo de Deadlock: una Nueva York alternativa de los años 30 con arquitectura **art déco**, cine negro, ocultismo y retratos como **carteles pintados**. Referencias concretas del arte del juego:
  - **Portada y logo:** verde petróleo, crema, bermellón y negro; logo en serif de alto contraste y un emblema de rueda de timón con un ojo.
  - **Póster dorado:** pergamino, cintas rojas, marcos ornamentales y rayos en rueda.
  - **Calle de noche:** verde muy oscuro, luz cálida de farola y verde esmeralda tipo neón.
  - **Pantalla de selección de héroe:** negros y rojo óxido, serif pesada en mayúsculas, etiquetas rojas tipo pegatina y textura de trama de puntos (*halftone*).
- **No son pasteles.** Los colores son **saturados y con carácter**, como un cartel impreso. El resultado debe verse moderno y profesional, no "retro de plantilla".
- **Similar, no copia:** no se copia el logo oficial, la UI del juego ni sus marcos tal cual. Los ornamentos (marcos, cintas, emblema, sigilos, skyline) se diseñan desde cero como SVG o CSS propios. Los retratos e iconos de héroes y objetos sí se pueden usar porque vienen de la API, con el aviso legal.
- **Dos modos** (interruptor en la cabecera). **(Cambio)** **Por defecto "Noche"**, porque la interfaz del juego es oscura; se respeta la elección guardada del usuario:
  - **"Día":** pergamino cálido con tinta casi negra y detalles en **oro**.
  - **"Noche":** la calle de noche. Fondo verde muy oscuro (nunca negro puro), crema, oro de farola y verdes/corales brillantes. Una luz cálida y una neblina verde suaves detrás de la cabecera.
- **Un solo elemento memorable:** el **cartel de portada** (`PosterHeader`). El resto de la interfaz es sobria y funcional. Si un adorno estorba para leer datos, se quita.

### 7.2 Paleta (define todo como tokens CSS / Tailwind)

Valores reales en `src/app/globals.css`. Los nombres `sage`, `apricot`, `lilac`, `rose` y `teal` se conservan por compatibilidad aunque ya no son pasteles: `sage` es un **verde lima** (así no se confunde con `teal`), `lilac` un violeta profundo y `rose` un rojo de óxido de la misma familia que `accent` (en el juego el rojo es lo hostil).

| Token | Uso | Día | Noche |
|---|---|---|---|
| `bg` | Fondo general | `#EADCBD` (pergamino) | `#101E1E` |
| `surface` | Tarjetas y paneles | `#F6EEDB` | `#182B2A` |
| `ink` | Texto principal | `#1B1512` | `#F0E6CE` |
| `ink-muted` | Texto secundario | `#5B4D40` | `#A69D88` |
| `brass` | Oro: marcos, ornamentos, foco, enlaces al pasar el ratón | `#96691C` | `#D6A441` |
| `accent` | Acción principal (botones, cintas, etiquetas). Texto sobre él: `on-accent` | `#B93A25` / `#F8EFD9` | `#C23A22` / `#F8EFD9` |
| `poster` / `poster-ray` | Panel verde petróleo del cartel y los retratos / rayos tonales del cartel | `#173F3E` / `#276864` | `#11302F` / `#1D504D` |
| `night` | Banda del footer y siluetas del skyline | `#0E2828` | `#0A1616` |
| `sage` | Victorias, valores positivos, **Vitality** (texto: `sage-ink`) | `#6FA13A` (`#3B6516`) | `#8CCB55` |
| `apricot` | Destacados, **Weapon** (texto: `apricot-ink`) | `#DD7A2C` (`#8A3D0B`) | `#F0974A` |
| `lilac` | **Spirit** (texto: `lilac-ink`) | `#7A52CC` (`#4A2A9E`) | `#A47AF0` (texto `#B795F5`) |
| `rose` | Derrotas y valores negativos (texto: `rose-ink`) | `#C8452E` (`#96281B`) | `#D9503A` (texto `#F0806C`) |
| `teal` | Información (texto: `teal-ink`) | `#2E8581` (`#17504D`) | `#4FB8B0` |
| `cream` / `cream-muted` | Texto fijo sobre `poster` y `night` en ambos modos | `#F3E8D0` / `#C6BCA6` | igual |

Reglas:
- Las **categorías de objetos** mantienen la asociación del juego: Weapon naranja (`apricot`), Vitality verde (`sage`) y Spirit violeta (`lilac`).
- Los colores de relleno se usan para **fondos suaves, chips, bordes y rellenos de gráficas**. El texto va en `ink` o en la versión `*-ink` del color. Los chips llevan relleno suave (25 % en Día, 12 % en Noche) para cumplir el contraste.
- Las líneas de las gráficas usan la versión `*-ink` (los rellenos no llegan a 3:1 sobre el fondo). Orden fijo: `lilac`, `apricot`, `sage`, `teal`, `rose`.
- **Contraste AA obligatorio y medido** (fórmula WCAG, no a ojo): ≥ 4,5 en texto normal y ≥ 3 en texto grande. Ningún color ni tamaño "a mano" fuera de los tokens.

### 7.3 Elementos decorativos (propios, inspirados en el juego)

Todos en `components/deco/` o como utilidades CSS, reutilizables:

- **Cartel de portada (`PosterHeader`):** panel `poster` con **marco escalonado** (zigurat) dorado, **rayos tonales** (`poster-ray`, un verde un poco más claro que el panel; el rojo se reserva para el emblema y el botón principal, para que el cartel no compita con el resto) que se despliegan al cargar, trama de puntos que se desvanece, velo radial que calma la zona del texto, **fila de bombillas de marquesina** arriba y abajo, emblema, título en serif crema y filete dorado. Una vez por página.
- **Cable con símbolos ocultos (`SigilWire`):** un cable que cuelga entre edificios, como en las calles del juego, con círculos con ojo, triángulos y cruces colgando que se balancean despacio. Va en la parte alta del cartel y evita el centro, donde está el emblema.
- **Emblema de marca:** rueda de timón de 8 radios con pomos y un ojo geométrico (diseño propio). En la cabecera va en oro; en el cartel, en crema sobre un **disco bermellón** con anillo dorado, como el logo de la portada.
- **Menú al estilo del juego:** las entradas de navegación son serif en negrita y, al pasar el ratón o estar activas, la fila se **resalta invertida** (fondo `ink` con texto `bg`: crema con texto oscuro en Noche), como la selección de modo de juego.
- **Atmósfera:** viñeta en los bordes (más fuerte en Noche), grano de impresión también en Noche y luz cálida y neblina verde de fondo.
- **Ficha de héroe (`HeroCard`):** retrato en **ventana de arco** sobre panel `poster` con rayos del color propio del héroe, **cinta roja con muescas** con el nombre, rol en cursiva y **etiquetas tipo pegatina** (rojas, ligeramente inclinadas). Mientras no haya imágenes remotas, el retrato es un placeholder con rayos, trama de puntos y una **silueta de personaje** con contorno de luz (5 variantes: cabeza, chistera, capucha, sombrero de ala ancha y cresta; cada héroe conserva la suya según su id). En el tamaño pequeño (fila de historial) van las iniciales.
- **Tarjetas:** normales con borde simple y sombra; destacadas con **marco de latón de doble línea**, esquinas achaflanadas y ornamentos en las esquinas.
- **Botones:** marco doble dorado. El primario va en `accent` con texto `on-accent`.
- **Títulos de sección:** rombo dorado + filete que se desvanece, alineados a la izquierda.
- **Banda de cifras:** doble filete dorado, números grandes en serif y etiqueta en cursiva.
- **Sigilos** (círculos, estrella, ojo geométrico) como marca de agua muy tenue en estados vacíos y accesos. Nunca encima del contenido.
- **Skyline nocturno** en el footer: siluetas sobre una banda `night` con ventanas encendidas en oro (algunas parpadean).
- **Fondo:** grano de papel sutil en Día. En Noche, luz cálida de farola y neblina verde.

### 7.4 Tipografía y forma

- **Una familia con carácter + una sans:**
  - **Playfair Display** (peso variable hasta 900) para títulos, números grandes y subtítulos. Títulos en **mayúsculas, peso 800–900 y poco espaciado**, como el logo y la pantalla de selección de héroe. Subtítulos en cursiva. Números "lining" (`lining-nums`).
  - **Inter** para texto y datos, siempre con `tabular-nums`.
- **Forma:** esquinas poco redondeadas (4–8 px), esquinas achaflanadas o escalonadas en piezas destacadas, cintas con muescas y chips redondos.
- Mucho espacio y jerarquía clara: un dato importante por tarjeta, grande, y el resto pequeño en `ink-muted`. Líneas de texto de menos de 80 caracteres.
- **Equilibrio:** la decoración va en cabeceras, marcos y separadores. Las tablas, filtros y gráficas son limpias y funcionales.

### 7.5 Animación

La web tiene bastante movimiento, pero cada pieza responde a algo: la carga, el scroll, el cursor o una acción del usuario. Duración 150–900 ms, con la misma curva en toda la web (`cubic-bezier(0.22, 0.61, 0.36, 1)`) y resortes para lo que sigue al cursor. Ninguna animación debe tapar contenido ni retrasar su lectura.

- **Con CSS** (sin JavaScript, solo con `prefers-reduced-motion: no-preference`): título del cartel letra a letra, rayos que se despliegan, filete que se dibuja, bombillas que se encienden en barrido y luego parpadean alternas, ventanas del skyline que parpadean, balanceo suave de los símbolos del cable y giro de los rayos del retrato al pasar el ratón.
- **Más con CSS:** entrada de página en cada navegación (`template.tsx`), deriva lenta de los rayos del cartel, siluetas de los retratos que respiran, parpadeo del ojo del emblema y halo pulsante del disco del emblema.
- **Con Motion** (`motion/react`):
  - aparición al hacer scroll (`Reveal`, variantes `rise` y `curtain`) y títulos de sección cuyo rombo gira y cuyo filete se dibuja (`SectionTitle`);
  - contadores que suben desde 0 (`CountUp`, con el valor final ya en el HTML);
  - **rueda del emblema que gira con el scroll** y da un giro con resorte al pasar el ratón (`SpinEmblem`);
  - **inclinación 3D de las tarjetas de héroe** con brillo que sigue al cursor (`Tilt`);
  - **menú con una píldora que se desliza** entre entradas con un resorte (`NavMenu`);
  - subrayado deslizante y entrada de contenido en las pestañas;
  - **filas de las tablas que se reordenan animadas** al ordenar (`layout`);
  - hilo de oro de **progreso de scroll** en la cabecera (`ScrollProgress`).
- **Ambiente (solo modo Noche, `Ambient`):** brasas doradas que suben despacio (canvas con ~34 partículas, en pausa con la pestaña oculta) y una **luz de farola que sigue al cursor** con inercia (solo punteros finos).
- **Regla técnica:** la estructura del DOM debe ser **idéntica con y sin movimiento reducido**; no se ramifica el render según `useReducedMotion` (daba error de hidratación). Se oculta con CSS (`motion-reduce:`) o se ignoran los eventos.
- **Cambio Día/Noche:** el nuevo tema se expande en círculo desde el botón (View Transitions API). Sin soporte, cambio directo.
- **Accesibilidad:** con `prefers-reduced-motion: reduce` no hay animaciones y todo el contenido es visible desde el primer momento. El título animado conserva el texto completo con `aria-label`.
- Cada pieza animada se muestra en `/styleguide`.

### 7.6 Usabilidad

- Densidad: las tablas de stats deben ser compactas y ordenables, y legibles en móvil (scroll horizontal con la primera columna fija).
- **Responsive** de verdad: el tracker y las fichas tienen que funcionar en el móvil (la gente lo consultará mientras juega).
- Accesibilidad: contraste AA medido, foco visible, navegación con teclado en el buscador, las pestañas y los tooltips, y `alt` en todas las imágenes.
- Skeletons en todas las cargas. Nunca pantallas en blanco.

---

## 8. Rendimiento, caché y SEO

| Tipo de dato | Estrategia |
|---|---|
| Assets (héroes, objetos, mapa, rangos) | SSG/ISR, revalidate 12 h |
| Analytics | ISR, revalidate 30 min |
| Leaderboard | revalidate 10 min |
| Perfil de jugador / historial | dinámico, caché 3–5 min en el route handler |
| Partidas activas | revalidate 60 s |
| Parches | revalidate 1 h |

- `generateStaticParams` para todas las fichas de héroes y objetos.
- `next/image` para las imágenes remotas (configura `remotePatterns` con los dominios que use la API).
- Metadatos SEO por página, Open Graph dinámico (imagen OG para héroes y perfiles), `sitemap.xml` y `robots.txt`.
- Debounce en los buscadores, paginación en historiales y no más de ~5 peticiones en paralelo a la API externa.

### 8.1 PWA (instalable en el móvil)

- **Manifest** (`app/manifest.ts`): nombre, nombre corto, iconos propios (192, 512 y maskable) con el estilo de la web, `display: standalone` y colores de tema y fondo sacados de los tokens.
- **Service worker** con Serwist (o similar compatible con el App Router):
  - Assets estáticos y de la web: *cache-first*.
  - Imágenes de héroes y objetos: *cache-first* con límite de tamaño y caducidad (por ejemplo, 30 días).
  - Datos de la wiki (héroes, objetos, mecánicas): *stale-while-revalidate*, para que **se puedan consultar sin conexión** una vez visitados.
  - Perfiles, partidas y directo: *network-first*, con la última versión guardada como respaldo y un aviso de "datos sin conexión".
- **Página offline** propia, con el estilo de la web.
- Botón discreto **"Instalar app"** cuando el navegador lo permita, e instrucciones para iOS ("Compartir → Añadir a pantalla de inicio").
- Los jugadores seguidos (localStorage) aparecen en la pantalla de inicio de la app para entrar en un toque.
- Aviso de **"Nueva versión disponible, recargar"** cuando se actualice el service worker.

---

## 9. Estructura del proyecto sugerida

```
src/
  app/                 rutas (sección 5) + app/api/* (proxy/caché)
  components/
    ui/                botones, tablas, tooltips, tabs…
    deco/              ornamentos art déco, marcos, fondos
    hero/ item/ player/ match/ charts/ map/ filters/ layout/ motion/   (filters/filter-bar.tsx ✅: filtros en la URL)
  lib/
    api/types.ts       ✅ tipos comunes: DataSource, ApiResult, ApiError
    api/manifest-resolver.ts  ✅ resolución exacta → misma ruta → plantilla → 404 (función pura, con tests)
    api/mock-source.ts ✅ lee los fixtures (solo servidor) y cachea lo ya parseado
    api/http-source.ts ✅ esqueleto: lanza si DATA_SOURCE no es "api" (implementación en la fase 9)
    api/index.ts       ✅ getSource() elige mock o api
    api/schema.d.ts    ✅ tipos generados de openapi.json
    api/client.ts      ⏳ cliente con reintentos, caché y clave (fase 9, junto a httpSource)
    api/endpoints/     ⏳ funciones tipadas por área (assets, analytics, players…)
    steam-id.ts        ✅ SteamID32/64/3/2, URLs y vanity (BigInt) + 15 tests
    player-stats.ts    ✅ victoria, resumen, curvas de win rate / partidas por día / rango, estados del perfil + 18 tests
    player-data.ts     ✅ carga del jugador, nombres en lote, búsqueda y vanity (solo servidor)
    match-data.ts      ✅ carga de una partida
    patch-diff.ts      ⏳ comparación de assets entre parches (+ tests) (fase 7)
    lookup.ts          ✅ IDs → entidades (héroes y objetos); se ampliará por fases
    types.ts           ✅ tipos mínimos de los campos que usa la web
    format.ts          ✅ números, %, duraciones, fechas relativas (es) y limpieza de HTML
    cn.ts              ✅ unión de clases
    slug.ts            ✅ "Lady Geist" → "lady-geist"
    labels.ts          ✅ textos de la interfaz en español (tipos, dificultad, estadísticas base, unidades)
    item-sections.ts   ✅ propiedades de objetos y habilidades → filas legibles (sin HTML, sin duplicar unidades)
  i18n/request.ts      ✅ configuración de next-intl (español fijo)
  messages/es.json, en.json   ✅ (en no activo)
  test/                ✅ utilidades de test (neutraliza `server-only`)
NOTES.md               decisiones y diferencias encontradas con la API
.env.example           DATA_SOURCE=mock, MOCK_LATENCY_MS=150, MOCK_REMOTE_IMAGES=false,
                       DEADLOCK_API_KEY=, STEAM_API_KEY=, NEXT_PUBLIC_SITE_URL=https://deadlockhub.vercel.app
mock/deadlock-mock/    fixtures reales (no se modifica, no se ejecutan sus scripts)
mock/derived/          datos mock propios (p. ej. la versión modificada para el comparador de parches)
art-examples/          referencia visual (arte del juego); no se copia a la web
docs/DATA_REPORT.md    ✅ informe de la fase 0
Dockerfile             ✅ multi-stage: base, deps, dev, preview
docker-compose.yml     ✅ app (dev), test, e2e, preview
scripts/prepare-mock-data.ts  ⏳ reduce los fixtures grandes para Vercel (pendiente)
docs/DEPLOY.md         ✅ pasos para publicar en Vercel
.dockerignore, README.md      ✅
Makefile               ✅ atajos: make dev, make test, make e2e, make preview
vitest.config.mts, next.config.ts, eslint.config.mjs, postcss.config.mjs   ✅
```

---

## 10. Fases de desarrollo

0. ✅ **HECHA — Docker y reconocimiento de la API (antes de escribir la web):**
   - Crea `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `Makefile` y `.env.example` (sección 2.1). Inicializa el proyecto Next.js **desde dentro del contenedor** y comprueba que `docker compose up app` sirve la página por defecto en http://localhost:3000. **(Cambio)** `create-next-app` no admite una carpeta con archivos: los ficheros del proyecto se escribieron a mano y las dependencias se instalaron con `docker compose run`.
   - **Sin red:** en esta fase no se llama a ninguna API y no se ejecuta ningún script de `mock/deadlock-mock/`.
   - Genera los tipos desde `mock/deadlock-mock/fixtures/openapi.json.json`.
   - Implementa la capa de datos con `mockSource` (sección 3.0), con tests de la resolución del manifest: ruta exacta, misma ruta, plantilla y 404.
   - **Estudia los fixtures** (leyéndolos, sin llamar a nada) y escribe `docs/DATA_REPORT.md` con, para cada endpoint que use la web:
     - el fichero, su tamaño y su estado HTTP,
     - la estructura (campos útiles, tipos, ejemplos de valores),
     - cómo se relacionan los datos entre sí (por ejemplo, cómo se enlazan héroes y habilidades, y qué ids de objetos aparecen en partidas y builds),
     - los dominios de las imágenes que aparecen (para configurar `next/image` en el futuro),
     - qué falta respecto a este documento (por ejemplo, si los héroes no traen lore o los objetos no traen componentes).
   - **Ajusta el plan:** marca en `NOTES.md` qué funcionalidades de la sección 6 no son posibles con los datos de los fixtures y propón alternativas. **Para y enséñame el informe antes de empezar la fase 1.**
1. ✅ **HECHA — Sistema de diseño y base:**
   - Proyecto Next.js + Tailwind, i18n, tipos generados desde openapi.json y página `/status`. **(Cambio)** Sin shadcn (componentes propios). El cliente de API con reintentos (`client.ts`) se mueve a la fase 9, junto a `httpSource`: en mock no tiene uso.
   - **(Estado)** Quedó hecho: tokens, componentes (`ui/`, `deco/`, `charts/`, `layout/`, `motion/`, `hero/`, `item/`, `match/`), animaciones, `/styleguide` (con `noindex`), `/status`, inicio provisional y `docs/DEPLOY.md`. Quedó **pendiente**: `scripts/prepare-mock-data.ts`, tests e2e, medir el tamaño real de las funciones en Vercel y el primer despliegue (lo haces tú con `docs/DEPLOY.md`). El menú enlaza a páginas que aún no existen y dan 404 hasta las fases 2 a 7.
   - **Tokens de diseño** (sección 7): colores de los modos "Día" y "Noche", tipografías, espaciados, radios, sombras y duraciones de animación. Todo en `tailwind.config` y variables CSS. **Ningún color ni tamaño "a mano"** fuera de los tokens.
   - **Componentes base** en `components/ui/` y `components/deco/`: botones (primario, secundario, fantasma), inputs y buscador, chips y etiquetas (incluidas las de categoría Weapon/Vitality/Spirit), tarjetas (normal y destacada con marco de latón), tabs, tooltip rico de objeto o habilidad, tabla ordenable, skeletons, estados vacíos y de error, paginación, ornamentos art déco (separadores, esquinas, rayos), fondos (grano y gradientes) y la cabecera tipo cartel de teatro.
   - **Gráficas base** con la paleta: barras, líneas, radar, heatmap y Sankey, con datos de los `fixtures`.
   - **Página `/styleguide`** que muestre todo lo anterior en los dos modos, con un interruptor "Día"/"Noche", y un ejemplo montado de cada pieza grande: tarjeta de héroe, fila de historial de partida y tooltip de objeto. Solo visible en desarrollo (o con `noindex`).
   - Layout general: header con buscador global, navegación y footer con skyline y aviso legal.
   - Escribe `docs/DEPLOY.md` y deja el proyecto listo para el **primer despliegue en Vercel** (sección 2.2), para que yo pueda publicar `/styleguide` y revisarlo también desde el móvil.
   - **Para y enséñame `/styleguide` antes de empezar la fase 2.** A partir de aquí, **todas las páginas se construyen solo con estas piezas**. Si hace falta una nueva, se añade primero al styleguide.
2. ✅ **HECHA — Wiki estática:** héroes (lista y ficha sin stats de meta), objetos (tienda y ficha), rangos, NPCs y mecánicas. Si hace falta, genera aquí `scripts/prepare-mock-data.ts` (fixtures reducidos en `mock/derived/`) cuando se sepa qué campos se usan de verdad. Las habilidades salen de `hero.items.signature1..4` (sección 3.0). **(Estado)** Hecho: `/heroes` (filtros por tipo, dificultad, arma y búsqueda, guardados en la URL) y `/heroes/[slug]` (estadísticas base, arma, 4 habilidades con mejoras T1/T2/T3, héroe anterior/siguiente); `/items` (156 objetos de los tiers 1 a 4 en tres columnas, con tooltip rico y filtros) y `/items/[slug]` (por `class_name`; descripción, bonificaciones, activa/pasiva, "se construye con" y "se mejora en"); `/ranks`, `/npcs` y `/mechanics`. Sin estadísticas de meta (fase 4), sin "Comparar con…" (fase 4) y sin imágenes remotas (fase 9).
3. ✅ **HECHA — Tracker:** buscador (todos los formatos de ID), perfil completo, historial y detalle de partida. Incluye los tests de `steam-id.ts`. **(Estado)** Hecho: `/players` (buscador con autocompletado accesible que acepta SteamID32/64/3, URL con SteamID64 o vanity y nombres; jugadores seguidos en localStorage), `/players/[accountId]` (resumen, rango, héroes favoritos, gráficas de win rate acumulado, partidas por día y rango en partidas ranked, historial paginado de 20 en 20, tabla de héroes, compañeros y rivales, builds, seguir, actualizar historial con cooldown de 10 min), `/players/compare` y `/matches/[matchId]` (marcador de los dos equipos, ventaja de almas, objetivos destruidos, menciones, compras por jugador y mapa de muertes). Estados: cargando (skeleton), privado, no existe, API ocupada y sin partidas. Pantalla 404 propia en español. **Limitaciones:** el historial no trae objetos finales (solo la partida detallada); los avatares son placeholders (sin imágenes remotas); los equipos se llaman A y B porque la API no dice qué facción es cada uno; en mock cualquier cuenta o partida devuelve el ejemplo.
4. ⏳ **SIGUIENTE — Meta y estadísticas:** tier list, filtros comunes, stats en las fichas de héroes y objetos, counters/sinergias, `/meta`, leaderboard y **comparador de héroes**.
5. **Builds y herramientas:** buscador de builds, build planner y crosshair.
6. **Mapa y directo:** mapa interactivo con heatmap y `/live`.
7. **Parches:** notas con enlazado automático de héroes y objetos, y **comparador automático de parches** con el historial de cambios en las fichas.
8. **Pulido:** SEO, OG images, rendimiento (Lighthouse ≥ 90 en móvil en las páginas de la wiki), accesibilidad, smoke tests de Playwright, revisión final del modo "Noche" y **PWA** (sección 8.1).
9. **Conexión con la API real** (solo cuando yo lo pida explícitamente):
   - Implementa `httpSource` (hoy es un esqueleto que lanza error) con el cliente `client.ts` de la sección 3.1: reintentos, timeout, caché y `X-Api-Key` opcional. Instala Zod para validar las respuestas.
   - Pide los assets con `language=spanish` y usa `client_version` en el comparador de parches.
   - Activa las imágenes remotas (`remotePatterns` con los dominios de `DATA_REPORT.md`).
   - Quita el banner de "Modo demo" cuando `DATA_SOURCE=api`.
   - Comprueba página por página que todo funciona igual que en modo mock. El modo mock se mantiene para desarrollo y tests.
10. *(Opcional)* Login con Steam, esports vía Liquipedia y la versión en inglés.

Al final de cada fase, **todo dentro de Docker**: `docker compose run --rm app npm run build` sin errores, lint y tests pasando (`docker compose run --rm test`), comprobación de la vista previa de producción (`docker compose up --build preview`) y del tamaño de las funciones para Vercel, revisión visual de las páginas nuevas en móvil y escritorio, y actualización de `NOTES.md`.

---

## 11. Criterios de aceptación

- [ ] Todas las rutas de la sección 5 (menos las opcionales) existen y cargan datos de los fixtures en modo mock.
- [x] Pegar un SteamID64, un SteamID32, una URL de Steam o un nombre lleva al perfil correcto. *(Comprobado con SteamID32, SteamID64, URL con SteamID64, URL con vanity, SteamID3 y nombre.)*
- [x] Los perfiles privados o protegidos muestran un mensaje claro, no un error. *(En modo mock, con las cuentas de demostración 403, 404 y 503.)*
- [x] Si la API devuelve 503/504/429, la web muestra datos en caché o un aviso amable, y nunca se rompe. *(Hoy muestra el aviso amable; la caché de respaldo llega con `httpSource`.)*
- [ ] Los filtros de analytics se reflejan en la URL y se pueden compartir.
- [ ] Todas las tablas se pueden ordenar y se usan bien en móvil.
- [ ] Ninguna petición a la API externa sale del navegador sin pasar por caché, salvo las partidas en directo si se decide hacerlo así.
- [x] El footer tiene el aviso de web no oficial y los créditos a Deadlock API.
- [x] `/styleguide` muestra todos los componentes (incluidas las animaciones) en los dos modos, y ninguna página usa colores fuera de los tokens (comprobado: no hay colores fijos en `.ts`/`.tsx`).
- [x] El contraste de texto cumple AA en los dos modos, **medido con la fórmula WCAG** (no a ojo). *Medido en texto principal y secundario, botones, cartel, footer y chips; falta revisar el texto de las gráficas.*
- [x] Con `prefers-reduced-motion: reduce` no hay animaciones y todo el contenido es visible desde el primer momento (comprobado con el título animado).
- [ ] En modo mock **no sale ninguna petición** a la API real ni a CDNs externos. *Parcial: hay test de que `httpSource` no llama a `fetch` y se ve el banner "Modo demo"; falta un test en navegador que lo compruebe.*
- [x] Los fixtures grandes nunca llegan enteros al navegador (hasta la fase 1: se leen solo en servidor).
- [ ] Los textos del juego se ven en inglés (fixtures) sin traducción automática, y el código ya pide `language=spanish` cuando `DATA_SOURCE=api`.
- [ ] El comparador de parches muestra los cambios de números entre el último parche y el anterior (o `NOTES.md` explica por qué no es posible y qué alternativa se usó).
- [ ] Se pueden comparar 2 o 3 héroes y la URL se puede compartir.
- [ ] La web se instala como PWA en Android e iOS y las páginas de la wiki ya visitadas funcionan sin conexión.
- [x] `docker compose up app` arranca la web en desarrollo con hot reload en una máquina que solo tiene Docker instalado.
- [x] La vista previa de producción (`preview`) funciona en local igual que en desarrollo.
- [ ] El proyecto se despliega en Vercel siguiendo `docs/DEPLOY.md` y funciona en `https://deadlockhub.vercel.app` en modo demo, sin superar los límites de tamaño de las funciones. *Pendiente: el despliegue lo haces tú.*
- [x] `npm run build`, `npm run lint` y los tests pasan **ejecutados dentro del contenedor**.

---

## 12. Cosas que NO hacer

- No usar endpoints marcados como internal, custom (bots/lobbies), patron ni `/v1/sql`.
- No hacer scraping de otras webs fan (Statlocker, Deadlock Labs, Blitz, etc.).
- No copiar textos de otras wikis. Las descripciones propias se escriben desde cero.
- No guardar datos personales de jugadores en una base de datos propia en la v1.
- No llamar a `force_refetch` automáticamente.
- No presentar la web como oficial ni usar el logo de Valve o de Deadlock como logo propio.
