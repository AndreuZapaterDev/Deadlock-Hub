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

## Fase 4: meta y estadísticas (todo en modo mock, sin tocar `httpSource`)

**Páginas:** `/tier-list`, `/counters`, `/meta`, `/leaderboard`, `/heroes/compare`; estadísticas de meta añadidas a `/heroes/[slug]` (componente `HeroMeta`) y a `/items/[slug]`.

**Hallazgos en los datos**
- `hero-stats` cuenta **partidas-jugador** (cada partida suma 12 filas): Σ = 82.034.091 ≈ 12 × las 6,83 M partidas de `game-stats`. Por eso **pick rate = partidas del héroe / (Σ / 12)** (% de partidas en las que aparece; 36,6 % para Infernus). El ban rate (`bans / matches`) usa el total de partidas de su propio endpoint.
- **No hay duración por héroe**, así que no se puede dar "almas por minuto" (lo pide la spec en la tabla de la tier list): se da **almas por partida**.
- **Filtros del OpenAPI:** rango = `min/max_average_badge` (decenas = tier, unidad = subrango; el tier t va de t·10+1 a t·10+6, máximo 116), fechas = `min/max_unix_timestamp`, duración = `min/max_duration_s`. **La región no existe en las analytics**, solo en el leaderboard (la spec la pedía como filtro común).
- **Fixtures específicos de Infernus (id 1):** `ability-order-stats`, `hero-build-stats/1`, `item-flow-stats` y el leaderboard por héroe. El mock devuelve ese ejemplo para cualquier héroe, así que mostrarlo en otra ficha sería falso. En mock esas secciones solo se muestran para Infernus; las demás fichas dicen "Sin datos de ejemplo para este héroe" (`hasHeroSpecificData`). Con la API real aparecen para todos.
- **Builds:** solo 17 de los 49.653 `hero_build_id` tienen nombre en `/v1/builds`; el resto se muestra como "Build #id".
- `hero-comb-stats` del fixture solo trae parejas (`comb_size=2`) y **no respeta `include_hero_ids`**.
- La tabla de sinergias guarda cada pareja una sola vez (id1 < id2); la de counters trae ambos sentidos.
- Leaderboard por héroe: solo existe Europa/Infernus (36 filas); cualquier otra región o héroe devuelve ese ejemplo (o el de Europa global, 1000 filas).

**Decisiones**
- **Win rate ajustado** = (victorias + 500) / (partidas + 1000): equivale a añadir 1000 partidas ficticias al 50 %. Con millones apenas cambia; con pocas evita que un 3/3 sea 100 %.
- **Tiers por percentil**, no por umbral: S 10 % mejor, A 20 %, B 40 %, C 20 %, D 10 % peor (44 héroes → 4/9/18/9/4). Siempre hay al menos un S. La fórmula está documentada en la propia página.
- **Matchups y sinergias** exigen 1.000 partidas como mínimo para listarse como "fuerte/débil contra" o "mejor compañero".
- **Radar del comparador:** 6 ejes (vida, velocidad, DPS, cadencia, cargador, alcance), cada uno min-max a 0-100 entre TODOS los héroes. No hay eje de "utilidad": no se puede medir con los datos (la spec lo mencionaba).
- **Filtros comunes** (`analytics-filters.ts`): se leen de la URL, todo lo inválido se ignora y un rango imposible (mín > máx) descarta el máximo. Se traducen a los parámetros reales y se envían a la API (en mock no cambian los datos, y cada página lo avisa con `DemoNote`).
- **Cartel compacto** (`PosterHeader compact`) para páginas de datos: sin cable ni emblema y título más pequeño, para que la tabla o la matriz queden a la vista.
- Fichas con estadísticas pasan a `revalidate = 1800` (30 min, como pide la spec para analytics); la wiki estática sigue en 12 h.
- Los filtros de la tier list no incluyen región; el leaderboard sí (pestañas) y por héroe (select).

