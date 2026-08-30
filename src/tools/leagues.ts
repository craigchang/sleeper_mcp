import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';

import type { AppContext } from '../context.js';
import { resolveSeason } from '../identity.js';
import { shapeLeagues } from '../sleeper/shape.js';
import { runTool } from './helpers.js';

export function registerLeaguesTool(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_user_leagues',
    {
      description:
        "List the configured Sleeper leagues for this client (name, league_id, status, season, roster count). Locked to the user's allowlisted leagues.",
      inputSchema: z.object({}),
    },
    async () =>
      runTool(async () => {
        const season = await resolveSeason(ctx.config, ctx.client);
        const leagues = await ctx.client.getUserLeagues(ctx.config.userId, season);
        return shapeLeagues(leagues, ctx.config.leagueIds);
      }),
  );
}
