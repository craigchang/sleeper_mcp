import { z } from 'zod/v4';

import type { Identity } from '../config.js';
import { LeagueLockError, SleeperApiError } from '../sleeper/errors.js';

export function resolveLeagueId(config: Identity, leagueId?: string): string {
  if (config.leagueIds.length === 1) {
    const only = config.leagueIds[0]!;
    if (leagueId && leagueId !== only) {
      throw new LeagueLockError(
        `league_id ${leagueId} is not the configured league (${only}).`,
      );
    }
    return only;
  }

  if (!leagueId) {
    throw new LeagueLockError(
      `league_id is required when multiple leagues are configured: ${config.leagueIds.join(', ')}`,
    );
  }
  if (!config.leagueIds.includes(leagueId)) {
    throw new LeagueLockError(
      `league_id ${leagueId} is not in the configured allowlist (${config.leagueIds.join(', ')}).`,
    );
  }
  return leagueId;
}

export function assertDraftInLeague(
  draft: { draft_id: string; league_id: string | null },
  leagueId: string,
): void {
  if (draft.league_id !== leagueId) {
    throw new LeagueLockError(
      `draft_id ${draft.draft_id} does not belong to league ${leagueId}.`,
    );
  }
}

export async function resolveDraftId(
  client: { getLeague(leagueId: string): Promise<{ draft_id?: string | null }> },
  leagueId: string,
  draftId?: string,
): Promise<string> {
  if (draftId) {
    return draftId;
  }
  const league = await client.getLeague(leagueId);
  const resolved = league.draft_id ?? undefined;
  if (!resolved) {
    throw new SleeperApiError(`League ${leagueId} has no draft.`, 404);
  }
  return resolved;
}

export function draftIdField() {
  return z
    .string()
    .regex(/^\d+$/)
    .optional()
    .describe(
      "Optional. Defaults to the league's current draft_id. Must belong to the selected league.",
    );
}

export function leagueIdField(leagueIds: string[]) {
  if (leagueIds.length === 1) {
    return z
      .string()
      .optional()
      .describe(`Optional. Defaults to the one configured league (${leagueIds[0]}).`);
  }
  return z
    .enum(leagueIds as [string, ...string[]])
    .describe('Must be one of the configured league IDs.');
}

export function toolOk(data: unknown): {
  content: [{ type: 'text'; text: string }];
} {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function toolError(message: string): {
  content: [{ type: 'text'; text: string }];
  isError: true;
} {
  return { content: [{ type: 'text', text: message }], isError: true };
}

export async function runTool(fn: () => Promise<unknown>): Promise<
  | { content: [{ type: 'text'; text: string }] }
  | { content: [{ type: 'text'; text: string }]; isError: true }
> {
  try {
    return toolOk(await fn());
  } catch (err) {
    if (err instanceof LeagueLockError || err instanceof SleeperApiError) {
      return toolError(err.message);
    }
    console.error(err);
    return toolError('Unexpected error while calling Sleeper. Check the MCP server logs.');
  }
}
