import { SleeperApiError } from './errors.js';
import type {
  SleeperDraft,
  SleeperDraftPick,
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperNflState,
  SleeperPlayerRaw,
  SleeperRoster,
  SleeperUser,
} from './types.js';

const BASE_URL = 'https://api.sleeper.app/v1';
const USER_AGENT = 'sleeper-mcp/1.0';
const MAX_REQUESTS_PER_MINUTE = 100;

export class RateLimiter {
  private timestamps: number[] = [];

  constructor(private readonly maxPerMinute: number = MAX_REQUESTS_PER_MINUTE) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
    if (this.timestamps.length >= this.maxPerMinute) {
      const oldest = this.timestamps[0] ?? now;
      const waitMs = 60_000 - (now - oldest) + 10;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.acquire();
    }
    this.timestamps.push(Date.now());
  }
}

export class SleeperClient {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly limiter: RateLimiter = new RateLimiter(),
  ) {}

  async getUser(userId: string): Promise<SleeperUser> {
    return this.get<SleeperUser>(`/user/${encodeURIComponent(userId)}`);
  }

  async getUserLeagues(userId: string, season: string): Promise<SleeperLeague[]> {
    return this.get<SleeperLeague[]>(
      `/user/${encodeURIComponent(userId)}/leagues/nfl/${encodeURIComponent(season)}`,
    );
  }

  async getLeague(leagueId: string): Promise<SleeperLeague> {
    return this.get<SleeperLeague>(`/league/${encodeURIComponent(leagueId)}`);
  }

  async getRosters(leagueId: string): Promise<SleeperRoster[]> {
    return this.get<SleeperRoster[]>(`/league/${encodeURIComponent(leagueId)}/rosters`);
  }

  async getLeagueUsers(leagueId: string): Promise<SleeperLeagueUser[]> {
    return this.get<SleeperLeagueUser[]>(`/league/${encodeURIComponent(leagueId)}/users`);
  }

  async getMatchups(leagueId: string, week: number): Promise<SleeperMatchup[]> {
    return this.get<SleeperMatchup[]>(
      `/league/${encodeURIComponent(leagueId)}/matchups/${encodeURIComponent(String(week))}`,
    );
  }

  async getNflState(): Promise<SleeperNflState> {
    return this.get<SleeperNflState>('/state/nfl');
  }

  async getDraft(draftId: string): Promise<SleeperDraft> {
    return this.get<SleeperDraft>(`/draft/${encodeURIComponent(draftId)}`);
  }

  async getDraftPicks(draftId: string): Promise<SleeperDraftPick[]> {
    return this.get<SleeperDraftPick[]>(`/draft/${encodeURIComponent(draftId)}/picks`);
  }

  async getPlayers(): Promise<Record<string, SleeperPlayerRaw>> {
    return this.get<Record<string, SleeperPlayerRaw>>('/players/nfl');
  }

  private async get<T>(path: string): Promise<T> {
    await this.limiter.acquire();
    const res = await this.fetchImpl(`${BASE_URL}${path}`, {
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
    });

    if (res.status === 429) {
      throw new SleeperApiError('Sleeper rate limit (429). Wait a moment and retry.', 429);
    }
    if (res.status === 404) {
      throw new SleeperApiError(`Sleeper resource not found: ${path}`, 404);
    }
    if (!res.ok) {
      throw new SleeperApiError(`Sleeper API error: HTTP ${res.status} for ${path}`, res.status);
    }

    const data: unknown = await res.json();
    if (data === null) {
      throw new SleeperApiError(`Sleeper resource not found: ${path}`, 404);
    }
    return data as T;
  }
}
