# Informe de datos (fase 0)

Fuente: `mock/deadlock-mock/fixtures/` (respuestas reales capturadas el 24/11/2026, versión de cliente **6865**).
Todo está leído directamente de los ficheros; no se ha llamado a ninguna API. 116 GET reales en el manifest; la web usa unos 70.

## 1. Cómo se relacionan los datos

| Relación | Cómo se enlaza | Comprobado |
|---|---|---|
| **Héroe → habilidades** | `hero.items.signature1..4` contiene el `class_name` de un item de tipo `ability`. Además `item.heroes[]` incluye el id del héroe | 176/176 enlaces resueltos (44 héroes × 4) |
| Héroe → habilidades **innatas** | `hero.items.ability_innate1..3`, `weapon_primary`, `weapon_melee` (también `class_name`) | existen en `items` |
| **Item de tienda → componentes** | `item.component_items[]` (lista de `class_name`) | 64 de 250 upgrades tienen componentes; todos resuelven |
| **IDs en analytics** | `hero_id` → `heroes[].id`; `item_id` → `items[].id` | hero-stats 44/44, item-stats 156/156 |
| **IDs en partidas** | `players[].hero_id`, `players[].items[].item_id` | 32/32 items de una partida resueltos |
| **Rango** | `badge` = `tier*10 + subrank` (116 → tier 11, subrank 6). `tier` → `/v1/assets/ranks` | `rank.badge=116, rank=11, subrank=6` |
| **Cuentas en tracker** | `mate_id` / `enemy_id` / `account_id` son SteamID32. Los **nombres no vienen**: hay que pedirlos en lote a `/v1/players/steam` | mate-stats: 7731 filas sin nombre |
| **Build → objetos** | `hero_build.details.mod_categories[].mods[].ability_id` es un `item.id`. `tags[]` son ids de `build-tags` | resuelven contra items |

Los **upgrades de una habilidad** (T1/T2/T3) están en `ability.upgrades[]` (3 elementos, cada uno con `property_upgrades[{name, bonus}]`).

## 2. Ficheros que usa la web

Tamaño y estado HTTP del fixture. **En negrita**, los que nunca deben llegar enteros al navegador (> 500 KB).

### Assets (revalidate 12 h)
| Endpoint | Fichero | Tamaño | Estado | Estructura útil |
|---|---|---|---|---|
| `/v1/assets/heroes` | `v1__assets__heroes.json` | **2,5 MB** | 200 | array[65] (44 seleccionables). `id, name, class_name, description{lore,role,playstyle}, tags[], hero_type, complexity, gun_tag, images{…}, items{…}, starting_stats{…}, colors{style_hex}, level_info, scaling_stats, stats_display, popular_items{early_game…}` |
| `/v1/assets/items` | `v1__assets__items.json` | **7,6 MB** | 200 | array[782]: 437 `ability`, 250 `upgrade`, 95 `weapon`. Upgrades: `item_slot_type` (weapon/spirit/vitality), `item_tier`, `cost`, `shopable`, `activation`, `is_active_item`, `component_items`, `upgrades`, `tooltip_sections`, `description.desc` (HTML) |
| `/v1/assets/ranks` | `v1__assets__ranks.json` | 40 KB | 200 | array[12] `{tier, name, images{large,small,*_webp}, color}` |
| `/v1/assets/ranked-seasons` | | 1 KB | 200 | array[2] (Beta Season 1 y 2) |
| `/v1/assets/map` | `v1__assets__map.json` | 172 KB | 200 | `radius, images{minimap…}, objective_positions{team0_core: {left_relative, top_relative}…}, zipline_paths[3], neutral_camps[{name, kind, position, left_relative, top_relative, icon}], entities` |
| `/v1/assets/npc-units` | | 201 KB | 200 | array[97]; solo 56 tienen `name`. `max_health, walk_speed, melee_damage, weapon_info…` |
| `/v1/assets/modifiers` | | 38 KB | 200 | array[113] `{class_name, id, class, properties}` |
| `/v1/assets/misc-entities` | | 61 KB | 200 | array[115] power-ups: `initial_spawn_time, spawn_interval, pickup_chances` |
| `/v1/assets/generic-data` | | 34 KB | 200 | constantes: `item_price_per_tier, lane_info, objective_params, rejuv_params, trooper_kill_gold_share_frac…` |
| `/v1/assets/accolades`, `build-tags` | | 9 KB / 3 KB | 200 | array[31] / array[14] |
| `/v1/assets/client-versions`, `steam-info/all` | | 6 KB / 262 KB | 200 | 879 versiones (5044…6865) con fecha |

