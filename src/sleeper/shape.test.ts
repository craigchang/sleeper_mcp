import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pairMatchups, shapeDraft, shapeDraftPicks, shapeLeagues, shapeRosters } from './shape.js';
import type {
  PlayerInfo,
  SleeperDraft,
  SleeperDraftPick,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperRoster,
} from './types.js';

const users: SleeperLeagueUser[] = [
  {
    user_id: 'u1',
    username: 'alice',
    display_name: 'Alice',
    avatar: null,
    metadata: { team_name: 'Aces' },
  },
  {
    user_id: 'u2',
    username: 'bob',
    display_name: 'Bob',
    avatar: null,
  },
];

const jefferson: PlayerInfo = {
  player_id: '4034',
  name: 'Justin Jefferson',
  position: 'WR',
  team: 'MIN',
};

const players: Record<string, PlayerInfo> = {
  '4034': jefferson,
};

function resolve(id: string): PlayerInfo {
  return players[id] ?? { player_id: id, name: id, position: null, team: null };
}

test('shapeRosters substitutes player names and owner display names', () => {
  const rosters: SleeperRoster[] = [
    {
      roster_id: 1,
      owner_id: 'u1',
      league_id: 'L',
      starters: ['4034'],
      players: ['4034', 'DET'],
      reserve: [],
      settings: { wins: 3, losses: 1, ties: 0, fpts: 412, fpts_decimal: 40 },
    },
  ];

  const shaped = shapeRosters(rosters, users, resolve);
  assert.equal(shaped[0]?.owner.display_name, 'Alice');
  assert.equal(shaped[0]?.owner.team_name, 'Aces');
  assert.equal(shaped[0]?.record.points_for, 412.4);
  assert.deepEqual(shaped[0]?.starters, [jefferson]);
  assert.equal(shaped[0]?.players[1]?.name, 'DET');
});

test('shapeRosters skips empty starter slots', () => {
  const shaped = shapeRosters(
    [
      {
        roster_id: 1,
        owner_id: 'u1',
        league_id: 'L',
        starters: ['4034', '0', ''],
        players: ['4034', '0'],
        reserve: [],
        settings: {},
      },
    ],
    users,
    resolve,
  );
  assert.deepEqual(shaped[0]?.starters, [jefferson]);
  assert.deepEqual(shaped[0]?.players, [jefferson]);
});

test('pairMatchups groups teams that share a matchup_id', () => {
  const rosters: SleeperRoster[] = [
    {
      roster_id: 1,
      owner_id: 'u1',
      league_id: 'L',
      starters: [],
      players: [],
      reserve: [],
      settings: {},
    },
    {
      roster_id: 2,
      owner_id: 'u2',
      league_id: 'L',
      starters: [],
      players: [],
      reserve: [],
      settings: {},
    },
  ];
  const rows: SleeperMatchup[] = [
    {
      roster_id: 1,
      matchup_id: 7,
      points: 110.2,
      custom_points: null,
      starters: ['4034'],
      players: ['4034'],
    },
    {
      roster_id: 2,
      matchup_id: 7,
      points: 98,
      custom_points: null,
      starters: [],
      players: [],
    },
    {
      roster_id: 3,
      matchup_id: null,
      points: 0,
      custom_points: null,
      starters: [],
      players: [],
    },
  ];

  const { matchups, byes } = pairMatchups(rows, rosters, users, resolve);
  assert.equal(matchups.length, 1);
  assert.equal(matchups[0]?.matchup_id, 7);
  assert.equal(matchups[0]?.teams.length, 2);
  assert.equal(matchups[0]?.teams[0]?.owner.display_name, 'Alice');
  assert.equal(matchups[0]?.teams[0]?.starters[0]?.name, 'Justin Jefferson');
  assert.equal(byes.length, 1);
  assert.equal(byes[0]?.roster_id, 3);
});