**Errores encontrados y corregidos al probar**
- Con un solo elemento, `assignTiers` lo dejaba en tier B (el redondeo de los cortes): ahora siempre hay un S. Lo destapó un test.
- Resto de un test con un símbolo inexistente (`bannedRateGuard`) escrito por error.
- Tres falsos fallos de mi prueba en navegador (helper que ignoraba un argumento, selector que contaba también el título, espera corta): corregidos en la prueba, no en la web.

**Verificado:** 76 tests unitarios (17 de analytics, 11 de filtros, 3 de Sankey, más los anteriores) y una batería en navegador real: las 7 rutas dan 200; tiers 4/9/18/9/4; filtros en URL y valores inválidos ignorados; matriz 44×44 con 1.892 celdas clicables y simétrica en sinergias; 156 objetos, 15 combinaciones, 15 parejas y 15 carriles en `/meta`; leaderboard con 50 filas, paginación y por héroe (36); comparador con 2 y 3 héroes, radar, mejor/peor valor y selector en la URL; ficha de Infernus con 3 órdenes, 5 builds, Sankey, 15 chips y top 10; la ficha de otro héroe no muestra datos de Infernus; sin errores de JavaScript ni desbordes a 390 px.

**Rendimiento (a vigilar):** hacer clic en una celda de la matriz de counters tarda ~1,3 s porque el servidor vuelve a renderizar las 1.892 celdas. Aceptable, pero si molesta se puede resaltar la celda en el cliente sin renderizar de nuevo.

**Pendiente / sin verificar**
- Con la API real: los nombres exactos de varios parámetros están sacados del OpenAPI pero no probados; la respuesta real de `hero-ban-stats` frente a `hero-stats` (periodos distintos) podría desajustar el ban rate.
- No hay tendencia por parche ni rendimiento por rango (gráficas): los fixtures tienen un único `bucket`. Se activan con la API real.
- "Héroes que más usan un objeto" (ficha de objeto): sin datos en los fixtures.
- Sin tests e2e en el repo (fase 8) ni Lighthouse.

## Fase 5 — Builds y herramientas (solo mock)

**Qué hay:** `/builds`, `/builds/[heroId]/[buildId]`, `/build-planner`, `/crosshair` y rutas `api/crosshair/{code,settings,image}` (validan y sanean la entrada). Lógica pura y testeada en `lib/build-planner.ts`, `crosshair.ts`, `builds.ts`.

**Decisiones y hallazgos**
- Calculadora aproximada (documentada en la propia página): vida = (base + plano) × (1 + %), DPS = base × (1 + %daño) × (1 + %cadencia), resistencias apiladas como 1 − Π(1 − r). Solo cuenta las secciones «innate».
- Los objetos como Extra Health o Extended Magazine guardan su bonificación principal en `elevated_properties`, no en `properties`: `itemEffects` e `itemSections` leen ambas (sin duplicar si una clave está en las dos).
- El estado del planner va en la URL (`?h=slug&i=a,b,c`) y se valida (desconocidos, repetidos y tope por categoría fuera); guardado local con `useSyncExternalStore`.
- Vista previa del crosshair en SVG local, independiente de la API; la imagen oficial se pide bajo demanda.
- Las descripciones de builds se «linkifican» solo con http/https y `rel="noopener noreferrer nofollow ugc"`.

**Errores corregidos:** `elevated_properties` ignoradas (arriba); desborde horizontal a 390 px en detalle de build (URL larga en grid → `grid-cols-1`/`minmax(0,…)` + `overflow-wrap:anywhere`) y en el planner (la lista de objetos y el grid sin `grid-cols-1`).

**Verificado:** 139 tests unitarios; batería en navegador real (build, planner, crosshair, móvil 390 px, sin errores JS); regresión de fases 3–4; tsc y eslint limpios.

**Pendiente / sin verificar:** con la API real, los nombres de parámetros de builds y la respuesta de crosshair no están probados; la importación en el juego solo muestra el ID (no se sabe el flujo exacto); `currency_type` 2/1 = desbloquear/mejorar es inferencia; no hay e2e en el repo ni Lighthouse.

## Fase 6 — Mapa y directo

