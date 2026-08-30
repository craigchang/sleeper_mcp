---
name: add-sleeper-tool
description: Adds or changes Sleeper MCP tools using the locked-identity pattern, Zod schemas, the shared HTTP client, and player-name resolution. Use when creating, editing, or reviewing tools in sleeper_mcp.
---

# Add a Sleeper MCP tool

## Checklist

1. Register with `server.registerTool` in a file under `src/tools/`, then call that register function from `src/index.ts`.
2. Use a Zod v4 `inputSchema`. The description must say the tool is locked to this client's configured user and leagues.
3. Never add a `user_id` argument. Never accept a free-form `league_id`.
   - One configured league: `league_id` is optional and defaults via `resolveLeagueId`.
   - Multiple leagues: use `leagueIdField(ctx.config.leagueIds)` (enum of allowlisted IDs).
4. Call Sleeper only through `src/sleeper/client.ts`.
5. If the response includes player IDs, `await ctx.players.ensureLoaded()` and resolve with `ctx.players.resolve(id)` before returning.
6. Return compact shaped JSON via `runTool` / `toolOk`. On lock or upstream failure return `isError: true` (do not throw out of the handler).
7. Add a mocked unit test for lock behavior and any new shaping.

## Pattern

```ts
server.registerTool(
  'get_example',
  {
    description: '.... Locked to this client\'s configured leagues.',
    inputSchema: z.object({ league_id: leagueIdField(ctx.config.leagueIds) }),
  },
  async ({ league_id }) =>
    runTool(async () => {
      const leagueId = resolveLeagueId(ctx.config, league_id);
      const data = await ctx.client.getRosters(leagueId);
      return shapeSomething(data);
    }),
);
```

Do not expose `GET /players/nfl` as a tool. Use the daily cache in `src/sleeper/players.ts`.
