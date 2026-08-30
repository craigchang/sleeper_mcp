import { config as loadDotenv } from 'dotenv';

import { ENV_PATH } from './paths.js';

export type Identity = {
  userId: string;
  leagueIds: string[];
  season?: string;
};

const SLEEPER_ID = /^\d+$/;
const SEASON = /^\d{4}$/;

function assertSleeperId(value: string, label: string): void {
  if (!SLEEPER_ID.test(value)) {
    throw new Error(`${label} must be a numeric Sleeper id.`);
  }
}

export function parseConfig(env: NodeJS.ProcessEnv): Identity {
  const userId = env.SLEEPER_USER_ID?.trim();
  const leagueIds = (env.SLEEPER_LEAGUE_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const season = env.SLEEPER_SEASON?.trim() || undefined;

  if (!userId) {
    throw new Error('SLEEPER_USER_ID is required. Copy .env.example to .env and set your user id.');
  }
  assertSleeperId(userId, 'SLEEPER_USER_ID');
  if (leagueIds.length === 0) {
    throw new Error(
      'SLEEPER_LEAGUE_IDS is required. Set a comma-separated allowlist of league IDs in .env.',
    );
  }
  for (const id of leagueIds) {
    assertSleeperId(id, 'SLEEPER_LEAGUE_IDS');
  }
  if (season && !SEASON.test(season)) {
    throw new Error('SLEEPER_SEASON must be a 4-digit year when set.');
  }

  return { userId, leagueIds, season };
}

export function loadConfig(): Identity {
  loadDotenv({ path: ENV_PATH });
  return parseConfig(process.env);
}