test('shapeDraft resolves draft-order names and sorts by slot', () => {
  const draft: SleeperDraft = {
    draft_id: 'D1',
    league_id: 'L',
    type: 'snake',
    status: 'pre_draft',
    sport: 'nfl',
    season: '2026',
    season_type: 'regular',
    start_time: 1788473700000,
    settings: { teams: 2, rounds: 17, pick_timer: 60, slots_qb: 1, slots_bn: 9 },
    metadata: { name: 'Workday Best Ball', scoring_type: 'ppr' },
    draft_order: { u2: 1, u1: 2 },
    slot_to_roster_id: { '1': 10, '2': 3 },
  };

  const shaped = shapeDraft(draft, users);
  assert.equal(shaped.name, 'Workday Best Ball');
  assert.equal(shaped.scoring_type, 'ppr');
  assert.deepEqual(shaped.settings, { teams: 2, rounds: 17, pick_timer: 60, slots_qb: 1, slots_bn: 9 });
  assert.deepEqual(shaped.draft_order, [
    { slot: 1, roster_id: 10, owner: { user_id: 'u2', display_name: 'Bob', team_name: null } },
    { slot: 2, roster_id: 3, owner: { user_id: 'u1', display_name: 'Alice', team_name: 'Aces' } },
  ]);
});

test('shapeDraft treats a missing draft_order as empty', () => {
  const shaped = shapeDraft(
    {
      draft_id: 'D1',
      league_id: 'L',
      type: 'linear',
      status: 'pre_draft',
      sport: 'nfl',
      season: '2026',
      season_type: 'regular',
    },
    users,
  );
  assert.deepEqual(shaped.draft_order, []);
  assert.equal(shaped.name, null);
  assert.deepEqual(shaped.settings, {});
});

test('shapeDraftPicks resolves player and owner names and sorts by pick_no', () => {
  const picks: SleeperDraftPick[] = [
    {
      draft_id: 'D1',
      player_id: '4034',
      picked_by: 'u1',
      roster_id: '1',
      round: 1,
      draft_slot: 2,
      pick_no: 2,
      is_keeper: null,
    },
    {
      draft_id: 'D1',
      player_id: '2391',
      picked_by: '',
      roster_id: 10,
      round: 1,
      draft_slot: 1,
      pick_no: 1,
      is_keeper: true,
      metadata: { first_name: 'David', last_name: 'Johnson', position: 'RB', team: 'ARI' },
    },
    {
      draft_id: 'D1',
      player_id: '0',
      picked_by: 'u2',
      roster_id: 2,
      round: 1,
      draft_slot: 3,
      pick_no: 3,
    },
  ];
  const rosters: SleeperRoster[] = [
    {
      roster_id: 10,
      owner_id: 'u2',
      league_id: 'L',
      starters: [],
      players: [],
      reserve: [],
      settings: {},
    },
  ];

  const shaped = shapeDraftPicks(picks, rosters, users, resolve);
  assert.deepEqual(shaped, [
    {
      pick_no: 1,
      round: 1,
      draft_slot: 1,
      roster_id: 10,
      is_keeper: true,
      player: { player_id: '2391', name: 'David Johnson', position: 'RB', team: 'ARI' },
      owner: { user_id: 'u2', display_name: 'Bob', team_name: null },
    },
    {
      pick_no: 2,
      round: 1,
      draft_slot: 2,
      roster_id: 1,
      is_keeper: false,
      player: jefferson,
      owner: { user_id: 'u1', display_name: 'Alice', team_name: 'Aces' },
    },
  ]);
});

test('shapeLeagues keeps only allowlisted leagues', () => {
  const shaped = shapeLeagues(
    [
      {
        league_id: 'keep',
        name: 'Keepers',
        status: 'in_season',
        season: '2025',
        sport: 'nfl',
        total_rosters: 12,
      },
      {
        league_id: 'drop',
        name: 'Other',
        status: 'in_season',
        season: '2025',
        sport: 'nfl',
        total_rosters: 10,
      },
    ],
    ['keep'],
  );
  assert.deepEqual(shaped, [
    {
      name: 'Keepers',
      league_id: 'keep',
      status: 'in_season',
      season: '2025',
      total_rosters: 12,
    },
  ]);
});
