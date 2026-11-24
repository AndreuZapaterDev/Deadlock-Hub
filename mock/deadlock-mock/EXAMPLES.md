# Ejemplos por endpoint

Una consulta de ejemplo por cada endpoint de deadlock-api, con su respuesta guardada en `fixtures/`.
**real** = respuesta real de la API (capturada el 24/11/2026). **sintético** = generado del esquema OpenAPI (endpoints POST/PUT/DELETE o que piden cuenta de patrocinador; no se llamaron para no provocar efectos).


## analytics

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/analytics/ability-max-first-stats` | `/v1/analytics/ability-max-first-stats?hero_id=1` | 200 | real | `v1__analytics__ability-max-first-stats__3bfe4692.json` |
| GET | `/v1/analytics/ability-order-stats` | `/v1/analytics/ability-order-stats?hero_id=1&min_matches=500` | 200 | real | `v1__analytics__ability-order-stats__800a69f2.json` |
| GET | `/v1/analytics/ability-order-tree` | `/v1/analytics/ability-order-tree?hero_id=1&min_matches=500` | 200 | real | `v1__analytics__ability-order-tree__5dcba03f.json` |
| GET | `/v1/analytics/badge-distribution` | `/v1/analytics/badge-distribution` | 200 | real | `v1__analytics__badge-distribution.json` |
| GET | `/v1/analytics/buff-stats` | `/v1/analytics/buff-stats` | 200 | real | `v1__analytics__buff-stats.json` |
| GET | `/v1/analytics/build-item-stats` | `/v1/analytics/build-item-stats` | 200 | real | `v1__analytics__build-item-stats.json` |
| GET | `/v1/analytics/game-stats` | `/v1/analytics/game-stats` | 200 | real | `v1__analytics__game-stats.json` |
| GET | `/v1/analytics/hero-ban-stats` | `/v1/analytics/hero-ban-stats` | 200 | real | `v1__analytics__hero-ban-stats.json` |
| GET | `/v1/analytics/hero-build-stats` | `/v1/analytics/hero-build-stats` | 200 | real | `v1__analytics__hero-build-stats.json` |
| GET | `/v1/analytics/hero-build-stats/{hero_id}` | `/v1/analytics/hero-build-stats/1` | 200 | real | `v1__analytics__hero-build-stats__1.json` |
| GET | `/v1/analytics/hero-comb-stats` | `/v1/analytics/hero-comb-stats?comb_size=2&include_hero_ids=1` | 200 | real | `v1__analytics__hero-comb-stats__0782b9ec.json` |
| GET | `/v1/analytics/hero-counter-stats` | `/v1/analytics/hero-counter-stats` | 200 | real | `v1__analytics__hero-counter-stats.json` |
| GET | `/v1/analytics/hero-stats` | `/v1/analytics/hero-stats` | 200 | real | `v1__analytics__hero-stats.json` |
| GET | `/v1/analytics/hero-swap-stats` | `/v1/analytics/hero-swap-stats` | 200 | real | `v1__analytics__hero-swap-stats.json` |
| GET | `/v1/analytics/hero-synergy-stats` | `/v1/analytics/hero-synergy-stats` | 200 | real | `v1__analytics__hero-synergy-stats.json` |
| GET | `/v1/analytics/item-flow-stats` | `/v1/analytics/item-flow-stats?hero_ids=1&min_matches=500` | 200 | real | `v1__analytics__item-flow-stats__0e712524.json` |
| GET | `/v1/analytics/item-permutation-stats` | `/v1/analytics/item-permutation-stats` | 200 | real | `v1__analytics__item-permutation-stats.json` |
| GET | `/v1/analytics/item-stats` | `/v1/analytics/item-stats` | 200 | real | `v1__analytics__item-stats.json` |
| GET | `/v1/analytics/kill-death-stats` | `/v1/analytics/kill-death-stats` | 200 | real | `v1__analytics__kill-death-stats.json` |
| GET | `/v1/analytics/lane-matchup-stats` | `/v1/analytics/lane-matchup-stats?enemy_hero_ids=2&hero_ids=1` | 200 | real | `v1__analytics__lane-matchup-stats__327be9b5.json` |
| GET | `/v1/analytics/lane-soul-curve` | `/v1/analytics/lane-soul-curve?enemy_hero_ids=2&hero_ids=1` | 200 | real | `v1__analytics__lane-soul-curve__4d4b460f.json` |
| GET | `/v1/analytics/player-performance-curve` | `/v1/analytics/player-performance-curve` | 200 | real | `v1__analytics__player-performance-curve.json` |
| GET | `/v1/analytics/player-stats/metrics` | `/v1/analytics/player-stats/metrics` | 200 | real | `v1__analytics__player-stats__metrics.json` |
| GET | `/v1/analytics/scoreboards/heroes` | `/v1/analytics/scoreboards/heroes?sort_by=max_deaths_per_match` | 200 | real | `v1__analytics__scoreboards__heroes__b301a7b3.json` |
| GET | `/v1/analytics/scoreboards/players` | `/v1/analytics/scoreboards/players?limit=50&min_matches=50&sort_by=matches` | 200 | real | `v1__analytics__scoreboards__players__ed89ff1c.json` |

## assets

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/assets/accolades` | `/v1/assets/accolades` | 200 | real | `v1__assets__accolades.json` |
| GET | `/v1/assets/accolades/by-name/{name}` | `/v1/assets/accolades/by-name/first_blood` | 200 | real | `v1__assets__accolades__by-name__first_blood.json` |
| GET | `/v1/assets/accolades/{accolade_id}` | `/v1/assets/accolades/15` | 200 | real | `v1__assets__accolades__15.json` |
| GET | `/v1/assets/build-tags` | `/v1/assets/build-tags` | 200 | real | `v1__assets__build-tags.json` |
| GET | `/v1/assets/build-tags/by-name/{name}` | `/v1/assets/build-tags/by-name/citadel_build_tag_melee` | 200 | real | `v1__assets__build-tags__by-name__citadel_build_tag_melee.json` |
| GET | `/v1/assets/build-tags/{build_tag_id}` | `/v1/assets/build-tags/3401565923` | 200 | real | `v1__assets__build-tags__3401565923.json` |
| GET | `/v1/assets/client-versions` | `/v1/assets/client-versions` | 200 | real | `v1__assets__client-versions.json` |
| GET | `/v1/assets/colors` | `/v1/assets/colors` | 200 | real | `v1__assets__colors.json` |
| GET | `/v1/assets/convars` | `/v1/assets/convars` | 200 | real | `v1__assets__convars.json` |
| GET | `/v1/assets/convars/{name}` | `/v1/assets/convars/ai_auto_contact_solver` | 200 | real | `v1__assets__convars__ai_auto_contact_solver.json` |
| GET | `/v1/assets/fonts` | `/v1/assets/fonts` | 200 | real | `v1__assets__fonts.json` |
| GET | `/v1/assets/generic-data` | `/v1/assets/generic-data` | 200 | real | `v1__assets__generic-data.json` |
| GET | `/v1/assets/heroes` | `/v1/assets/heroes` | 200 | real | `v1__assets__heroes.json` |
| GET | `/v1/assets/heroes/by-name/{name}` | `/v1/assets/heroes/by-name/Opera` | 200 | real | `v1__assets__heroes__by-name__Opera.json` |
| GET | `/v1/assets/heroes/{hero_id}` | `/v1/assets/heroes/82` | 200 | real | `v1__assets__heroes__82.json` |
| GET | `/v1/assets/icons` | `/v1/assets/icons` | 200 | real | `v1__assets__icons.json` |
| GET | `/v1/assets/images` | `/v1/assets/images` | 200 | real | `v1__assets__images.json` |
| GET | `/v1/assets/items` | `/v1/assets/items` | 200 | real | `v1__assets__items.json` |
| GET | `/v1/assets/items/by-hero-id/{id}` | `/v1/assets/items/by-hero-id/83` | 200 | real | `v1__assets__items__by-hero-id__83.json` |
| GET | `/v1/assets/items/by-slot-type/{slot_type}` | `/v1/assets/items/by-slot-type/weapon` | 200 | real | `v1__assets__items__by-slot-type__weapon.json` |
| GET | `/v1/assets/items/by-type/{type}` | `/v1/assets/items/by-type/weapon` | 200 | real | `v1__assets__items__by-type__weapon.json` |
| GET | `/v1/assets/items/{id_or_class_name}` | `/v1/assets/items/28521455` | 200 | real | `v1__assets__items__28521455.json` |
| GET | `/v1/assets/map` | `/v1/assets/map` | 200 | real | `v1__assets__map.json` |
| GET | `/v1/assets/misc-entities` | `/v1/assets/misc-entities` | 200 | real | `v1__assets__misc-entities.json` |
| GET | `/v1/assets/misc-entities/{id_or_classname}` | `/v1/assets/misc-entities/341297418` | 200 | real | `v1__assets__misc-entities__341297418.json` |
| GET | `/v1/assets/models` | `/v1/assets/models` | 200 | real | `v1__assets__models.json` |
| GET | `/v1/assets/modifiers` | `/v1/assets/modifiers` | 200 | real | `v1__assets__modifiers.json` |
| GET | `/v1/assets/modifiers/{id_or_classname}` | `/v1/assets/modifiers/333314679` | 200 | real | `v1__assets__modifiers__333314679.json` |
| GET | `/v1/assets/npc-units` | `/v1/assets/npc-units` | 200 | real | `v1__assets__npc-units.json` |
| GET | `/v1/assets/npc-units/{id_or_classname}` | `/v1/assets/npc-units/1106346047` | 200 | real | `v1__assets__npc-units__1106346047.json` |
| GET | `/v1/assets/ranked-seasons` | `/v1/assets/ranked-seasons` | 200 | real | `v1__assets__ranked-seasons.json` |
| GET | `/v1/assets/ranks` | `/v1/assets/ranks` | 200 | real | `v1__assets__ranks.json` |
| GET | `/v1/assets/ranks/{tier}` | `/v1/assets/ranks/0` | 200 | real | `v1__assets__ranks__0.json` |
| GET | `/v1/assets/ranks/{tier}/{subrank}/image` | `/v1/assets/ranks/3/3/image?format=webp` | 200 | real | `v1__assets__ranks__3__3__image__eaaf6709.webp` |
| GET | `/v1/assets/sounds` | `/v1/assets/sounds` | 200 | real | `v1__assets__sounds.json` |
| GET | `/v1/assets/steam-info` | `/v1/assets/steam-info` | 200 | real | `v1__assets__steam-info.json` |
| GET | `/v1/assets/steam-info/all` | `/v1/assets/steam-info/all` | 200 | real | `v1__assets__steam-info__all.json` |

