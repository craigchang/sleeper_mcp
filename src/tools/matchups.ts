import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';

import type { AppContext } from '../context.js';
import { pairMatchups } from '../sleeper/shape.js';
import { leagueIdField, resolveLeagueId, runTool } from './helpers.js';

export function registerMatchupsTool(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_matchups',
    {
      description:
        "Get a week's matchups for a configured league, paired by matchup_id, with owner and player names resolved. Locked to this client's configured leagues. Week defaults to the current NFL week.",
      inputSchema: z.object({
        league_id: leagueIdField(ctx.config.leagueIds),
        week: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('NFL week. Defaults to the current week from NFL state.'),
      }),
    },
    async ({ league_id, week }) =>
      runTool(async () => {
        const leagueId = resolveLeagueId(ctx.config, league_id);
        const resolvedWeek = week ?? (await ctx.client.getNflState()).week;
        const [matchups, rosters, users] = await Promise.all([
          ctx.client.getMatchups(leagueId, resolvedWeek),
          ctx.client.getRosters(leagueId),
          ctx.client.getLeagueUsers(leagueId),
        ]);
        await ctx.players.ensureLoaded();
        return {
          week: resolvedWeek,
          ...pairMatchups(matchups, rosters, users, (id) => ctx.players.resolve(id)),
        };
      }),
  );
}