**Qué hay:** `/map` (SVG propio: objetivos, campamentos y heatmap de kills/muertes con filtro de héroe y de momento de la partida en la URL; clic en un objetivo o campamento = ficha), `/live` (lista refrescada cada 60 s desde `/api/live`, solo con la pestaña visible) y la lógica pura de `lib/map.ts` (con tests).

**Decisiones y hallazgos**
- Coordenadas: `left = (x + radius) / (2·radius)` y `top = (radius − y) / (2·radius)`; coincide con `left_relative`/`top_relative` de la API (test).
- `kill-death-stats` trae decenas de miles de puntos y valores centinela (-32768): se agrupan en una rejilla 48×48 **en el servidor** y solo se envían ~1.400 celdas al navegador.
- El minimapa real solo se dibuja con imágenes remotas activas; sin ellas, panel con cuadrícula.
- `matches/active` no trae duración ni rango medio: la duración se calcula con `start_time`; el rango medio se omite. El enlace de retransmisión (`live/urls`) se muestra si existe.
- En mock los filtros del heatmap no cambian los datos (un único periodo) y `/live` no cambia al refrescar.

## Fase 7 — Parches

**Qué hay:** `/patches` (feed de `/v2/patches`, filtro foro/Steam, «gran actualización» según `big-days`), `/patches/[id]` (HTML sanitizado con `sanitize-html` en el servidor y nombres de héroes y objetos enlazados), `/patches/diff` (comparador automático, filtros en la URL) y «Historial de cambios» en las fichas de héroe y objeto. Lógica pura y testeada: `lib/patch-diff.ts`, `lib/patches.ts`.

**Decisiones y hallazgos**
- Id de parche = número final del `guid`. Un parche del foro es «gran actualización» si la fecha de su título (`MM-DD-AAAA`) coincide con un big day.
- **El comparador solo compara números** (y booleanos): al principio también comparaba textos y listas de nombres de estadística, y salían decenas de «cambios» falsos por traducciones y reordenaciones. Se ignoran ids, rutas, imágenes y campos de depuración; héroes no jugables fuera.
- «Más es mejor» / «menos es mejor» por nombre de campo (regex en `patch-diff.ts`); lo que no encaja es «neutral» (◆). Es una heurística: puede equivocarse con campos ambiguos (p. ej. `duration`).
- **Con la API real `client_version` sí funciona** (6865 y 6864 son idénticas; 6800 y 6000 difieren). Muchas versiones son actualizaciones sin cambios de equilibrio, así que, si el «anterior» no cambia nada, el comparador retrocede hasta justo antes del último gran día y lo indica en la página.
- **Mock:** los fixtures solo tienen una versión. `mock/derived/patch-demo.json` describe cómo era la versión anterior con cambios **inventados** (la página lo avisa). No es un dato real del juego.
- Las fichas solo muestran el historial del último parche comparado (no una lista de todos los parches en que cambió: eso exigiría pedir muchas versiones). La comparación por defecto se calcula una vez por hora y proceso.
- Las imágenes de las notas solo se permiten con imágenes remotas activas (en mock se quitan, para no salir a ningún CDN).

## Fase 8 — Pulido

**Hecho**
- **SEO:** `robots.ts`, `sitemap.ts` (344 URLs: páginas, héroes, objetos y parches), metadatos por página y **imágenes Open Graph** generadas (portada, héroe y perfil; la del perfil es genérica a propósito, sin datos del jugador).
- **PWA:** `manifest.ts` con iconos 192/512/maskable generados (`/icons/*`), icono de Apple y favicon; `public/sw.js` **escrito a mano** (Serwist aún no soporta el build con Turbopack de Next 16) con las estrategias de la sección 8.1; página `/offline`; botón «Instalar app», instrucciones para iOS, aviso «Nueva versión disponible» y aviso sin conexión (`components/pwa/pwa.tsx`); jugadores seguidos en el inicio.
- **e2e:** 29 tests Playwright × 2 (escritorio y móvil = 58) contra la vista previa de producción en modo mock: carga de 23 páginas, sin scroll horizontal, **ninguna petición externa en modo mock**, buscador de jugadores, mapa, tema Día/Noche, manifest/robots/sitemap y service worker + wiki sin conexión. `docker compose run --rm e2e`.

