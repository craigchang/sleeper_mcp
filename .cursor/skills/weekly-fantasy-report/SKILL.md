---
name: weekly-fantasy-report
description: >-
  Generates a weekly fantasy football league report (best/worst teams, players
  of the week, luck/blowout awards, PF/PA standings). Use when the user asks for
  a weekly recap, week in review, league report, power rankings by points, or
  how managers did this week in a Sleeper league.
---

# Weekly fantasy league report

Produce a one-week recap for a configured Sleeper league using live MCP + Sleeper data.

## Preferred: run the script

```bash
node .cursor/scripts/weekly-fantasy-report.js --league bestball --week 1
node .cursor/scripts/weekly-fantasy-report.js --league dynasty --week 2
```

Aliases: `dynasty` / `wday-dynasty` → WDAY Dynasty; `bestball` / `workday` → Workday Best Ball.  
`--week` defaults to current NFL week. Add `--partial` if games are still in progress.  
Print the script’s markdown stdout as the report (do not reformat unless asked).

## Inputs

- **League**: ask if ambiguous. Common: WDAY Dynasty `1314321465079771136`, Workday Best Ball `1400621990032773120`.
- **Week**: default to `get_nfl_state().week` (or `week - 1` if the user wants the just-completed week and games are still in progress — confirm).

## Data steps (manual fallback if the script cannot run)

1. `get_user_leagues` / `get_nfl_state` — confirm league name and week.
2. `get_matchups` for that `league_id` + `week` — paired matchups with team `points` and owners.
3. `get_rosters` — owner display names, W-L, season `points_for` (PF).
4. **Player scores** (POTW): shaped matchups omit per-player points. Fetch raw  
   `GET https://api.sleeper.app/v1/league/{league_id}/matchups/{week}` and use each row’s `players_points` + `starters`. Resolve names via roster payloads or `.cache/players-nfl.json`.
5. **PA**: MCP rosters expose PF only. Compute season **PA** by summing opponent `points` for each `roster_id` across completed weeks `1..N` (same raw or MCP matchups). If only the report week is needed for awards, still build PF/PA standings through that week.

Only count **starter** scores for Players of the Week (bench does not qualify).

## Awards to compute

| Award | Definition |
|---|---|
| Best team | Highest single-week team points |
| Worst team | Lowest single-week team points |
| POTW QB / RB / WR / TE | Highest starter points at that position among all starters that week |
| Highest points in a loss | Max points among teams that lost their matchup |
| Lowest points in a win | Min points among teams that won their matchup |
| Biggest blowout | Largest absolute point differential in a matchup |
| Narrowest victory | Smallest positive point differential in a matchup |
| Standings | All teams sorted by season **PF** desc; show **PA** and W-L |

For 2QB/superflex leagues, POTW QB is still the single highest QB starter score (not sum of both).

Ties: list co-winners.

## Output template

Use this structure (fill every section):

```markdown
# {League name} — Week {N} report

## Scoreboard
| Matchup | Result |
|---|---|
| {Owner A} {pts} – {pts} {Owner B} | {margin} |

## Awards
- **Best team:** {owner} ({pts})
- **Worst team:** {owner} ({pts})
- **Highest score in a loss:** {owner} ({pts}, lost to {opponent})
- **Lowest score in a win:** {owner} ({pts}, beat {opponent})
- **Biggest blowout:** {winner} over {loser} by {margin}
- **Narrowest win:** {winner} over {loser} by {margin}

## Players of the week
| Pos | Player | Team | Owner | Pts |
|---|---|---|---|---|
| QB | | | | |
| RB | | | | |
| WR | | | | |
| TE | | | | |

## Standings by PF (through week {N})
| Rank | Owner | W-L | PF | PA |
|---|---|---|---|---|
| 1 | | | | |
```

Keep commentary to 2–4 short bullets max (e.g. luck of high-score loser). No start/sit advice unless asked.

## Constraints

- Locked Sleeper identity: only allowlisted `league_id`s.
- Round points to 2 decimals.
- If the week is incomplete, label the report **partial** and say scores may change.
