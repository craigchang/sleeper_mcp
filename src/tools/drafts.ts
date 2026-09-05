import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod/v4';

import type { AppContext } from '../context.js';
import { shapeDraft, shapeDraftPicks } from '../sleeper/shape.js';
import {
  assertDraftInLeague,
  draftIdField,
  leagueIdField,
  resolveDraftId,
  resolveLeagueId,
  runTool,
} from './helpers.js';

function draftInputSchema(leagueIds: string[]) {
  return z.object({
    league_id: leagueIdField(leagueIds),
    draft_id: draftIdField(),
  });
}

export function registerDraftTool(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_draft',
    {
      description:
        "Get a specific draft for a configured league (type, status, settings, start time, and draft order with owner names). Locked to this client's configured leagues. draft_id defaults to the league's current draft.",
      inputSchema: draftInputSchema(ctx.config.leagueIds),
    },
    async ({ league_id, draft_id }) =>
      runTool(async () => {
        const leagueId = resolveLeagueId(ctx.config, league_id);
        const draftId = await resolveDraftId(ctx.client, leagueId, draft_id);
        const [draft, users] = await Promise.all([
          ctx.client.getDraft(draftId),
          ctx.client.getLeagueUsers(leagueId),
        ]);
        assertDraftInLeague(draft, leagueId);
        return shapeDraft(draft, users);
      }),
  );
}

export function registerDraftPicksTool(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_draft_picks',
    {
      description:
        "Get picks in a configured league's draft, with player names/positions/teams and owner names resolved. Locked to this client's configured leagues. draft_id defaults to the league's current draft.",
      inputSchema: draftInputSchema(ctx.config.leagueIds),
    },
    async ({ league_id, draft_id }) =>
      runTool(async () => {
        const leagueId = resolveLeagueId(ctx.config, league_id);
        const draftId = await resolveDraftId(ctx.client, leagueId, draft_id);
        const draft = await ctx.client.getDraft(draftId);
        assertDraftInLeague(draft, leagueId);
        const [users, picks, rosters] = await Promise.all([
          ctx.client.getLeagueUsers(leagueId),
          ctx.client.getDraftPicks(draftId),
          ctx.client.getRosters(leagueId),
        ]);
        await ctx.players.ensureLoaded();
        return {
          draft_id: draftId,
          picks: shapeDraftPicks(picks, rosters, users, (id) => ctx.players.resolve(id)),
        };
      }),
  );
}
