# sleeper_mcp

Local Model Context Protocol server for the [Sleeper](https://docs.sleeper.com/#user) fantasy API. Tools are locked to the user and league IDs in your gitignored `.env`. The public API is read-only; no token is required.

## Setup

Requires Node.js 20+.

```bash
cp .env.example .env
npm install
```

`npm install` is enough; Cursor compiles TypeScript on launch. Do not start the server with `npx tsx` — that pulls in a platform-specific esbuild binary and breaks when Cursor’s Node architecture differs from the one used to install dependencies.

Fill in `.env`:

```
SLEEPER_USER_ID=your_numeric_user_id
SLEEPER_LEAGUE_IDS=league_id_one,league_id_two
SLEEPER_SEASON=2025
```

- Look up `SLEEPER_USER_ID` with `GET https://api.sleeper.app/v1/user/<username>`.
- `SLEEPER_LEAGUE_IDS` is a required allowlist. Tools will not accept any other league.
- `SLEEPER_USER_ID` and each `SLEEPER_LEAGUE_IDS` value must be numeric Sleeper ids.
- `SLEEPER_SEASON` is optional. If set, it must be a 4-digit year. If omitted, the server uses `league_season` from `GET /v1/state/nfl`.

Never commit `.env`. Cursor user MCP settings may set the same variables; existing environment values win over the file.

On start the server checks that the user exists and that every configured league belongs to that user for the season.

## Cursor

[`.cursor/mcp.json`](.cursor/mcp.json) launches the server with no IDs:

```json
{
  "mcpServers": {
    "sleeper": {
      "command": "node",
      "args": ["scripts/launch.js"]
    }
  }
}
```

Cursor runs that with its own Node (20+). The launcher compiles `src/` to `dist/` then starts the server, so you do not need `tsx` or a matching esbuild binary.

Enable the server in Cursor MCP settings. Keep real IDs out of any committed file; use `.env` or Cursor *user* MCP `env` overrides.

## Tools

| Tool | What it returns |
|---|---|
| `get_user` | Configured user (`username`, `user_id`, `display_name`) |
| `get_user_leagues` | Allowlisted leagues only |
| `get_rosters` | Rosters with owner and player names |
| `get_matchups` | Week matchups paired by `matchup_id` (week defaults to NFL state) |
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
