import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';

import type { AppContext } from '../context.js';
import { shapeRosters } from '../sleeper/shape.js';
import { leagueIdField, resolveLeagueId, runTool } from './helpers.js';

export function registerRostersTool(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_rosters',
    {
      description:
        'Get rosters for a configured league, with owner names and player names/positions/teams resolved. Locked to this client\'s configured leagues.',
      inputSchema: z.object({
        league_id: leagueIdField(ctx.config.leagueIds),
      }),
    },
    async ({ league_id }) =>
      runTool(async () => {
        const leagueId = resolveLeagueId(ctx.config, league_id);
        const [rosters, users] = await Promise.all([
          ctx.client.getRosters(leagueId),
          ctx.client.getLeagueUsers(leagueId),
        ]);
        await ctx.players.ensureLoaded();
        return shapeRosters(rosters, users, (id) => ctx.players.resolve(id));
      }),
  );
}
