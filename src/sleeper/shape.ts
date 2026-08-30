import type {
  PlayerInfo,
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperNflState,
  SleeperRoster,
  SleeperUser,
} from './types.js';

export type OwnerSummary = {
  user_id: string | null;
  display_name: string | null;
  team_name: string | null;
};

export type ShapedRoster = {
  roster_id: number;
  owner: OwnerSummary;
  record: {
    wins: number;
    losses: number;
    ties: number;
    points_for: number;
  };
  starters: PlayerInfo[];
  players: PlayerInfo[];
};

export type ShapedMatchupTeam = {
  roster_id: number;
  owner: OwnerSummary;
  points: number;
  starters: PlayerInfo[];
  players: PlayerInfo[];
};

export type ShapedMatchup = {
  matchup_id: number;
  teams: ShapedMatchupTeam[];
};

function pointsFromParts(whole?: number, decimal?: number): number {
  return (whole ?? 0) + (decimal ?? 0) / 100;
}

export function isFilledPlayerId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.length > 0 && id !== '0';
}

function resolveFilled(
  ids: Array<string | null | undefined> | null | undefined,
  resolve: (id: string) => PlayerInfo,
): PlayerInfo[] {
  return (ids ?? []).filter(isFilledPlayerId).map(resolve);
}

export function ownerFromUsers(
  ownerId: string | null,
  users: SleeperLeagueUser[],
): OwnerSummary {
  if (!ownerId) {
    return { user_id: null, display_name: null, team_name: null };
  }
  const user = users.find((candidate) => candidate.user_id === ownerId);
  if (!user) {
    return { user_id: ownerId, display_name: null, team_name: null };
  }
  return {
    user_id: user.user_id,
    display_name: user.display_name,
    team_name: user.metadata?.team_name ?? null,
  };
}

export function shapeUser(user: SleeperUser): {
  username: string;
  user_id: string;
  display_name: string;
} {
  return {
    username: user.username,
    user_id: user.user_id,
    display_name: user.display_name,
  };
}

export function shapeLeagues(leagues: SleeperLeague[], allowedIds: string[]): {
  name: string;
  league_id: string;
  status: string;
  season: string;
  total_rosters: number;
}[] {
  const allow = new Set(allowedIds);
  return leagues
    .filter((league) => allow.has(league.league_id))
    .map((league) => ({
      name: league.name,
      league_id: league.league_id,
      status: league.status,
      season: league.season,
      total_rosters: league.total_rosters,
    }));
}

export function shapeRosters(
  rosters: SleeperRoster[],
  users: SleeperLeagueUser[],
  resolve: (id: string) => PlayerInfo,
): ShapedRoster[] {
  return rosters.map((roster) => ({
    roster_id: roster.roster_id,
    owner: ownerFromUsers(roster.owner_id, users),
    record: {
      wins: roster.settings.wins ?? 0,
      losses: roster.settings.losses ?? 0,
      ties: roster.settings.ties ?? 0,
      points_for: pointsFromParts(roster.settings.fpts, roster.settings.fpts_decimal),
    },
    starters: resolveFilled(roster.starters, resolve),
    players: resolveFilled(roster.players, resolve),
  }));
}

export function pairMatchups(
  matchups: SleeperMatchup[],
  rosters: SleeperRoster[],
  users: SleeperLeagueUser[],
  resolve: (id: string) => PlayerInfo,
): { matchups: ShapedMatchup[]; byes: ShapedMatchupTeam[] } {
  const ownerByRoster = new Map<number, OwnerSummary>();
  for (const roster of rosters) {
    ownerByRoster.set(roster.roster_id, ownerFromUsers(roster.owner_id, users));
  }

  const shapeTeam = (row: SleeperMatchup): ShapedMatchupTeam => ({
    roster_id: row.roster_id,
    owner: ownerByRoster.get(row.roster_id) ?? {
      user_id: null,
      display_name: null,
      team_name: null,
    },
    points: row.custom_points ?? row.points,
    starters: resolveFilled(row.starters, resolve),
    players: resolveFilled(row.players, resolve),
  });

  const paired = new Map<number, ShapedMatchupTeam[]>();
  const byes: ShapedMatchupTeam[] = [];

  for (const row of matchups) {
    const team = shapeTeam(row);
    if (row.matchup_id == null) {
      byes.push(team);
      continue;
    }
    const existing = paired.get(row.matchup_id) ?? [];
    existing.push(team);
    paired.set(row.matchup_id, existing);
  }

  const shaped = [...paired.entries()]
    .sort(([a], [b]) => a - b)
    .map(([matchup_id, teams]) => ({ matchup_id, teams }));

  return { matchups: shaped, byes };
}

export function shapeNflState(state: SleeperNflState): {
  week: number;
  display_week: number;
  season: string;
  season_type: string;
  league_season: string;
} {
  return {
    week: state.week,
    display_week: state.display_week,
    season: state.season,
    season_type: state.season_type,
    league_season: state.league_season,
  };
}
