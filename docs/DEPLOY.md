# Publicar en Vercel

URL objetivo: **https://deadlockhub.vercel.app** (proyecto `deadlockhub`). Vercel construye desde el código, no desde la imagen Docker.

## Pasos (los haces tú; el proyecto no se crea desde el código)

1. Sube el repositorio a GitHub (rama `main`).
2. En https://vercel.com/new elige **Import Git Repository** y selecciona el repo.
3. Configuración del proyecto:
   - **Project Name:** `deadlockhub` (así la URL es `deadlockhub.vercel.app`).
   - **Framework Preset:** Next.js (se detecta solo).
   - **Build / Install / Output:** valores por defecto (`npm run build`).
   - **Node.js:** 22.x (Settings → General).
4. **Environment Variables** (Production y Preview):

   | Variable | Valor |
   |---|---|
   | `DATA_SOURCE` | `mock` |
   | `MOCK_REMOTE_IMAGES` | `false` |
   | `MOCK_LATENCY_MS` | `0` |
   | `NEXT_PUBLIC_SITE_URL` | `https://deadlockhub.vercel.app` |

   `DEADLOCK_API_KEY` y `STEAM_API_KEY` **solo** cuando se conecte la API real (fase 9), y siempre aquí, nunca en el código.
5. **Deploy**. Después, cada push a `main` publica en producción y cada pull request genera una URL de vista previa.
6. Comprueba `https://deadlockhub.vercel.app/api/health` (debe dar `{"ok":true}`) y `/styleguide` (también desde el móvil).

Alternativa por línea de comandos (dentro del contenedor): `docker compose run --rm app npx vercel --prod`.

## Fixtures en modo demo

`next.config.ts` incluye `mock/deadlock-mock/fixtures/**` en las funciones (se leen en runtime con una ruta dinámica, así que Vercel no los detecta solo) y excluye lo que la web no usa: sonidos, modelos, `demo/schema`, `live-requests`, `*.bin`, `synthetic/`, `sql`, `patron`, `custom`, `commands`.

Tamaño estimado de fixtures por función: **~49 MB** (de 75 MB), muy por debajo del límite de 250 MB descomprimidos. Es una estimación local: tras el primer despliegue, mira el tamaño real en Vercel → Deployment → Functions y apúntalo en `NOTES.md`. Si se acerca al límite, se generan versiones reducidas en `mock/derived/` (`scripts/prepare-mock-data.ts`).

## Notas

- **Plan Hobby (gratuito):** solo uso personal y **no comercial**. Si la web lleva anuncios o patrocinios hay que pasar a Pro.
- **Caché:** la ISR (`revalidate`) funciona de serie; no hace falta ningún volumen.
- **Imágenes:** en modo demo no se cargan imágenes remotas, así que no se consume cuota de optimización.
- **Analítica** (Vercel Analytics / Speed Insights): desactivada. Solo se activa si lo pides.
- El build de producción fija `NODE_ENV=production` desde el script `npm run build`.
