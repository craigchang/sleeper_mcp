import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';

import type { AppContext } from '../context.js';
import { shapeUser } from '../sleeper/shape.js';
import { runTool } from './helpers.js';

export function registerUserTool(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_user',
    {
      description:
        "Get the configured Sleeper user (username, user_id, display_name). Locked to this client's configured user; no user_id argument.",
      inputSchema: z.object({}),
    },
    async () =>
      runTool(async () => {
        const user = await ctx.client.getUser(ctx.config.userId);
        return shapeUser(user);
      }),
  );
}
