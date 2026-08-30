import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';

import type { AppContext } from '../context.js';
import { shapeNflState } from '../sleeper/shape.js';
import { runTool } from './helpers.js';

export function registerNflStateTool(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_nfl_state',
    {
      description:
        'Get the current Sleeper NFL state (week, season, season_type, league_season). Not user-specific.',
      inputSchema: z.object({}),
    },
    async () =>
      runTool(async () => {
        const state = await ctx.client.getNflState();
        return shapeNflState(state);
      }),
  );
}
