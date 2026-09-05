export type SleeperUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
};

export type SleeperLeague = {
  league_id: string;
  name: string;
  status: string;
  season: string;
  sport: string;
  total_rosters: number;
  draft_id?: string | null;
};

export type SleeperDraftSettings = {
  teams?: number;
  rounds?: number;
  pick_timer?: number;
  slots_qb?: number;
  slots_rb?: number;
  slots_wr?: number;
  slots_te?: number;
  slots_flex?: number;
  slots_super_flex?: number;
  slots_k?: number;
  slots_def?: number;
  slots_bn?: number;
};

export type SleeperDraft = {
  draft_id: string;
  league_id: string | null;
  type: string;
  status: string;
  sport: string;
  season: string;
  season_type: string;
  start_time?: number | null;
  settings?: SleeperDraftSettings;
  metadata?: {
    name?: string;
    scoring_type?: string;
    description?: string;
  };
  draft_order?: Record<string, number> | null;
  slot_to_roster_id?: Record<string, number> | null;
};

export type SleeperDraftPick = {
  draft_id: string;
  player_id: string | null;
  picked_by?: string | null;
  roster_id?: number | string | null;
  round: number;
  draft_slot: number;
  pick_no: number;
  is_keeper?: boolean | null;
  metadata?: {
    first_name?: string;
    last_name?: string;
    team?: string;
    position?: string;
  };
};

export type SleeperRosterSettings = {
  wins?: number;
  losses?: number;
  ties?: number;
  fpts?: number;
  fpts_decimal?: number;
  fpts_against?: number;
  fpts_against_decimal?: number;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  league_id: string;
  players: string[] | null;
  starters: string[] | null;
  reserve: string[] | null;
  settings: SleeperRosterSettings;
};

export type SleeperLeagueUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  metadata?: {
    team_name?: string;
  };
  is_owner?: boolean;
};

export type SleeperMatchup = {
  roster_id: number;
  matchup_id: number | null;
  points: number;
  custom_points: number | null;
  starters: string[] | null;
  players: string[] | null;
};

export type SleeperNflState = {
  week: number;
  season_type: string;
  season: string;
  previous_season: string;
  league_season: string;
  league_create_season: string;
  display_week: number;
  season_start_date?: string;
  leg: number;
};

export type SleeperPlayerRaw = {
  player_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string | null;
  fantasy_positions?: string[] | null;
  team?: string | null;
};

export type PlayerInfo = {
  player_id: string;
  name: string;
  position: string | null;
  team: string | null;
};

export type PlayersCacheFile = {
  fetchedAt: string;
  players: Record<string, PlayerInfo>;
};
