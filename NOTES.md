# NOTES

Decisiones y diferencias respecto a `DEADLOCK_WEB_SPEC.md`. Los fixtures mandan.

## Fase 0: decisiones

- **Next.js 16 + React 19 + Tailwind 4 + TypeScript 5.9**. TypeScript fijado a 5.x porque `openapi-typescript` aún no admite la 6.
- **Proyecto en la raíz del repo**, sin subcarpeta. No se usó `create-next-app` (se niega a escribir en una carpeta con archivos): `package.json` y configuración se escribieron a mano y las dependencias se instalaron dentro del contenedor con `docker compose run`.
- **`npm run build` fija `NODE_ENV=production`**: la imagen `dev` define `NODE_ENV=development` y `next build` falla en el prerender de `/_global-error` si no.
- El `Dockerfile` usa `npm ci` cuando hay `package-lock.json` y `npm install` si no (solo primer arranque).
- **Resolver del mock** en `src/lib/api/manifest-resolver.ts` (función pura, testeada) y lectura de disco en `mock-source.ts` (solo servidor, `server-only`). Réplica del algoritmo de `mock_server.py`: exacta → misma ruta (query con más parámetros comunes, prefiriendo estados < 400) → plantilla OpenAPI → `ApiError(404)`.
- `httpSource` lanza si `DATA_SOURCE !== "api"` y, de momento, siempre (fase 9). Hay test de que no llama a `fetch`.
- Tipos generados con `openapi-typescript` en `src/lib/api/schema.d.ts` (606 KB, 126 rutas).
- No se ejecutó ningún script de `mock/deadlock-mock/`. Los scripts de inspección usados para el informe se han borrado.

## Diferencias con la spec (a tener en cuenta en el código)

- **Habilidades de un héroe**: se enlazan con `hero.items.signature1..4`, no con `by-hero-id` (vacío) ni con `ability_1..4`.
- `matches/metadata` trae `start_time` como texto y `match_outcome` como texto; `match-history` y `matches/{id}/metadata` lo traen como número. Normalizar en `lookup.ts`/`format.ts`.
- `rank` en `players/rank`: `badge = tier*10 + subrank`.
- Un solo ejemplo de `leaderboard`, `players/*` y `builds`: todas las regiones y cuentas devuelven el mismo.

## Funcionalidades afectadas por los datos (propuestas)

| Spec | Problema | Propuesta |
|---|---|---|
| 6.2 Tendencia de win rate por parche (gráfica) | Un solo `bucket: 0` | Mostrar valor actual; la gráfica queda desactivada en mock y se activa con la API real (`min_unix_timestamp`/`client_version`) |
| 6.2 Rendimiento por rango | Sin desglose por rango | Igual: desactivado en mock, activo con API real |
| 6.2 Vídeo de habilidades | No hay campo | Omitir; mostrar icono y descripción |
| 6.3 Win rate por minuto de compra | Solo `avg_buy_time_s` | Mostrar tiempo medio de compra |
| 6.3 Héroes que más usan un objeto | `upgrade.heroes` vacío | Omitir en mock; con API real, probar endpoints de héroe×objeto |
| 6.12 Gráficas de rango | 645/7783 partidas con `ranked_display_badge` | Dibujar solo con esas partidas (ya contemplado en la spec) |
| 6.12 Nombres de compañeros/rivales | Solo ids | Mostrar `#id` y resolver con `/v1/players/steam` por lotes; en mock casi todos quedan sin nombre |
| 6.11 Leaderboard enlazado a perfil | `possible_account_ids[]` ambiguo | Enlazar al primero y mostrar "posibles cuentas" si hay más de uno |
| 6.14 Rango medio en directo | No viene en `matches/active` | Calcularlo a partir de los jugadores solo si hay ranks; si no, omitir |
| 6.15b Comparador de parches | Solo una versión | Copia modificada en `mock/derived/` (fase 7), tal como pide la spec |

## Fase 1: decisiones

