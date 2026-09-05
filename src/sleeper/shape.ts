import type {
  PlayerInfo,
  SleeperDraft,
  SleeperDraftPick,
  SleeperDraftSettings,
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

export type ShapedDraftSlot = {
  slot: number;
  roster_id: number | null;
  owner: OwnerSummary;
};

export type ShapedDraft = {
  draft_id: string;
  league_id: string | null;
  name: string | null;
  type: string;
  status: string;
  season: string;
  season_type: string;
  scoring_type: string | null;
  start_time: number | null;
  settings: SleeperDraftSettings;
  draft_order: ShapedDraftSlot[];
};

const DRAFT_SETTING_KEYS = [
  'teams',
  'rounds',
  'pick_timer',
  'slots_qb',
  'slots_rb',
  'slots_wr',
  'slots_te',
  'slots_flex',
  'slots_super_flex',
  'slots_k',
  'slots_def',
  'slots_bn',
] as const;

function compactDraftSettings(settings?: SleeperDraftSettings): SleeperDraftSettings {
  const compact: SleeperDraftSettings = {};
  for (const key of DRAFT_SETTING_KEYS) {
    const value = settings?.[key];
    if (typeof value === 'number') {
      compact[key] = value;
    }
  }
  return compact;
}

export function shapeDraft(draft: SleeperDraft, users: SleeperLeagueUser[]): ShapedDraft {
  const slotToRoster = draft.slot_to_roster_id ?? {};
  const draft_order = Object.entries(draft.draft_order ?? {})
    .map(([userId, slot]) => ({
      slot,
      roster_id: slotToRoster[String(slot)] ?? null,
      owner: ownerFromUsers(userId, users),
    }))
    .sort((a, b) => a.slot - b.slot);

  return {
    draft_id: draft.draft_id,
    league_id: draft.league_id,
    name: draft.metadata?.name ?? null,
    type: draft.type,
    status: draft.status,
    season: draft.season,
    season_type: draft.season_type,
    scoring_type: draft.metadata?.scoring_type ?? null,
    start_time: draft.start_time ?? null,
    settings: compactDraftSettings(draft.settings),
    draft_order,
  };
}

export type ShapedDraftPick = {
  pick_no: number;
  round: number;
  draft_slot: number;
  roster_id: number | null;
  is_keeper: boolean;
  player: PlayerInfo;
  owner: OwnerSummary;
};

function rosterIdFromPick(value: SleeperDraftPick['roster_id']): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function playerFromPick(
  pick: SleeperDraftPick,
  resolve: (id: string) => PlayerInfo,
): PlayerInfo | null {
  if (!isFilledPlayerId(pick.player_id)) {
    return null;
  }
  const resolved = resolve(pick.player_id);
  if (resolved.name !== pick.player_id) {
    return resolved;
  }
  const name = [pick.metadata?.first_name, pick.metadata?.last_name].filter(Boolean).join(' ');
  if (!name && !pick.metadata?.position && !pick.metadata?.team) {
    return resolved;
  }
  return {
    player_id: pick.player_id,
    name: name || resolved.name,
    position: pick.metadata?.position ?? resolved.position,
    team: pick.metadata?.team ?? resolved.team,
  };
}

function ownerFromPick(
  pick: SleeperDraftPick,
  users: SleeperLeagueUser[],
  ownerByRoster: Map<number, OwnerSummary>,
): OwnerSummary {
  if (pick.picked_by) {
    return ownerFromUsers(pick.picked_by, users);
  }
  const rosterId = rosterIdFromPick(pick.roster_id);
  if (rosterId != null) {
    return (
      ownerByRoster.get(rosterId) ?? {
        user_id: null,
        display_name: null,
        team_name: null,
      }
    );
  }
  return ownerFromUsers(null, users);
}

export function shapeDraftPicks(
  picks: SleeperDraftPick[],
  rosters: SleeperRoster[],
  users: SleeperLeagueUser[],
  resolve: (id: string) => PlayerInfo,
): ShapedDraftPick[] {
  const ownerByRoster = new Map<number, OwnerSummary>();
  for (const roster of rosters) {
    ownerByRoster.set(roster.roster_id, ownerFromUsers(roster.owner_id, users));
  }

  return picks
    .map((pick) => {
      const player = playerFromPick(pick, resolve);
      if (!player) {
        return null;
      }
      return {
        pick_no: pick.pick_no,
        round: pick.round,
        draft_slot: pick.draft_slot,
        roster_id: rosterIdFromPick(pick.roster_id),
        is_keeper: pick.is_keeper === true,
        player,
        owner: ownerFromPick(pick, users, ownerByRoster),
      };
    })
    .filter((pick): pick is ShapedDraftPick => pick !== null)
    .sort((a, b) => a.pick_no - b.pick_no);
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
