# sleeper_mcp

Local Model Context Protocol server for the [Sleeper](https://docs.sleeper.com/#user) fantasy API. Tools are locked to a configured user, league allowlist, and optional season. The public API is read-only; no token is required.

## Setup

Requires Node.js 20+.

```bash
cp .env.example .env
npm install
```

`npm install` is enough; Cursor compiles TypeScript on launch. Do not start the server with `npx tsx` — that pulls in a platform-specific esbuild binary and breaks when Cursor’s Node architecture differs from the one used to install dependencies.

Set identity in [`.cursor/mcp.json`](.cursor/mcp.json) under the sleeper server `env` block:

```json
"env": {
  "SLEEPER_USER_ID": "your_numeric_user_id",
  "SLEEPER_LEAGUE_IDS": "league_id_one,league_id_two",
  "SLEEPER_SEASON": "2026"
}
```

The same three variables can live in `.env` instead. Already-set environment variables win, then `mcp.json`, then `.env`.

- Look up `SLEEPER_USER_ID` with `GET https://api.sleeper.app/v1/user/<username>`.
- `SLEEPER_LEAGUE_IDS` is a required comma-separated allowlist. Tools will not accept any other league.
- `SLEEPER_USER_ID` and each league id must be numeric Sleeper ids.
- `SLEEPER_SEASON` is optional. If set, it must be a 4-digit year. If omitted, the server uses `league_season` from `GET /v1/state/nfl`.

Never commit `.env`. `mcp.json` is tracked, so it will contain whatever ids you put there.

On start the server checks that the user exists and that every configured league belongs to that user for the season.

## Cursor

[`.cursor/mcp.json`](.cursor/mcp.json) launches the server and can set `SLEEPER_USER_ID`, `SLEEPER_LEAGUE_IDS`, and `SLEEPER_SEASON` in `env`. Cursor passes that block into the process. `npm start` reads the same file when those variables are not already set.

Cursor runs the launcher with its own Node (20+). The launcher compiles `src/` to `dist/` then starts the server, so you do not need `tsx` or a matching esbuild binary.

Enable the server in Cursor MCP settings. A Cursor user-level MCP `env` override still wins over the project file.

## Tools

| Tool | What it returns |
|---|---|
| `get_user` | Configured user (`username`, `user_id`, `display_name`) |
| `get_user_leagues` | Allowlisted leagues only |
| `get_rosters` | Rosters with owner and player names |
| `get_matchups` | Week matchups paired by `matchup_id` (week defaults to NFL state) |
| `get_draft` | Specific draft (order, settings, status). `draft_id` defaults to the league's current draft |
| `get_draft_picks` | Draft picks with player and owner names. `draft_id` defaults to the league's current draft |
| `get_nfl_state` | Current week / season |

If exactly one league is configured, `league_id` is optional on league-scoped tools.

Player IDs are resolved from a daily cache of `GET /v1/players/nfl` stored in gitignored `.cache/players-nfl.json`.

## Scripts

```bash
npm start          # compile + stdio MCP (same entry Cursor uses)
npm run build      # compile only
npm test           # mocked unit tests
```

Log only to stderr. stdout is the MCP protocol channel.

## Inspector

```bash
npx @modelcontextprotocol/inspector node scripts/launch.js
```