## builds

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/builds` | `/v1/builds` | 200 | real | `v1__builds.json` |
| GET | `/v1/builds/by-author/{account_id}` | `/v1/builds/by-author/464664477` | 200 | real | `v1__builds__by-author__464664477.json` |
| GET | `/v1/builds/{hero_id}/{build_id}` | `/v1/builds/by-author/464664477` | 200 | real | `v1__builds__by-author__464664477.json` |

## commands

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/commands/resolve` | `/v1/commands/resolve?account_id=483770846&region=Europe&template={steam_account_name}:+…` | 200 | real | `v1__commands__resolve__ac725c67.bin` |
| GET | `/v1/commands/variables/available` | `/v1/commands/variables/available` | 200 | real | `v1__commands__variables__available.json` |
| GET | `/v1/commands/variables/resolve` | `/v1/commands/variables/resolve?account_id=483770846&region=Europe&variables=leaderboard…` | 200 | real | `v1__commands__variables__resolve__53cd602b.json` |
| GET | `/v1/commands/widgets/versions` | `/v1/commands/widgets/versions` | 200 | real | `v1__commands__widgets__versions.json` |

## crosshair

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/crosshair/code/image` | `/v1/crosshair/code/image?code=DL.AQDAdYkfAQK4NAKGAgIOAQWik5vGAgIFZmFsc2UCDgEFxvj3.gYCBW…` | 200 | real | `v1__crosshair__code__image__493b49bd.png` |
| GET | `/v1/crosshair/code/settings` | `/v1/crosshair/code/settings?code=DL.AQDAdYkfAQK4NAKGAgIOAQWik5vGAgIFZmFsc2UCDgEFxvj3.gY…` | 200 | real | `v1__crosshair__code__settings__f434bf48.json` |
| GET | `/v1/crosshair/settings/code` | `/v1/crosshair/settings/code` | 200 | real | `v1__crosshair__settings__code.json` |
| GET | `/v1/crosshair/settings/image` | `/v1/crosshair/settings/image` | 200 | real | `v1__crosshair__settings__image.png` |

## feedback

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| POST | `/v1/feedback` | `/v1/feedback` | 201 | sintético | `synthetic/POST_v1__feedback.json` |

## graphql

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/graphql` | `/v1/graphql` | 200 | real | `v1__graphql.bin` |