- **Tokens** en `src/app/globals.css` (Tailwind 4, `@theme inline`): paleta Día/Noche como variables CSS, tipografías (`Josefin Sans` display, `Playfair Display` serif, `Inter` sans, vía `next/font`), radios, sombras y duraciones. Modo por `data-theme` en `<html>` con script en `<head>` (sin parpadeo) y `localStorage` con try/catch. Cada pastel tiene versión "texto" (`*-ink`): en Noche coincide con el pastel.
- **Gráficas**: relleno con el pastel y trazo con la versión "texto" (los pasteles sobre crema no llegan a 3:1). Orden fijo en `components/charts/palette.ts`.
- **Radar** (normalización): cada eje se escala min-max a 0-100 entre todos los héroes seleccionables (vida, velocidad, cadencia, cargador y DPS del arma). Las fórmulas definitivas llegan con `/heroes/compare`.
- **Tooltip de objeto**: el texto del juego trae HTML y SVG incrustado; se muestra como texto plano (`stripHtml`). Con la API real se sanitizará HTML (fase 7).
- **Sin Radix/shadcn**: componentes propios (menos dependencias). Tooltip con CSS (hover y foco), pestañas con teclado propio. Si hace falta un diálogo o menú complejo, se añade Radix entonces.
- **i18n**: `next-intl` con español fijo y sin prefijo en la URL (`src/i18n/request.ts`); `en.json` existe pero no se activa (fase 10).
- **Cliente de API con reintentos/timeout (`client.ts`)**: no se hace en esta fase; en mock no tiene uso. Va con `httpSource` en la fase 9. Tampoco se instalan Zod ni TanStack Query hasta que haya un uso real.
- **Menú**: enlaza a páginas que aún no existen (se construyen en las fases 2-7) y devuelven 404 hasta entonces.
- **`/styleguide`** lleva `noindex`. Se publica también en Vercel para revisarlo desde el móvil.
- **Dev en otro host**: abrir la app en desarrollo desde un origen distinto de `localhost` (p. ej. `host.docker.internal`) bloquea la hidratación de Next 16 y las gráficas salen vacías. Con `localhost` o con `preview` funciona.

## Tamaño de funciones (Vercel)

Fixtures incluidos: ~49 MB (75 MB menos 26 MB excluidos), frente al límite de 250 MB. Estimación local; medir tras el primer despliegue.

## Pendiente

- `scripts/prepare-mock-data.ts` (fixtures reducidos en `mock/derived/`): fase 2, cuando se sepa qué campos se usan de verdad.
- Tests e2e de Playwright (el servicio `e2e` está definido pero sin tests).
- Imágenes: en mock solo hay placeholders; `next/image` y `remotePatterns` en la fase 9.

## Dirección visual v2 (a partir de `art-examples/`)

Cambio **autorizado por el usuario** respecto a la sección 7 de la spec ("no hace falta que los colores sean pastel"). La spec sigue describiendo la paleta pastel original; manda esto.

- **Referencias:** portada y logo (verde petróleo, crema, bermellón, rueda con ojo), póster dorado (pergamino, cintas rojas), calle de noche (verde oscuro, luz de farola, esmeralda) y pantalla de roster (rojo óxido, serif pesada en mayúsculas, etiquetas rojas tipo pegatina, trama de puntos).
- **Paleta:** Día = pergamino + tinta casi negra + oro; Noche = calle verde oscuro + crema + oro de farola. Colores de acción `accent` (bermellón) y panel `poster` (verde petróleo). Valores en `src/app/globals.css`.
- **Nombres de tokens conservados** (`sage`, `apricot`, `lilac`, `rose`, `teal`) para no tocar todo el código, aunque ya no son pasteles: sage = Vitality (verde), apricot = Weapon (naranja), lilac = Spirit (violeta), rose = negativo/derrota (carmesí), teal = información.
- **Tipografía:** Playfair Display (peso variable hasta 900) para títulos y subtítulos; Inter para datos. Se descartó Josefin Sans.
- **Elementos:** cartel de portada verde petróleo con rayos, trama de puntos y bombillas; cinta roja con muescas para el nombre de héroe; etiquetas tipo pegatina; emblema de rueda con ojo (diseño propio, no el logo oficial).
- **Contraste medido** con la fórmula WCAG (no a ojo): todos los pares de texto de ambos modos cumplen AA (≥ 4,5, o ≥ 3 en texto grande en latón). Para lograrlo, los chips usan relleno suave (25 % en Día, 12 % en Noche) con el color de texto `*-ink`.
- No se han copiado imágenes de `art-examples/` a la web: son solo referencia.

## Más estilo Deadlock (ronda 2 de diseño)

