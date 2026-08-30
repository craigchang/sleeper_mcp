import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pairMatchups, shapeLeagues, shapeRosters } from './shape.js';
import type { PlayerInfo, SleeperLeagueUser, SleeperMatchup, SleeperRoster } from './types.js';

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
