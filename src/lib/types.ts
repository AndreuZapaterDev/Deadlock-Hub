// Tipos mínimos de los campos que usa la web (el esquema completo está en api/schema.d.ts).
export type Category = "weapon" | "vitality" | "spirit";

export type Hero = {
  id: number;
  class_name: string;
  name: string;
  player_selectable: boolean;
  hero_type: string;
  gun_tag?: string;
  tags: string[];
  complexity: number;
  description: { lore?: string; role?: string; playstyle?: string };
  items: Record<string, string>;
  starting_stats: Record<string, { value: number }>;
};

export type ItemProperty = {
  value?: number | string;
  label?: string;
  postfix?: string;
  tooltip_section?: string;
};
export type PropertyUpgrade = { name: string; bonus: string };
export type TooltipSection = {
  section_type: string;
  section_attributes: { properties?: string[]; elevated_properties?: string[]; loc_string?: string }[];
};
export type Item = {
  type: "ability" | "upgrade" | "weapon";
  id: number;
  class_name: string;
  name: string;
  heroes: number[];
  ability_type?: string;
  activation?: string;
  item_slot_type?: Category;
  item_tier?: number;
  cost?: number;
  is_active_item?: boolean;
  shopable?: boolean;
  component_items?: string[];
  description?: { desc?: string };
  properties?: Record<string, ItemProperty>;
  tooltip_sections?: TooltipSection[];
  upgrades?: { property_upgrades?: PropertyUpgrade[] }[];
  weapon_info?: Record<string, number>;
};

export type Rank = { tier: number; name: string; color: string };
export type Season = {
  class_name: string;
  name: string;
  calibration_matches?: number;
  min_wins?: number;
  min_hero_wins?: number;
  intervals?: { start_timestamp: number; end_timestamp: number }[];
};
export type Npc = {
  class_name: string;
  id: number;
  name?: string;
  max_health?: number;
  walk_speed?: number;
  run_speed?: number;
  melee_damage?: number;
  weapon_info?: { bullet_damage?: number; damage_per_second?: number };
};

export type HeroStat = { hero_id: number; wins: number; losses: number; matches: number };
export type MatchHistoryRow = {
  game_mode?: number;
  match_mode?: number;
  ranked_display_badge?: number | null;
  ranked_delta?: number | null;
  match_id: number;
  hero_id: number;
  start_time: number;
  player_kills: number;
  player_deaths: number;
  player_assists: number;
  net_worth: number;
  match_duration_s: number;
  match_result: number;
  player_team: number;
};

// ---- Tracker ----
export type SteamProfile = {
  account_id: number;
  personaname: string;
  profileurl: string;
  avatarfull?: string;
  matches_played_last_30d?: number;
};
export type PlayerRank = { badge: number; rank: number; subrank: number; last_match?: { match_id: number; start_time: number } };
export type PlayerHeroStat = {
  hero_id: number;
  matches_played: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  networth_per_min: number;
  last_played: number;
};
/** Compañero o rival: `mate_id` / `enemy_id` unificados. */
export type Relation = { id: number; wins: number; matches: number };
export type PlayerBuild = { hero_build: { hero_id: number; hero_build_id: number; name: string }; num_favorites?: number | null };
export type SearchResult = { id: number; name: string; matches30d: number; url: string };

export type MatchPlayerStat = {
  time_stamp_s: number;
  net_worth: number;
  player_damage: number;
  boss_damage: number;
  player_healing: number;
};
export type MatchPlayer = {
  account_id: number;
  team: number;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
  net_worth: number;
  last_hits: number;
  denies: number;
  level: number;
  mvp_rank?: number | null;
  items: { game_time_s: number; item_id: number; sold_time_s: number }[];
  stats: MatchPlayerStat[];
  accolades?: { accolade_id: number; accolade_stat_value: number }[];
  death_details?: { game_time_s: number; death_pos: { x: number; y: number } }[];
};
export type MatchInfo = {
  match_id: number;
  duration_s: number;
  start_time: number;
  winning_team: number;
  game_mode?: number;
  match_mode?: number;
  average_badge_team0?: number;
  average_badge_team1?: number;
  players: MatchPlayer[];
  objectives: { team: number; destroyed_time_s: number; team_objective_id: number }[];
};
export type Accolade = { id: number; flavor_name: string };

// ---- Analytics (meta) ----
export type HeroStatRow = {
  hero_id: number;
  wins: number;
  losses: number;
  matches: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  total_net_worth: number;
};
export type BanRow = { hero_id: number; bans: number; matches: number };
export type ItemStatRow = {
  item_id: number;
  wins: number;
  losses: number;
  matches: number;
  players: number;
  avg_buy_time_s: number;
  avg_sell_time_s: number;
  sold: number;
};
export type LeaderboardEntry = { account_name: string; possible_account_ids: number[]; rank: number; top_hero_ids: number[] };
export type AbilityOrderRow = { abilities: number[]; avg_upgrade_times_s: number[]; wins: number; losses: number; matches: number; players: number };
export type MaxFirstRow = { ability_id: number; wins: number; losses: number; matches: number; players: number };
export type BuildStatRow = { hero_id: number; hero_build_id: number; wins: number; losses: number; matches: number; players: number };
export type FlowData = {
  nodes: { column: number; item_id: number; matches: number }[];
  edges: { from_column: number; from_item_id: number; to_item_id: number; matches: number }[];
};
export type CombRow = { hero_ids: number[]; wins: number; losses: number; matches: number };
export type PermRow = { item_ids: number[]; wins: number; losses: number; matches: number };
export type BuffRow = { buff_type: string; is_permanent: boolean; pickups: number; avg_first_pickup_time_s: number };
export type GameStatRow = { total_matches: number; total_players: number; avg_duration_s: number; avg_kills: number; avg_net_worth: number };
export type LaneRow = { hero_ids: number[]; enemy_hero_ids: number[]; wins: number; matches_played: number; sample_time_s: number; net_worth_diff: number };
export type BuildSummary = { hero_build: { hero_id: number; hero_build_id: number; name: string } };
