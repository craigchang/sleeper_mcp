import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SRC_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(SRC_DIR, '..');
export const ENV_PATH = join(REPO_ROOT, '.env');
export const MCP_JSON_PATH = join(REPO_ROOT, '.cursor', 'mcp.json');
export const CACHE_DIR = join(REPO_ROOT, '.cache');
export const PLAYERS_CACHE_PATH = join(CACHE_DIR, 'players-nfl.json');