**Errores que destapó la fase**
- El service worker recargaba la página sola en la primera visita (`controllerchange` al tomar el control). Ahora solo recarga si el usuario pulsa «Recargar».
- Un bucle infinito en `httpSource` (se borró un `return` al editar con `sed`) y `cache: "no-store"` en el prerender, que Next interpreta como «página dinámica». Ver fase 9.

**No hecho / sin verificar**
- **Lighthouse ≥ 90 en móvil: no medido** (el entorno no permitió descargar la herramienta). Hay que pasarlo.
- **Accesibilidad:** solo el contraste medido de fases anteriores y los roles/etiquetas de los componentes nuevos; no hay auditoría automática (axe).
- La instalación en Android/iOS reales no se ha probado; sí el registro del worker y el modo sin conexión en Chromium.

## Fase 9 — Conexión con la API real (parcial)

**Hecho:** `httpSource` con reintentos (503 con `Retry-After` y backoff; fallos de red; 504/429 no se reintentan), timeout de 15 s, máximo 5 peticiones en paralelo, `X-Api-Key` opcional, `language=spanish` solo en `/v1/assets/*` (en `/v1/builds`, `language` es otro enum), caché por tipo de dato y **caché en memoria** para las respuestas de más de 2 MB (la caché de Next las rechaza), deduplicación de peticiones simultáneas, imágenes remotas de héroes y objetos (`next/image` con `unoptimized`), banner «Modo demo» oculto con la API real.

**Hallazgos**
- `lane-matchup-stats` sin filtrar pesa 161 MB y da 504; con `min_matches=2000` devuelve `[]`. «Duelos de carril» muestra un error amable en `/meta`.
- Con la API real, el **build de producción prerenderiza ~320 páginas** y supera el rate limit (429) y los timeouts. Se limitó `experimental.cpus` a 3 en producción, pero **el build contra la API real no se ha visto terminar**. En Vercel se despliega con `DATA_SOURCE=mock` (modo demo) y ese build sí pasa.
- Las imágenes de héroe son recortes verticales 280×380: se muestran con `object-contain`.

**Pendiente:** Zod para validar respuestas; avatares de Steam y iconos de habilidades; build real; revisar los nombres de parámetros no probados de fases 4–5 contra la API.

## Idiomas

**Disponibles:** inglés, español, portugués, francés, alemán y ruso (`lib/languages.ts`). La API admite 29 para los textos del juego (brazilian, bulgarian, czech, danish, dutch, finnish, greek, hungarian, indonesian, italian, japanese, koreana, latam, norwegian, polish, romanian, schinese, swedish, tchinese, thai, turkish, ukrainian, vietnamese además de los seis): añadir uno es una línea en `LANGUAGES` y su `src/messages/<ui>.json`.

**Cómo funciona:** cookie `lang` → `getLanguage()` (servidor). Decide a la vez el parámetro `language` de `/v1/assets/*` y el fichero de mensajes de la interfaz. Sin cookie: español.

**Traducido (núcleo de la interfaz):** menú, encabezado, buscador, selector, pie, banner demo, inicio completo, 404, `/offline`, avisos de la PWA, paginación, filtros («Aplicar», «Quitar filtros») y «Tus jugadores». `languages.test.ts` comprueba que los seis ficheros tienen **exactamente las mismas claves**, ninguna vacía, y las mismas variables y etiquetas (y las cuatro formas de plural del ruso).

**NO traducido (sigue en español, en todos los idiomas):** el texto escrito en el código de las demás páginas (tier list, meta, counters, tracker, builds, planner, crosshair, mapa, directo, parches, rangos, NPCs, mecánicas, estado…), títulos de página y metadatos SEO, las etiquetas de `lib/labels.ts` y los mensajes de error/vacío que pasan las páginas. Un usuario en inglés ve el menú y el inicio en inglés, y el resto de páginas con los **datos del juego** en inglés pero la interfaz en español. Pasarlas a mensajes es el siguiente paso (≈90 ficheros).
- Números, porcentajes y fechas relativas siguen formateados en `es-ES` (`lib/format.ts`).
- La página `/offline` se guarda en el idioma en que estaba la web al instalar el service worker.
- Las traducciones las he escrito yo (no son de un traductor profesional): conviene una revisión nativa, sobre todo las de ruso y portugués (de Portugal).