## info

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/info` | `/v1/info` | 200 | real | `v1__info.json` |
| GET | `/v1/info/health` | `/v1/info/health` | 200 | real | `v1__info__health.json` |
| GET | `/v1/info/live-requests` | `/v1/info/live-requests` | 200 | real | `v1__info__live-requests.txt` |

## leaderboard

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/leaderboard/{region}` | `/v1/leaderboard/Europe` | 200 | real | `v1__leaderboard__Europe.json` |
| GET | `/v1/leaderboard/{region}/raw` | `/v1/leaderboard/Europe/raw` | 200 | real | `v1__leaderboard__Europe__raw.bin` |
| GET | `/v1/leaderboard/{region}/{hero_id}` | `/v1/leaderboard/Europe/raw` | 200 | real | `v1__leaderboard__Europe__raw.bin` |
| GET | `/v1/leaderboard/{region}/{hero_id}/raw` | `/v1/leaderboard/Europe/1/raw` | 200 | real | `v1__leaderboard__Europe__1__raw.bin` |

## matches

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/matches/active` | `/v1/matches/active` | 200 | real | `v1__matches__active.json` |
| GET | `/v1/matches/active/raw` | `/v1/matches/active/raw` | 200 | real | `v1__matches__active__raw.bin` |
| POST | `/v1/matches/custom/create` | `/v1/matches/custom/create` | 200 | sintético | `synthetic/POST_v1__matches__custom__create.json` |
| POST | `/v1/matches/custom/{lobby_id}/leave` | `/v1/matches/custom/{lobby_id}/leave` | 200 | sintético | `synthetic/POST_v1__matches__custom__lobby_id__leave.json` |
| POST | `/v1/matches/custom/{lobby_id}/ready` | `/v1/matches/custom/{lobby_id}/ready` | 200 | sintético | `synthetic/POST_v1__matches__custom__lobby_id__ready.json` |
| POST | `/v1/matches/custom/{lobby_id}/start` | `/v1/matches/custom/{lobby_id}/start` | 200 | sintético | `synthetic/POST_v1__matches__custom__lobby_id__start.json` |
| POST | `/v1/matches/custom/{lobby_id}/unready` | `/v1/matches/custom/{lobby_id}/unready` | 200 | sintético | `synthetic/POST_v1__matches__custom__lobby_id__unready.json` |
| GET | `/v1/matches/custom/{party_id}/match-id` | `/v1/matches/custom/1/match-id` | 404 | real | `v1__matches__custom__1__match-id.json` |
| GET | `/v1/matches/demo/live/query` | — | — | sin datos | — |
| POST | `/v1/matches/demo/query` | `/v1/matches/demo/query` | 200 | sintético | `synthetic/POST_v1__matches__demo__query.json` |
| GET | `/v1/matches/demo/query/{job_id}` | `/v1/matches/demo/query/00000000-0000-0000-0000-000000000000` | 404 | real | `v1__matches__demo__query__00000000-0000-0000-0000-000000000000.json` |
| GET | `/v1/matches/demo/schema` | `/v1/matches/demo/schema` | 200 | real | `v1__matches__demo__schema.json` |
| GET | `/v1/matches/live/urls` | `/v1/matches/live/urls` | 200 | real | `v1__matches__live__urls.json` |
| POST | `/v1/matches/live/urls` | `/v1/matches/live/urls` | 200 | sintético | `synthetic/POST_v1__matches__live__urls.json` |
| GET | `/v1/matches/metadata` | `/v1/matches/metadata` | 200 | real | `v1__matches__metadata.json` |
| GET | `/v1/matches/recently-fetched` | `/v1/matches/recently-fetched` | 200 | real | `v1__matches__recently-fetched.json` |
| POST | `/v1/matches/salts` | `/v1/matches/salts` | 200 | sintético | `synthetic/POST_v1__matches__salts.json` |
| GET | `/v1/matches/{match_id}/live/url` | `/v1/matches/142921246/live/url` | 500 | real | `v1__matches__142921246__live__url.json` |
| GET | `/v1/matches/{match_id}/metadata` | `/v1/matches/142529961/metadata` | 200 | real | `v1__matches__142529961__metadata.json` |
| GET | `/v1/matches/{match_id}/metadata/raw` | `/v1/matches/142543093/metadata/raw` | 200 | real | `v1__matches__142543093__metadata__raw.bin` |
| GET | `/v1/matches/{match_id}/salts` | `/v1/matches/142543093/salts` | 200 | real | `v1__matches__142543093__salts.json` |

## patches

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/patches` | `/v1/patches` | 200 | real | `v1__patches.json` |
| GET | `/v1/patches/big-days` | `/v1/patches/big-days` | 200 | real | `v1__patches__big-days.json` |

