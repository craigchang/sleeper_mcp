# Sleeper API reference (v1 coverage)

Official docs: https://docs.sleeper.com/#user

## Errors

| HTTP | Meaning |
|---|---|
| 400 | Bad request |
| 404 | Missing user/league (Sleeper may also return JSON `null` with 200) |
| 429 | Rate limited |
| 500 / 503 | Upstream failure |

`SleeperClient` maps these to `SleeperApiError`. Tools surface them as `isError: true`.

## Response notes

- Rosters and matchups list `player_id` strings, not names.
- Team defenses use the team abbreviation as `player_id`.
- Matchup rows are per roster. Pair rows that share `matchup_id`. A null `matchup_id` is a bye.
- League `settings` and `scoring_settings` are large; do not return them from v1 tools.
- `/players/nfl` is ~5MB. Refresh at most once per UTC day.

## Deferred endpoints (not v1)

- Drafts: `/user/{id}/drafts/...`, `/draft/{id}`, `/draft/{id}/picks`
- Transactions: `/league/{id}/transactions/{round}`
- Traded picks: `/league/{id}/traded_picks`
- Playoff brackets: `/league/{id}/winners_bracket`, `/losers_bracket`
- Trending players: `/players/nfl/trending/{add|drop}`
