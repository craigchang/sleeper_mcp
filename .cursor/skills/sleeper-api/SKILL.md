---
name: sleeper-api
description: Documents Sleeper public API IDs, v1 endpoints, rate limits, and the daily player cache used by sleeper_mcp. Use when calling Sleeper, mapping player/roster/league IDs, or adding API coverage.
---

# Sleeper API (this MCP)

Read-only public API. No token. Do not add write actions.

- Base: `https://api.sleeper.app/v1`
- Stay under 1000 requests/minute (this client caps at 100/min)
- Identity is locked: `SLEEPER_USER_ID` + `SLEEPER_LEAGUE_IDS` from gitignored `.env`

## IDs (do not mix)

| ID | Meaning |
|---|---|
| `user_id` | Sleeper account. Configured once; tools never take this as input. |
| `league_id` | A league. Must be in the allowlist. |
| `roster_id` | Team slot inside a league (number). |
| `player_id` | Player or team defense (`"4034"`, `"DET"`). Resolve via the cache. |
| `matchup_id` | Pairs two roster rows in a week. |
| `draft_id` | Draft. Not in v1 tools. |

## v1 endpoints used

- `GET /user/{user_id}`
- `GET /user/{user_id}/leagues/nfl/{season}`
- `GET /league/{league_id}/rosters`
- `GET /league/{league_id}/users`
- `GET /league/{league_id}/matchups/{week}`
- `GET /state/nfl`
- `GET /players/nfl` — cache daily in `.cache/players-nfl.json`; never return the raw map

If `SLEEPER_SEASON` is unset, use `league_season` from NFL state.

Details: [reference.md](reference.md)