- **Modo por defecto: Noche** (antes Día): la interfaz del juego es oscura. Se respeta la elección guardada en `localStorage`.
- **Cable con símbolos colgando** (`SigilWire`): referencia directa a las calles del juego. Sustituye a las bombillas superiores del cartel; las de abajo se mantienen.
- **Emblema** crema sobre disco bermellón con anillo dorado (como el logo de la portada).
- **Menú** con fila resaltada invertida al pasar el ratón o estar activa (`NavLink`, usa `usePathname`).
- **Fondo:** el color de fondo se pinta en `<html>` (no en `<body>`) para que el grano y la viñeta, con `z-index: -1`, queden por encima. Con el fondo en `<body>` quedaban tapados.
- **Capturas a página completa:** la viñeta y el grano son `fixed`, así que en un screenshot de página completa aparece una franja a la altura de la ventana. Es un artefacto de la captura, no se ve en el navegador.

## Retoque de colores y retratos (ronda 3 de diseño)

- **Qué fallaba:** `sage` (menta) y `teal` casi iguales y demasiado pastel; `lilac` lavanda pastel; `rose` y `accent` el mismo coral rosado; botón desactivado embarrado.
- **Ahora** (valores en `globals.css` y en la tabla 7.2 de la spec): `sage` verde lima, `apricot` naranja, `lilac` violeta profundo, `teal` turquesa, `rose` y `accent` en la misma familia roja. En Noche el `accent` es un bermellón profundo con texto crema (antes coral con texto oscuro).
- **Verificado con la fórmula WCAG:** todos los pares de texto, chips y líneas de gráfica cumplen (≥ 4,5 el texto, ≥ 3 las líneas y bordes). Matices separados: lima 90°, naranja 26°, violeta 260°, turquesa 177°, rojo 9°.
- **Retratos:** silueta de personaje con contorno de luz (5 variantes por id) en lugar del medallón con iniciales; la fila pequeña sigue con iniciales.
- **Inicio:** franja "partidas en directo" con el dato real; tarjetas con un degradado sutil en Noche.
- **Sankey:** margen derecho ampliado (el último nodo se cortaba).

## Cartel de portada más integrado (ronda 4 de diseño)

- **Problema:** panel verde con rayos bermellón muy saturados: era lo que más destacaba y chocaba con el resto.
- **Ahora:** rayos **tonales** (token `poster-ray`: verde petróleo un poco más claro que el panel). El bermellón queda solo en el emblema y el botón principal, que pasan a ser el único foco de color. En Día, el panel hace pareja con el verde del footer.
- `PosterHeader` ya no recibe color por defecto de acento; sigue admitiendo la prop `color` si una página lo necesita.

## Más animaciones (ronda 2 de movimiento)

- **Sin librerías nuevas:** Motion (ya instalado) cubre scroll, resortes y layout. No hizo falta GSAP, Lenis ni tsparticles; las brasas son un canvas propio de ~34 partículas.
- **Nuevo:** brasas y luz de farola (`Ambient`, solo Noche), rueda del emblema con el scroll y giro al pasar el ratón (`SpinEmblem`), inclinación 3D de tarjetas (`Tilt`), píldora deslizante del menú (`NavMenu`, sustituye a `NavLink`), progreso de scroll (`ScrollProgress`), títulos de sección animados (`SectionTitle`), filas de tabla que se reordenan con animación, entrada de contenido en pestañas, entrada de página (`template.tsx`, solo CSS), deriva de rayos, siluetas que respiran, parpadeo del ojo y halo del emblema.
- **Error encontrado y corregido:** con movimiento reducido salía el error de hidratación #418 de React. `useReducedMotion` vale distinto en servidor y cliente y yo cambiaba la estructura del DOM según su valor (`Ambient` devolvía `null`, `Tilt` un `<div>`). Ahora la estructura es siempre la misma y se oculta con `motion-reduce:` o se ignoran los eventos.
- **Otro fallo corregido:** el halo del emblema usaba `box-shadow` y pisaba el anillo dorado (también `box-shadow`). Ahora usa `drop-shadow`.
- **Verificado en navegador** (Playwright): el emblema gira con el scroll, la barra de progreso crece, las brasas se dibujan y se mueven, la luz sigue al cursor, la píldora del menú se desliza, la tarjeta se inclina, las filas animan al ordenar, el filete del título se dibuja, la página entra con fundido al navegar, y con movimiento reducido no hay brasas ni luz, no se dibuja nada y no hay errores.
- **Sin verificar:** rendimiento (fps) en móviles de gama baja y el aspecto en Safari/Firefox.

## Fase 2: wiki estática (todo en modo mock, sin tocar `httpSource`)

**Páginas:** `/heroes`, `/heroes/[slug]`, `/items`, `/items/[slug]`, `/ranks`, `/npcs`, `/mechanics`. Enlaces a rangos, NPCs y mecánicas en el footer (el menú principal ya está lleno).