## Mapa (rehecho)

**Qué hay:** minimapa real con **zoom** (rueda, botones +/−, pellizco, teclado `+ − 0`) y **arrastre**; pantalla completa; **capas** activables (objetivos, campamentos, tirolinas con el color de la API, túneles y túneles de ratas, heatmap y 16 tipos de entidad: tiendas, teletransportadores con su destino, urnas de almas, botín, almohadillas de salto, cuerdas…); tooltip al pasar el ratón; ficha al pulsar (con «Centrar»); leyenda y control de intensidad del heatmap; etiquetas BASE A/B. Las capas activas van en la URL (`?capas=`) y la vista se comparte.

**Decisiones**
- **Heatmap:** se normaliza por percentiles (se oculta el 25 % inferior y se satura el 3 % superior). Normalizar por el máximo —con escala lineal, de raíz o logarítmica— dejaba todo el mapa teñido. Se dibuja en un canvas de 64×64 escalado con interpolación y se colorea con una máscara SVG (usa el token del tema); antes eran ~4.000 círculos.
- Las posiciones se redondean a 4 decimales y solo llegan al navegador los ~900 símbolos que se pintan; el fichero de kills (decenas de miles de puntos) se agrega en el servidor.
- Lo muy abundante (cajas, estatuas, respiraderos, velos…) empieza apagado. Solo los objetivos se pueden recorrer con el tabulador; el resto de símbolos son para ratón o toque (serían cientos de paradas de tabulador).
- La página se renderiza en cada visita (depende de la cookie de idioma y de la URL), pero los datos de la API van en caché.

**Errores que destapó**
- `getLanguage()` capturaba la señal interna de Next que marca una página como dinámica, así que **en producción la cookie de idioma se ignoraba** (las páginas se prerenderizaban en español). Corregido y con test e2e.

**Limitaciones:** en modo demo no hay minimapa ni túneles (son imágenes remotas) y el heatmap no cambia con los filtros (un único periodo). Las etiquetas de las entidades están escritas por mí a partir de los nombres de la API, no vienen de ella: conviene revisarlas. No se ha medido el rendimiento en móviles reales.

### Mapa — filtros reales y más herramientas

**Filtros (todos probados con la API real: cada uno cambia los datos):** héroe, desde/hasta el minuto, rango desde/hasta, parche, duración y tipo de partida (ranked / normales). Se aplican sin recargar la página (`/api/map/heat`), con indicador de carga, estado «sin datos», error con «Reintentar», chips de lo activo, «Quitar filtros» y caché por combinación en el navegador. Viajan en la URL junto a las capas y la vista (`z`, `cx`, `cy`). Lógica pura y testeada en `lib/map-filters.ts`.

**Por qué antes «no funcionaban»:** con el filtro de héroe la API tarda 20 s o da 504 y el cliente cortaba a los 15 s, así que el heatmap fallaba. Ahora `kill-death-stats` tiene 50 s de margen y reintenta el 504 (la API deja el cálculo en su caché y el segundo intento sale al instante). Medido: 574 M muertes sin filtros → 18 M con Infernus (8 s en frío).

**Más:** buscador de lugares (objetivos, campamentos, tiendas, teletransportadores, urnas…), minivista con zoom, nombres de los lugares con zoom ≥ 3 y zoom/centro compartibles.

**Limitaciones**
- En modo demo los filtros se aplican y viajan en la URL, pero **no cambian el heatmap** (los fixtures son un único periodo): el panel lo avisa.
- No se ofrece el filtro `team` de la API: no está claro si filtra al equipo que mata o al que muere. El resto de filtros de la API (patrimonio, grupos de habilidad, nuevos jugadores…) tampoco se exponen.
- Los totales del heatmap son de **toda la muestra de la API** (cientos de millones), no de una partida.

