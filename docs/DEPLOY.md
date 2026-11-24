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
   | `NEXT_PUBLIC_SITE_URL` | `https://deadlockhub.vercel.app` |

   `DEADLOCK_API_KEY` (opcional pero recomendable: sin ella se aplica el límite por IP, y en Vercel las IP se comparten) y, si algún día se usa el login con Steam, `STEAM_API_KEY`: siempre aquí, nunca en el código.
5. **Deploy**. Después, cada push a `main` publica en producción y cada pull request genera una URL de vista previa.
6. Comprueba `https://deadlockhub.vercel.app/api/health` (debe dar `{"ok":true}`) y `/styleguide` (también desde el móvil).

Alternativa por línea de comandos (dentro del contenedor): `docker compose run --rm app npx vercel --prod`.

## Datos y límites de la API

La web lee **siempre de la API real**: no hay fixtures ni modo demo. Consecuencias al desplegar:

- **El build necesita internet** (consulta héroes y objetos para generar las rutas). Con la API caída, el build falla.
- **Límite de peticiones:** ≈200/min por IP sin clave. Las respuestas se cachean (caché de datos de Next, caché en memoria de las grandes y deduplicación de peticiones idénticas), pero con mucho tráfico conviene configurar `DEADLOCK_API_KEY`.
- **Funciones de Vercel:** las rutas que llaman a consultas lentas (`/api/map/heat`, «Actualizar historial») declaran `maxDuration = 60`; el plan Hobby puede limitar la duración máxima de una función.
- **Tamaño de las funciones:** ya no incluyen ningún fixture (antes ~35-49 MB).

## Notas

- **Plan Hobby (gratuito):** solo uso personal y **no comercial**. Si la web lleva anuncios o patrocinios hay que pasar a Pro.
- **Caché:** la ISR (`revalidate`) funciona de serie; no hace falta ningún volumen.
- **Imágenes:** las de héroes, objetos y el minimapa salen directamente del CDN de la API (`unoptimized`), así que no consumen cuota de optimización de Vercel.
- **Analítica** (Vercel Analytics / Speed Insights): desactivada. Solo se activa si lo pides.
- El build de producción fija `NODE_ENV=production` desde el script `npm run build`.