## patron

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/patron/steam-accounts` | `/v1/patron/steam-accounts` | 200 | sintético | `synthetic/GET_v1__patron__steam-accounts.json` |
| POST | `/v1/patron/steam-accounts` | `/v1/patron/steam-accounts` | 201 | sintético | `synthetic/POST_v1__patron__steam-accounts.json` |
| PUT | `/v1/patron/steam-accounts/{account_id}` | `/v1/patron/steam-accounts/{account_id}` | 200 | sintético | `synthetic/PUT_v1__patron__steam-accounts__account_id.json` |
| DELETE | `/v1/patron/steam-accounts/{account_id}` | `/v1/patron/steam-accounts/{account_id}` | 200 | sintético | `synthetic/DELETE_v1__patron__steam-accounts__account_id.json` |
| GET | `/v1/patron/steam-accounts/{account_id}/bot-friend` | `/v1/patron/steam-accounts/{account_id}/bot-friend` | 200 | sintético | `synthetic/GET_v1__patron__steam-accounts__account_id__bot-friend.json` |
| POST | `/v1/patron/steam-accounts/{account_id}/reactivate` | `/v1/patron/steam-accounts/{account_id}/reactivate` | 200 | sintético | `synthetic/POST_v1__patron__steam-accounts__account_id__reactivate.json` |

## players

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/players/hero-stats` | `/v1/players/hero-stats?account_ids=483770846` | 200 | real | `v1__players__hero-stats__cb16e43d.json` |
| GET | `/v1/players/rank` | `/v1/players/rank?account_ids=483770846` | 200 | real | `v1__players__rank__4b86832e.json` |
| GET | `/v1/players/rank/distribution` | `/v1/players/rank/distribution` | 200 | real | `v1__players__rank__distribution.json` |
| GET | `/v1/players/rank/image` | `/v1/players/rank/image?account_ids=483770846` | 200 | real | `v1__players__rank__image__c22e3882.png` |
| GET | `/v1/players/region` | `/v1/players/region?account_ids=483770846` | 200 | real | `v1__players__region__4458d179.json` |
| GET | `/v1/players/steam` | `/v1/players/steam?account_ids=483770846` | 200 | real | `v1__players__steam__ac808122.json` |
| GET | `/v1/players/steam-search` | `/v1/players/steam-search?search_query=cosmetical` | 200 | real | `v1__players__steam-search__dcf691fb.json` |
| GET | `/v1/players/{account_id}/enemy-stats` | `/v1/players/483770846/enemy-stats` | 200 | real | `v1__players__483770846__enemy-stats.json` |
| GET | `/v1/players/{account_id}/ingest-status` | `/v1/players/483770846/ingest-status` | 200 | real | `v1__players__483770846__ingest-status.json` |
| GET | `/v1/players/{account_id}/match-history` | `/v1/players/483770846/match-history` | 200 | real | `v1__players__483770846__match-history.json` |
| GET | `/v1/players/{account_id}/mate-stats` | `/v1/players/483770846/mate-stats` | 200 | real | `v1__players__483770846__mate-stats.json` |
| GET | `/v1/players/{account_id}/rank` | `/v1/players/483770846/rank` | 200 | real | `v1__players__483770846__rank.json` |
| GET | `/v1/players/{account_id}/rank/image` | `/v1/players/483770846/rank/image` | 200 | real | `v1__players__483770846__rank__image.png` |
| GET | `/v1/players/{account_id}/region` | `/v1/players/483770846/region` | 200 | real | `v1__players__483770846__region.json` |

## sql

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v1/sql` | `/v1/sql?query=SELECT+*+FROM+match_salts+LIMIT+10` | 200 | real | `v1__sql__ec6b19e2.json` |
| GET | `/v1/sql/tables` | `/v1/sql/tables` | 200 | real | `v1__sql__tables.json` |
| GET | `/v1/sql/tables/{table}/schema` | `/v1/sql/tables/hero_leaderboard/schema` | 200 | real | `v1__sql__tables__hero_leaderboard__schema.json` |

## patches

| Método | Endpoint | Ejemplo | Estado | Tipo | Fichero |
|---|---|---|---|---|---|
| GET | `/v2/patches` | `/v2/patches` | 200 | real | `v2__patches.json` |