Las rutas de detalle (`/heroes/{id}`, `/items/{id}`) devuelven siempre el mismo ejemplo (Opera, 82): **no se usan en mock**.

### Analytics (revalidate 30 min)
| Endpoint | Tamaño | Estructura |
|---|---|---|
| `hero-stats` | 36 KB | array[44] `{hero_id, bucket:0, wins, losses, matches, total_kills…}` |
| `hero-ban-stats` | 3 KB | array[44] `{hero_id, bucket, bans, matches}` |
| `hero-counter-stats` | 941 KB | array[1892] `{hero_id, enemy_hero_id, wins, matches_played, kills…}` |
| `hero-synergy-stats` | 431 KB | array[946] `{hero_id1, hero_id2, wins, matches_played…}` |
| `hero-comb-stats` (`comb_size=2&include_hero_ids=1`) | 90 KB | array[946] `{hero_ids[2], wins, losses, matches}` |
| `hero-swap-stats` | 7 KB | array[44] |
| `hero-build-stats` | **6,4 MB** | array[49653] `{hero_id, hero_build_id, wins, losses, matches, players}`; `/1` (1 héroe) 182 KB |
| `item-stats` | 50 KB | array[156] `{item_id, wins, losses, matches, players, avg_buy_time_s, avg_sell_time_s, sold}` |
| `item-flow-stats` (`hero_ids=1`) | **1,8 MB** | `{nodes[509], edges[11229], summary, baseline, reached_per_column…}` |
| `item-permutation-stats` | **1,4 MB** | array[12090] `{item_ids[2], wins, matches}` |
| `build-item-stats` | 9 KB | array[183] `{item_id, builds}` |
| `ability-order-stats` (`hero_id=1`) | 215 KB | array[289] `{abilities[15], avg_upgrade_times_s[15], wins, matches…}` |
| `ability-order-tree` (`hero_id=1`) | **1,3 MB** | array[3427] |
| `ability-max-first-stats` (`hero_id=1`) | 1 KB | array[5] |
| `badge-distribution` / `players/rank/distribution` | 5 KB | array[66] por `badge` |
| `buff-stats` | 11 KB | array[34] |
| `game-stats` | 2 KB | array[1] (`bucket:0`) |
| `kill-death-stats` | **3,2 MB** | array[29930] `{position_x, position_y, killer_team, deaths, kills}`; x entre −32768 y 11264 (celdas de un raster) |
| `lane-matchup-stats`, `lane-soul-curve` | 768 KB / **2,5 MB** | array[3363] |
| `player-performance-curve`, `player-stats/metrics` | 33 KB / 9 KB | curva por `game_time` / percentiles |
| `scoreboards/heroes`, `scoreboards/players` | 3 KB / 4 KB | `{rank, hero_id|account_id, value, matches}` |