## Héroes (mejorados)

**Ficha `/heroes/[slug]`:** menú de secciones fijo con la actual marcada, cabecera con el color propio del héroe (suavizado), historia en párrafos con «seguir leyendo», datos clave y **radar frente a la media** de los 44 héroes; **barras de posición** en cada estadística (puesto entre los héroes y diferencia con la media); **curva de daño del arma**; **calculadora de nivel** (1–36: almas, vida, daño por bala y por segundo, cuerpo a cuerpo y poder espiritual); habilidades con icono, datos clave y mejoras T1/T2/T3 en columnas; **objetos más comprados por fase** (con uso y win rate, de los datos del propio héroe); y las secciones de meta de antes. Lógica pura y testeada en `lib/hero-stats.ts`.

**Lista `/heroes`:** cabecera compacta, **tier y win rate/pick rate en cada tarjeta**, orden (nombre, win rate, pick rate, vida, daño por segundo, dificultad), filtro por tier, **vista de tabla** ordenable y **comparar hasta 3 héroes** desde las tarjetas (barra inferior, guardada en `sessionStorage`).

**Errores corregidos:** el lore mostraba `<br>` sueltos; un aviso de «datos de ejemplo» salía también con la API real; las unidades de las habilidades salían duplicadas («24m m») porque el `postfix` de la API lleva un espacio (« m»); la etiqueta de tipo en las tarjetas salía en inglés («brawler»); el pie enlazaba a `/about`, que no existía (ahora hay una página «Acerca de»).

**Aproximado (y la página lo dice):** la calculadora de nivel suma de forma lineal la mejora por nivel de `standard_level_up_upgrades` (no sabemos si algún valor es porcentual: p. ej. daño de bala 0,052/nivel), y la curva de daño es lineal entre el inicio y el fin de la caída, sin `damage_falloff_bias`. Ninguna incluye objetos ni mejoras de habilidades.

**Pendiente:** el comparador `/heroes/compare` no se ha tocado (ya tenía radar y stats); las imágenes grandes de fondo/nombre del héroe que trae la API no se usan; los textos nuevos están solo en español.

## Rendimiento

**Cómo se midió:** vista previa de producción con la API real, Chromium con el perfil de un Pixel 5, CPU 4× más lenta y red tipo 4G rápido (LCP, CLS y TBT con `PerformanceObserver`; `Performance.getMetrics` de CDP para scripts/estilos/diseño). Lighthouse no se pudo ejecutar en este entorno. Las medidas varían ±30 % entre pasadas: se compararon varias.

**Qué pesaba (antes → después)**
- **CPU con la página quieta, en 4 s:** 3.784 ms → ~800 ms (−79 %). El culpable era `Ambient`: un canvas a pantalla completa redibujado en cada fotograma + un bucle `requestAnimationFrame` que repintaba la ventana aunque el ratón estuviera quieto (~40 % de la CPU). Ahora son brasas con animaciones CSS de `transform`/`opacity` (GPU, sin hilo principal) y una luz que solo se mueve mientras se mueve el ratón. Además el skyline del pie y el cartel no procesan sus animaciones fuera de pantalla (`content-visibility`) y el halo del emblema pulsa 3 veces y se queda encendido.
- **JavaScript inicial en fichas, meta y perfil:** 1.180 kB → ~690 kB. Recharts (~490 kB) se carga solo cuando la gráfica está cerca de verse (`charts/lazy-charts.tsx`), reservando su altura.
- **`/items`:** 4.176 → ~2.000 nodos, HTML 900 → 450 kB, TBT 1,5 s → ~0,7 s. Los 156 tooltips se piden al pasar el ratón (`/api/items/[cls]/tooltip`, JSON + caché del navegador) en vez de ir en la página.
- **`/live`:** 4.164 → ~1.450 nodos, HTML 900 → 276 kB, TBT 1,5 s → ~0,2 s. 30 partidas y «Mostrar más»; héroes en un diccionario (cada URL de imagen una vez).
- **`/counters`:** 4.400 → ~2.500 nodos, HTML 1,6 MB → 0,82 MB, TBT 1,2–1,5 s → ~1,0–1,2 s. Cuadrícula CSS con un nodo por celda, color en 15 clases prefabricadas, `<a>` normales y navegación en un único manejador (en vez de 1.936 `<Link>` que se hidratan uno a uno).
- **Aparición y tilt de tarjetas:** `Reveal` (un solo IntersectionObserver + CSS) y `Tilt` (variables CSS, sin muelles de Motion) ya no montan componentes de Motion por elemento.
- **LCP de la ficha de héroe:** 2,7 s → ~1,8 s (`priority` en el retrato y `preconnect` al CDN de imágenes).
- **Streaming:** en la ficha, meta, objetos populares y cambios llegan por Suspense; el resto no espera.
- **Arranque:** `instrumentation.ts` calienta en segundo plano héroes, objetos, rangos y estadísticas globales (solo con la API real).
- **Cliente de la API:** las respuestas de más de 2 MB y las consultas lentas ya iban en caché de memoria; ver «Fase 9».

