import { readFileSync } from 'node:fs';

import { config as loadDotenv } from 'dotenv';

import { ENV_PATH, MCP_JSON_PATH } from './paths.js';

export type Identity = {
  userId: string;
  leagueIds: string[];
  season?: string;
};

const SLEEPER_ID = /^\d+$/;
const SEASON = /^\d{4}$/;

export const IDENTITY_ENV_KEYS = ['SLEEPER_USER_ID', 'SLEEPER_LEAGUE_IDS', 'SLEEPER_SEASON'] as const;

export type IdentityEnvKey = (typeof IDENTITY_ENV_KEYS)[number];

function envString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Pull identity env from a Cursor mcp.json document. League IDs stay a comma-separated string. */
export function identityEnvFromMcpConfig(config: unknown): Partial<Record<IdentityEnvKey, string>> {
  if (!config || typeof config !== 'object') {
    return {};
  }
  const servers = (config as { mcpServers?: unknown }).mcpServers;
  if (!servers || typeof servers !== 'object') {
    return {};
  }
  const sleeper = (servers as { sleeper?: unknown }).sleeper;
  if (!sleeper || typeof sleeper !== 'object') {
    return {};
  }
  const env = (sleeper as { env?: unknown }).env;
  if (!env || typeof env !== 'object') {
    return {};
  }
  const source = env as Record<string, unknown>;
  const picked: Partial<Record<IdentityEnvKey, string>> = {};
  for (const key of IDENTITY_ENV_KEYS) {
    const value = envString(source[key]);
    if (value) {
      picked[key] = value;
    }
  }
  return picked;
}

/** Fill blank identity vars. Values already set on `target` win. */
export function applyIdentityEnv(
  target: NodeJS.ProcessEnv,
  source: Partial<Record<IdentityEnvKey, string>>,
): void {
  for (const key of IDENTITY_ENV_KEYS) {
    const value = source[key];
    if (value && !envString(target[key])) {
      target[key] = value;
    }
  }
}

function loadMcpIdentityEnv(): Partial<Record<IdentityEnvKey, string>> {
  let raw: string;
  try {
    raw = readFileSync(MCP_JSON_PATH, 'utf8');
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      return {};
    }
    throw err;
  }
  try {
    return identityEnvFromMcpConfig(JSON.parse(raw) as unknown);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid .cursor/mcp.json: ${message}`);
  }
}

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
    throw new Error(
      'SLEEPER_USER_ID is required. Set it in .cursor/mcp.json env or in .env.',
    );
  }
  assertSleeperId(userId, 'SLEEPER_USER_ID');
  if (leagueIds.length === 0) {
    throw new Error(
      'SLEEPER_LEAGUE_IDS is required. Set a comma-separated allowlist in .cursor/mcp.json env or in .env.',
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
  applyIdentityEnv(process.env, loadMcpIdentityEnv());
  loadDotenv({ path: ENV_PATH });
  return parseConfig(process.env);
}