### Jugadores, partidas, builds, leaderboard, parches
| Endpoint | Tamaño | Notas |
|---|---|---|
| `players/{id}/match-history` | **5,6 MB** | array[7783] (2024-09 → 2026-11). `hero_id, start_time, player_kills/deaths/assists, net_worth, last_hits, match_duration_s, match_result, player_team, ranked_display_badge, ranked_delta`. **Solo 645 partidas llevan `ranked_display_badge`** |
| `players/{id}/mate-stats`, `enemy-stats` | **1,1 MB / 1,3 MB** | array[7731] / array[8639] con `matches[]` (ids de partida) |
| `players/{id}/rank` | 0,5 KB | `{badge, rank, subrank, last_match{…}}` |
| `players/hero-stats` | 144 KB | array[44] con `matches_played, wins, kills…, *_per_min` |
| `players/steam`, `steam-search` | 0,6 KB / 82 KB | `{account_id, personaname, profileurl, avatarfull, …}`; `steam-search` devuelve 23 resultados |
| `players/{id}/region` | 62 KB | `{region:"dpkt-frankfurt", history[517]}` |
| `matches/{id}/metadata` | **2,6 MB** | `match_info{duration_s, winning_team, players[12], objectives[21], mid_boss, damage_matrix, match_paths…}`. Cada jugador: `kills…, net_worth, items[{item_id, game_time_s, sold_time_s}], stats[{time_stamp_s, net_worth…}] (serie temporal), death_details[{death_pos, killer_pos…}], accolades[]` |
| `matches/metadata` | 333 KB | array[1000] resumen (`start_time` como **texto**, no número) |
| `matches/active` | 348 KB | array[150] `{match_id, players[{account_id, hero_id, team}], spectators, match_mode_parsed, net_worth_team_0…}` |
| `matches/live/urls` | 5 KB | array[33] `{match_id, broadcast_url}` |
| `matches/{id}/live/url` | 0,1 KB | **500 real**: `{status:500, error}` |
| `builds` | **1,2 MB** | array[100] `{hero_build{hero_id, hero_build_id, name, description, author_account_id, tags, details}, num_favorites}`; 16 héroes distintos |
| `builds/2/1007` | 12 KB | detalle completo con `mod_categories` |
| `builds/by-author/464664477` | 2 B | `[]` (estado vacío) |
| `leaderboard/Europe` | **1,0 MB** | `{entries[1000]{account_name, possible_account_ids[], rank, top_hero_ids[]}}` |
| `leaderboard/Europe/1` | 9 KB | `{entries[36]}` |
| `v2/patches` | 82 KB | array[30] `{source: steam\|forum, title, pub_date, link, content (HTML)}` |
| `v1/patches/big-days` | 0,5 KB | array[18] de fechas ISO |
| `info/health` | 0,1 KB | `{services{clickhouse, postgres, redis}}` |
| `crosshair/code/settings` | 0,4 KB | 20 campos (pip, dot, colores…); imagen PNG de 518 B |

## 3. Imágenes

Dominios que aparecen en los datos (para `next/image` en la fase 9):

| Dominio | Uso |
|---|---|
| `assets-bucket.deadlock-api.com` | Retratos, iconos de habilidades/objetos, rangos, minimapa (≈12.700 URLs) |
| `avatars.steamstatic.com` | Avatares de Steam |
| `dist1-ord1.steamcontent.com` | Retransmisiones (`broadcast_url`, no es imagen) |
| `api.deadlock-api.com` | Referencias internas de la API |
| `forums.playdeadlock.com`, `store.steampowered.com`, `steamcommunity.com`, `www.twitch.tv` | Solo enlaces/HTML de parches |

Imágenes **reales disponibles localmente** (las únicas que se muestran en mock): rango 3/3 (`.webp`), insignia del jugador `483770846` (`.png`) y las dos de crosshair.

## 4. Qué falta respecto a la spec

Ver `NOTES.md` (sección "Funcionalidades afectadas") para las alternativas propuestas. Resumen:

- **Lore**: existe en 48 de 65 héroes (`description.lore`), pero solo en inglés.
- **Vídeo de habilidades**: ningún campo de vídeo en los items.
- **Tendencia por parche / win rate por rango**: todos los analytics traen un único `bucket: 0`. No hay serie temporal ni desglose por rango.
- **Win rate por minuto de compra**: `item-stats` solo da el tiempo medio de compra.
- **Héroes que más usan un objeto**: `upgrade.heroes` está siempre vacío, y no hay endpoint de héroe×objeto en los fixtures.
- **Evolución del rango**: solo 645 de 7783 partidas llevan `ranked_display_badge`.
- **Nombres en compañeros/rivales**: solo vienen ids; hay que resolverlos con `/v1/players/steam`, y el fixture solo contiene la cuenta 483770846.
- **Leaderboard**: no hay un `account_id` único por fila, sino `possible_account_ids[]` (hasta 5 candidatos).
- **Leaderboard por héroe**: solo hay fixture para Europa/héroe 1; otras regiones devuelven Europa.
- **Mapa**: no hay posiciones de carriles como tal; sí `objective_positions`, `neutral_camps`, `zipline_paths` y `entities`. Las posiciones de muerte de una partida sí vienen en `death_details`.
- **Partidas en directo**: `matches/active` trae 150 (no 200) y no incluye rango medio por partida.
- **Idioma**: todo en inglés.
