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