**Decisiones**
- **Slug de héroe** = nombre sin acentos ni símbolos (`mo-krill`); sin colisiones en los 44. **Slug de objeto** = `class_name`. Solo los objetos de tipo `upgrade` tienen ficha; una habilidad o un arma dan 404.
- **Tienda:** 156 objetos (los `shopable` de tier 1 a 4). El tier 5 y los no comprables quedan fuera de la tienda, pero sus fichas existen si se llega por enlace (se marcan "No disponible en la tienda").
- **Filtros en la URL** (`FilterBar`, cliente): los selects aplican al instante, la búsqueda espera 300 ms. Sin JS funciona con el botón "Aplicar" (formulario GET). Las listas son dinámicas (usan `searchParams`); las fichas se generan estáticas (`generateStaticParams`) y se revalidan cada 12 h.
- **Habilidades** por `hero.items.signature1..4`. Las mejoras T1/T2/T3 vienen de `ability.upgrades[].property_upgrades`.
- **Alcance del arma:** la API da unidades del motor; se convierten a metros dividiendo entre 39,37 (p. ej. 708,66 → 18 m).
- **Unidades duplicadas:** la API a veces ya incluye la unidad en el valor (`"20m"` con `postfix: "m"`); `propText` no la duplica.
- **Rangos:** `badge_level = tier*10 + subrango`; el gráfico suma jugadores por tier. Las insignias son un círculo con el color del rango (las imágenes reales llegan con la API).
- **Mecánicas:** cada cifra sale de los datos (`generic-data`, `misc-entities`, `buff-stats`, mapa). Donde no está confirmado qué significa un valor, no se explica: se muestra tal cual. Textos propios escritos para la web.
- **Textos del juego en inglés** (fixtures), con un aviso visible en las fichas.

**Errores encontrados y corregidos al probar**
- Los títulos largos del cartel no podían partirse en líneas (los espacios eran espacios duros por la animación por letras). Ahora cada palabra es un bloque y los espacios son normales.
- Las fichas de la tienda se encogían al ancho de su contenido (`RichTooltip` forzaba `inline-block`); nueva prop `fill`.
- Unidades duplicadas ("20mm") y un "0m" que se colaba en el tooltip (`Number("0m")` es `NaN`).
- Una frase sobre la distribución de jugadores en `/ranks` que no se seguía de los datos (eliminada) y una lista `<ol>` con hijos `<div>` (HTML inválido).

**Verificado en navegador** (Playwright, contra `preview`): las 7 rutas dan 200; 44 héroes; el filtro por tipo actualiza la URL y la lista; la búsqueda con debounce; estado vacío; la ficha tiene 4 habilidades, vida 830 y 12 filas de mejoras; 404 en héroe y objeto inexistentes y en una habilidad; tienda con filtros combinados y tooltip; 12 rangos, gráfico y 2 temporadas; 56 NPCs; 5 secciones y 34 filas de buffs en mecánicas; sin errores de JavaScript; sin desbordes horizontales a 390 px.

**Pendiente / sin verificar**
- No hay tests e2e automáticos en el repo (las pruebas se hicieron con un script puntual). Llegan en la fase 8.
- Sin imágenes de héroes, objetos ni habilidades (placeholders) hasta la fase 9.
- Las páginas de la wiki no se han medido con Lighthouse (fase 8).

## Fase 3: tracker (todo en modo mock, sin tocar `httpSource`)

**Páginas:** `/players`, `/players/[accountId]`, `/players/compare`, `/matches/[matchId]`, más `src/app/not-found.tsx` (404 en español) y dos rutas de API propias (`/api/players/search`, `POST /api/players/[id]/refresh`).

**Hallazgos en los datos (cambian cómo se interpreta el historial)**
- **Victoria = `match_result === player_team`.** `player_match_outcome` NO es victoria/derrota: toma valores 0 a 5 y solo coincide con "ganó" en la mitad de los casos. (En el fixture: 4.429 victorias de 7.783 = 56,9 %.)
- **Modos:** `match_mode` y `game_mode` son enteros; se decodifican con el índice de los enums `ActiveMatchMode` y `ActiveMatchGameMode` del OpenAPI (4 = Ranked, 4 = Street Brawl…). Coincide con los datos: 716 partidas ranked y 645 con `ranked_display_badge`.
- **La lista `items` de un jugador en una partida mezcla objetos de tienda con las mejoras de sus habilidades.** Se filtra por `type === "upgrade"` y se elimina lo repetido; sin eso el marcador salía con "Radiant Daggers, Radiant Daggers".
- `objectives[].team` es el **dueño** del objetivo destruido (el equipo ganador perdió 8 y el perdedor 13).
- Los nombres de los equipos (Ámbar / Zafiro) existen en el esquema de modelos, pero la API no dice a qué `team` corresponde cada uno: se llaman Equipo A (0) y B (1).

