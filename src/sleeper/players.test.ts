import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  fallbackPlayer,
  indexPlayers,
  isSameUtcDay,
  parsePlayersCache,
  playerInfoFromRaw,
  resolvePlayer,
} from './players.js';

test('playerInfoFromRaw joins first and last name', () => {
  assert.deepEqual(
    playerInfoFromRaw('4034', {
      first_name: 'Justin',
      last_name: 'Jefferson',
      position: 'WR',
      team: 'MIN',
    }),
    {
      player_id: '4034',
      name: 'Justin Jefferson',
      position: 'WR',
      team: 'MIN',
    },
  );
});

test('resolvePlayer uses the cache and falls back for team defenses', () => {
  const map = {
    '4034': {
      player_id: '4034',
      name: 'Justin Jefferson',
      position: 'WR',
      team: 'MIN',
    },
  };
  assert.equal(resolvePlayer('4034', map).name, 'Justin Jefferson');
  assert.deepEqual(resolvePlayer('DET', {}), fallbackPlayer('DET'));
  assert.equal(fallbackPlayer('DET').position, 'DEF');
});

test('indexPlayers maps every Sleeper player id', () => {
  const indexed = indexPlayers({
    '1': { first_name: 'A', last_name: 'B', fantasy_positions: ['RB'] },
  });
  assert.equal(indexed['1']?.name, 'A B');
  assert.equal(indexed['1']?.position, 'RB');
});

test('parsePlayersCache rejects invalid or dangerous cache payloads', () => {
  assert.equal(parsePlayersCache('[]'), null);
  assert.equal(parsePlayersCache('{"fetchedAt":"2026-08-30T00:00:00.000Z"}'), null);
  const parsed = parsePlayersCache(
    '{"fetchedAt":"2026-08-30T00:00:00.000Z","players":{"4034":{"player_id":"4034","name":"Justin Jefferson","position":"WR","team":"MIN"},"__proto__":{"name":"nope"}}}',
  );
  assert.equal(parsed?.players['4034']?.name, 'Justin Jefferson');
  assert.equal(Object.hasOwn(parsed?.players ?? {}, '__proto__'), false);
});

test('isSameUtcDay compares calendar days in UTC', () => {
  assert.equal(isSameUtcDay('2026-08-30T01:00:00.000Z', new Date('2026-08-30T23:00:00.000Z')), true);
  assert.equal(isSameUtcDay('2026-08-29T23:00:00.000Z', new Date('2026-08-30T01:00:00.000Z')), false);
  assert.equal(isSameUtcDay('not-a-date'), false);
});
