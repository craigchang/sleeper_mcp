import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { loadConfig } from './config.js';
import type { AppContext } from './context.js';
import { validateIdentity } from './identity.js';
import { SleeperClient } from './sleeper/client.js';
import { PlayerCache } from './sleeper/players.js';
import { registerDraftPicksTool, registerDraftTool } from './tools/drafts.js';
import { registerLeaguesTool } from './tools/leagues.js';
import { registerMatchupsTool } from './tools/matchups.js';
import { registerNflStateTool } from './tools/nfl-state.js';
import { registerRostersTool } from './tools/rosters.js';
import { registerUserTool } from './tools/user.js';

export function createServer(ctx: AppContext): McpServer {
  const server = new McpServer({ name: 'sleeper', version: '1.0.0' });
  registerUserTool(server, ctx);
  registerLeaguesTool(server, ctx);
  registerRostersTool(server, ctx);
  registerMatchupsTool(server, ctx);
  registerDraftTool(server, ctx);
  registerDraftPicksTool(server, ctx);
  registerNflStateTool(server, ctx);
  return server;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new SleeperClient();
  await validateIdentity(config, client);
  const players = new PlayerCache(client);

  void serveStdio(() => createServer({ config, client, players }));
  console.error('sleeper MCP server running on stdio');
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  process.exit(1);
});