**Lo que sigue pesando**
- `/counters` aún bloquea ~1 s en un móvil lento (2.500 nodos y una cuadrícula de 1.936 celdas con color por celda).
- Base de ~690 kB de JS en todas las páginas (React, Next, Motion). `SectionTitle`, el menú, `CountUp`, las pestañas y `SortableTable` aún usan Motion.
- CLS de ~0,05 en `/heroes` por el cambio de tipografía (por debajo del umbral de 0,1).
- Las páginas son dinámicas (la cookie de idioma impide servirlas estáticas): los datos van en caché, pero el HTML se genera en cada visita.
- Todas las animaciones infinitas CSS siguen costando ~800 ms por cada 4 s de página quieta en un móvil lento.

**Errores que destapó:** `docker compose up --build preview` mostraba solo la última línea y ocultó durante un rato que el build de producción fallaba (importar `react-dom/server` en una ruta); se comprueba ahora el código de salida del build.

## Mocks

Se **podaron los fixtures que la web nunca usa**: 76 ficheros (~44 MB) de 129, y sus entradas del `manifest.json` (129 → 53). Quedan 53 (~35 MB). Detalle y cómo recuperar algo en `mock/deadlock-mock/PRUNED.md`. Verificado con los 236 tests, el build de producción y los 80 e2e en modo demo (sin «sin fixture» en el log).
- Se conserva `openapi.json.json` aunque ninguna página lo pida: el resolvedor del mock lo lee para conocer las plantillas de rutas.
- Un test pide `/v1/matches/1/live/url` y se resuelve por plantilla a otro fixture: el análisis usa el resolvedor real, no solo coincidencia de rutas.
- `next.config.ts` ya no necesita la lista de exclusiones de Vercel (sounds, models, demo schema, .bin, synthetic, sql, patron, custom, commands): esos ficheros ya no existen.
- **Ojo:** `EXAMPLES.md`, el `README.md` del mock y los scripts de Python describen el conjunto completo y ya no coinciden. Si se añade una función que pida un endpoint nuevo, hay que restaurar su fixture desde git y añadir su entrada al manifest.

## Sin mock: la web usa solo la API real

**Decisión:** se eliminó el modo mock. `getSource()` devuelve siempre `httpSource`; ya no existen `DATA_SOURCE`, `MOCK_*`, `mockSource`, el resolvedor del manifest, los banners/avisos de «modo demo», los datos de ejemplo del comparador de parches, la carpeta `mock/` (fixtures, scripts de Python, `mock/derived`) ni las cuentas de demostración (`/players/403`, `/404`, `/503`). Todo sigue en el historial de git.

