import type { Identity } from './config.js';
import { SleeperApiError } from './sleeper/errors.js';
import type { SleeperClient } from './sleeper/client.js';

export async function resolveSeason(config: Identity, client: SleeperClient): Promise<string> {
  if (config.season) {
    return config.season;
  }
  const state = await client.getNflState();
  return state.league_season;
}

export async function validateIdentity(config: Identity, client: SleeperClient): Promise<void> {
  try {
    await client.getUser(config.userId);
  } catch (err) {
    if (err instanceof SleeperApiError && err.status === 404) {
      throw new Error(`SLEEPER_USER_ID ${config.userId} was not found on Sleeper.`);
    }
    throw err;
  }

  const season = await resolveSeason(config, client);
  const leagues = await client.getUserLeagues(config.userId, season);
  const found = new Set(leagues.map((league) => league.league_id));
  const missing = config.leagueIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Configured league IDs are not in this user's ${season} NFL leagues: ${missing.join(', ')}`,
    );
  }
}
