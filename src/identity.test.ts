import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateIdentity } from './identity.js';
import { SleeperApiError } from './sleeper/errors.js';
import type { SleeperLeague, SleeperNflState, SleeperUser } from './sleeper/types.js';

function fakeClient(options: {
  user?: SleeperUser | 'missing';
  season?: string;
  leagues?: SleeperLeague[];
}) {
  return {
    async getUser() {
      if (options.user === 'missing') {
        throw new SleeperApiError('not found', 404);
      }
      return options.user as SleeperUser;
    },
    async getNflState() {
      return { league_season: options.season ?? '2025' } as SleeperNflState;
    },
    async getUserLeagues() {
      return options.leagues ?? [];
    },
  };
}

test('validateIdentity rejects an unknown user', async () => {
  await assert.rejects(
    () =>
      validateIdentity(
        { userId: 'missing', leagueIds: ['L1'] },
        fakeClient({ user: 'missing' }) as never,
      ),
    /SLEEPER_USER_ID missing was not found/,
  );
});

test('validateIdentity rejects league IDs that are not on the user', async () => {
  await assert.rejects(
    () =>
      validateIdentity(
        { userId: 'u1', leagueIds: ['keep', 'drop'], season: '2025' },
        fakeClient({
          user: { user_id: 'u1', username: 'u', display_name: 'U', avatar: null },
          leagues: [
            {
              league_id: 'keep',
              name: 'Keepers',
              status: 'in_season',
              season: '2025',
              sport: 'nfl',
              total_rosters: 12,
            },
          ],
        }) as never,
      ),
    /not in this user's 2025 NFL leagues: drop/,
  );
});

test('validateIdentity accepts a user whose leagues cover the allowlist', async () => {
  await validateIdentity(
    { userId: 'u1', leagueIds: ['keep'], season: '2025' },
    fakeClient({
      user: { user_id: 'u1', username: 'u', display_name: 'U', avatar: null },
      leagues: [
        {
          league_id: 'keep',
          name: 'Keepers',
          status: 'in_season',
          season: '2025',
          sport: 'nfl',
          total_rosters: 12,
        },
      ],
    }) as never,
  );
});