**Decisiones**
- `src/lib/steam-id.ts`: BigInt para SteamID64; acepta SteamID32/64, SteamID3 (`[U:1:n]`), SteamID2 (`STEAM_0:1:n`), URL con `/profiles/<id64>` o `/id/<vanity>` y nombres. Un número fuera de rango se trata como nombre. La ruta `/players/[accountId]` solo acepta enteros de 32 bits (un SteamID64 en la ruta da la pantalla 404).
- **Vanity:** se resuelve buscando con `steam-search` y quedándose con el resultado cuya URL coincide exacta; si no hay, se muestran las coincidencias. (Con clave de Steam se podría resolver sin ambigüedad; queda para la fase 10.)
- **Gráficas solo con el historial que devuelve la API** (sin base de datos). El win rate acumulado no se dibuja hasta tener 30 partidas (las primeras saltaban de 0 % a 100 % y aplastaban el eje). La evolución del rango usa solo las 645 partidas ranked del fixture que traen `ranked_display_badge`.
- **Compañeros y rivales:** los de mejor/peor récord exigen 20 partidas como mínimo (un 1/1 no es "100 %"). Los nombres se piden en lote a `/v1/players/steam`; los ids sin perfil se muestran como `#id`.
- **"Actualizar historial":** solo con clic, cooldown de 10 min persistido en localStorage. La ruta `POST /api/players/[id]/refresh` en mock no hace nada; el `force_refetch` real llega con `httpSource` (fase 9). Nunca se lanza solo.
- **Estados de error:** `classifyStatuses` decide en un único sitio (403 privado, 429/503/504 ocupada, 404 no existe, resto error). Los datos opcionales (región, héroes, compañeros…) fallan sin tumbar la página.
- **Cuentas de demostración del mock** (`mock-source.ts`, con test): `/players/403` (privado), `/players/404` (no existe), `/players/503` (API ocupada) y `/matches/404`. No existen en la API real; sin ellas no habría forma de ver esos estados porque los fixtures devuelven siempre el mismo ejemplo.
- **404 con `loading.tsx`:** como Next ya ha enviado la cabecera cuando se ejecuta `notFound()`, una ruta inválida da HTTP 200 con la pantalla "no encontrado" y `noindex`, no un 404 real. Es un límite del streaming; las fichas de héroe y objeto (sin `loading.tsx`) sí dan 404 real.
- `es-ES` no agrupa los miles en números de 4 cifras ("7783" frente a "10.609"): es la norma del idioma y se mantiene.

**Errores encontrados y corregidos al probar**
- Un SteamID64 de ejemplo calculado a mano con un dígito mal (lo detectó el test).
- Win rate acumulado desde 0 % que hundía el eje; etiquetas del eje X repetidas, "Ascendant" cortado y tooltip del rango con un número en vez del nombre.
- Objetos duplicados en el marcador (ver arriba) y `shopItems` usado sin definir.
- Pantalla 404 genérica de Next en inglés → página propia en español.

**Verificado:** 45 tests unitarios (15 de IDs, 18 de estadísticas, 12 de la capa de datos, con las cuentas demo) y una batería en navegador real (6 formatos de búsqueda, autocompletado con debounce y teclado, perfil con 7783 partidas / 56,9 % / Eternus, 20 filas por página y paginación, 44 héroes, estados privado / no existe / ocupada, seguir y dejar de seguir, cooldown que persiste al recargar, comparador, partida con 12 jugadores y 75 muertes, sin errores de JavaScript, sin desbordes a 390 px).

**Pendiente / sin verificar**
- El **historial no trae los objetos finales** (spec 6.12): solo la partida detallada los tiene. No se muestran en las filas del historial.
- Avatares y retratos: placeholders hasta la fase 9.
- Con la API real: formato exacto de `account_ids` en lote (se asume separado por comas), respuesta real de una cuenta privada (se asume 403) y caché de respaldo ante 503.
- Sin tests e2e en el repo (fase 8) ni medición de Lighthouse.
- Los textos relativos ("hace 2 meses") se calculan con la hora del servidor y la del navegador; podrían diferir un instante al hidratar.
