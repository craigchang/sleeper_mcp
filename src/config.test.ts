import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseConfig } from './config.js';

test('parseConfig requires user id', () => {
  assert.throws(
    () => parseConfig({ SLEEPER_LEAGUE_IDS: '1' }),
    /SLEEPER_USER_ID is required/,
  );
});

test('parseConfig requires league ids', () => {
  assert.throws(
    () => parseConfig({ SLEEPER_USER_ID: '42' }),
    /SLEEPER_LEAGUE_IDS is required/,
  );
});

test('parseConfig splits and trims league ids', () => {
  const config = parseConfig({
    SLEEPER_USER_ID: ' 99 ',
    SLEEPER_LEAGUE_IDS: ' 1, 2, ,3 ',
    SLEEPER_SEASON: '2025',
  });
  assert.deepEqual(config, {
    userId: '99',
    leagueIds: ['1', '2', '3'],
    season: '2025',
  });
});

test('parseConfig treats blank season as unset', () => {
  const config = parseConfig({
    SLEEPER_USER_ID: '99',
    SLEEPER_LEAGUE_IDS: '1',
    SLEEPER_SEASON: '  ',
  });
  assert.equal(config.season, undefined);
});

test('parseConfig rejects non-numeric ids and seasons', () => {
  assert.throws(
    () => parseConfig({ SLEEPER_USER_ID: 'craig', SLEEPER_LEAGUE_IDS: '1' }),
    /SLEEPER_USER_ID must be a numeric/,
  );
  assert.throws(
    () => parseConfig({ SLEEPER_USER_ID: '1', SLEEPER_LEAGUE_IDS: '../etc' }),
    /SLEEPER_LEAGUE_IDS must be a numeric/,
  );
  assert.throws(
    () => parseConfig({ SLEEPER_USER_ID: '1', SLEEPER_LEAGUE_IDS: '2', SLEEPER_SEASON: '25' }),
    /SLEEPER_SEASON must be a 4-digit year/,
  );
});