**Qué cambió**
- **Código:** `lib/api/index.ts`, `http-source.ts` (sin la salvaguarda de `DATA_SOURCE`), `patch-data.ts` (solo comparación real con `client_version`), `builds-data.ts` (la API filtra, ordena y pagina; se quitó el filtrado local `filterBuilds`/`sortBuilds`), `lookup.ts` (imágenes remotas siempre), `meta-data.ts` (fuera `isMock` y `hasHeroSpecificData`: orden de habilidades, builds y flujo de objetos salen para **todos** los héroes), fichas y páginas sin avisos de demo, selector de idioma siempre activo, `instrumentation.ts` calienta siempre la caché.
- **«Actualizar historial» ahora funciona de verdad:** `/api/players/[id]/refresh` llama a la API con `force_refetch=true` (límite ≈5/h; el botón mantiene su cooldown) y olvida la caché en memoria del historial (`forgetCached`). Antes devolvía 501 con la API real.
- **OpenAPI:** `mock/deadlock-mock/fixtures/openapi.json.json` → `src/lib/api/openapi.json` (lo usa `languages.test.ts` para comprobar que los idiomas existen en la API).
- **Configuración:** `.env.example` sin variables de mock; `docker-compose.yml` sin los volúmenes `./mock` ni `PREVIEW_DATA_SOURCE`; `next.config.ts` sin el trazado de fixtures; `docs/DEPLOY.md` y `README.md` actualizados.
- **Tests:** unitarios 224 (la capa de datos se prueba con `fetch` simulado: cabeceras, idioma, reintentos, 504 lento, caché y `forgetCached`); **e2e (80) contra la API real**: se quitaron los que dependían de datos fijos (aviso «Modo demo», selector desactivado, «ninguna petición externa en modo mock») y se añadieron «el navegador nunca llama directamente a la API», «una partida enlazada desde el historial carga» y «el selector cambia el idioma».

**Consecuencias (hay que tenerlas presentes)**
- Sin internet o con la API caída **no se puede desarrollar, construir ni pasar los e2e**. El build consulta la API.
- Los e2e dependen de datos vivos (la cuenta `483770846`, que haya partidas en curso…): pueden fallar por cambios en la API, no por la web. `playwright.config.ts` da 120 s por test y reintenta una vez.
- Límite de ≈200 peticiones/min por IP sin clave: conviene `DEADLOCK_API_KEY` en `.env` y en Vercel.
- Los tests e2e ya no controlan los datos: no hay forma de probar los estados de error del tracker (perfil privado, 503…) de forma determinista; siguen cubiertos por las pruebas unitarias de `player-stats`.
- Las secciones anteriores de este fichero que hablan de fixtures, «en mock…» o «modo demo» son **históricas**.

## Héroes (ronda 2): rendimiento
- Ficha: sección «Rendimiento» (`components/hero/hero-performance.tsx`) con win rate por rango (`hero-stats?bucket=avg_badge`, tiers = ⌊cubo/10⌋, cubo 0 ignorado) y win/pick rate semanal (`bucket=start_time_week`, últimas 16 semanas; se descartan semanas incompletas y puntos con <300 partidas). Lógica pura y tests en `lib/hero-trends.ts`. Las dos peticiones (todas las héroes) se comparten entre fichas vía caché en memoria (`hero-stats$` en `LARGE`).
- Listado: vista «Por tier» (`?vista=tiers`) y `/heroes/random` (redirige a un héroe al azar).

## Objetos: rediseño
- Lista: columnas por categoría con color propio (`--c`: Weapon naranja, Vitality verde, Spirit violeta), cabecera con win rate medio, tarjetas con icono en marco oscuro (`ItemIcon`), coste, etiqueta «Activo» y barra de win rate (40–60 %, marca en 50 %); tiers con rombos (`TierPips`). Orden por nombre / win rate / más usados.
- Ficha: banner con el icono grande y color de categoría, camino de construcción (componentes → objeto → mejoras), tarjetas de uso con acento, posición por win rate en su grupo y objetos parecidos. Cálculo en `lib/item-meta.ts`.
- 7 objetos de tienda no traen `image_webp`: se usa `shop_image_webp` (lo traen los 156).
- La rejilla interior usa `grid-cols-[minmax(0,1fr)]`: sin eso, los nombres largos ensanchan la columna y la tarjeta se sale del panel.
