#!/usr/bin/env node
/**
 * Generate a weekly fantasy league report (markdown).
 *
 * Usage:
 *   node .cursor/scripts/weekly-fantasy-report.js --league <id|alias> --week <n>
 *   node .cursor/scripts/weekly-fantasy-report.js --league bestball --week 1
 *
 * Aliases: dynasty | wday-dynasty, bestball | workday
 * Defaults: --week from NFL state; --league required.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://api.sleeper.app/v1';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const LEAGUE_ALIASES = {
  dynasty: '1314321465079771136',
  'wday-dynasty': '1314321465079771136',
  bestball: '1400621990032773120',
  workday: '1400621990032773120',
  'workday-best-ball': '1400621990032773120',
};

const POTW_POSITIONS = ['QB', 'RB', 'WR', 'TE'];

function usage(exitCode = 1) {
  console.error(`Usage: node .cursor/scripts/weekly-fantasy-report.js --league <id|alias> [--week <n>] [--partial]

Aliases: dynasty, bestball
Examples:
  node .cursor/scripts/weekly-fantasy-report.js --league bestball --week 1
  node .cursor/scripts/weekly-fantasy-report.js --league 1400621990032773120 --week 2`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = { league: null, week: null, partial: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    if (a === '--partial') {
      args.partial = true;
      continue;
    }
    if (a === '--league' || a === '-l') {
      args.league = argv[++i];
      continue;
    }
    if (a === '--week' || a === '-w') {
      args.week = Number(argv[++i]);
      continue;
    }
    console.error(`Unknown argument: ${a}`);
    usage(1);
  }
  if (!args.league) usage(1);
  if (args.week != null && (!Number.isInteger(args.week) || args.week < 1)) {
    console.error('--week must be a positive integer');
    process.exit(1);
  }
  return args;
}

function resolveLeagueId(input) {
  const key = String(input).trim().toLowerCase();
  return LEAGUE_ALIASES[key] ?? String(input).trim();
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'sleeper-mcp-weekly-report/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Sleeper ${path} → HTTP ${res.status}`);
  }
  return res.json();
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function fmt(n) {
  return round2(n).toFixed(2);
}

function loadPlayerCache() {
  const path = join(ROOT, '.cache/players-nfl.json');
  if (!existsSync(path)) return {};
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return parsed.players ?? {};
  } catch {
    return {};
  }
}

function ownerLabel(user) {
  if (!user) return 'Unknown';
  return user.display_name || user.username || user.user_id || 'Unknown';
}

function pointsFromSettings(settings = {}) {
  return round2((settings.fpts ?? 0) + (settings.fpts_decimal ?? 0) / 100);
}

function paFromSettings(settings = {}) {
  return round2((settings.fpts_against ?? 0) + (settings.fpts_against_decimal ?? 0) / 100);
}

function buildOwners(rosters, users) {
  const byUser = new Map(users.map((u) => [u.user_id, u]));
  const byRoster = new Map();
  for (const r of rosters) {
    const user = byUser.get(r.owner_id) ?? null;
    byRoster.set(r.roster_id, {
      rosterId: r.roster_id,
      name: ownerLabel(user),
      settings: r.settings ?? {},
      wins: r.settings?.wins ?? 0,
      losses: r.settings?.losses ?? 0,
      ties: r.settings?.ties ?? 0,
    });
  }
  return byRoster;
}

function pairMatchups(rows) {
  const byMid = new Map();
  for (const row of rows) {
    const mid = row.matchup_id;
    if (mid == null) continue;
    if (!byMid.has(mid)) byMid.set(mid, []);
    byMid.get(mid).push(row);
  }
  const pairs = [];
  for (const [mid, teams] of [...byMid.entries()].sort((a, b) => a[0] - b[0])) {
    if (teams.length !== 2) continue;
    const [a, b] = teams;
    pairs.push({ matchupId: mid, a, b });
  }
  return pairs;
}

function computeWeekResults(pairs, owners) {
  const results = [];
  const teams = [];
  for (const { a, b } of pairs) {
    const oa = owners.get(a.roster_id);
    const ob = owners.get(b.roster_id);
    const pa = round2(a.points ?? 0);
    const pb = round2(b.points ?? 0);
    const aWon = pa > pb;
    const bWon = pb > pa;
    const margin = round2(Math.abs(pa - pb));
    const winner = aWon ? a : b;
    const loser = aWon ? b : a;
    const winnerOwner = aWon ? oa : ob;
    const loserOwner = aWon ? ob : oa;
    results.push({
      aName: oa.name,
      aPts: pa,
      bName: ob.name,
      bPts: pb,
      margin,
      winnerName: winnerOwner.name,
      loserName: loserOwner.name,
      winnerPts: round2(winner.points ?? 0),
      loserPts: round2(loser.points ?? 0),
      tie: pa === pb,
    });
    teams.push({
      name: oa.name,
      pts: pa,
      opp: ob.name,
      oppPts: pb,
      won: aWon,
      lost: bWon,
      rosterId: a.roster_id,
    });
    teams.push({
      name: ob.name,
      pts: pb,
      opp: oa.name,
      oppPts: pa,
      won: bWon,
      lost: aWon,
      rosterId: b.roster_id,
    });
  }
  return { results, teams };
}

function pickExtremes(teams, results) {
  if (teams.length === 0) {
    throw new Error('No completed matchups found for this week.');
  }
  const best = teams.reduce((x, y) => (y.pts > x.pts ? y : x));
  const worst = teams.reduce((x, y) => (y.pts < x.pts ? y : x));
  const losers = teams.filter((t) => t.lost);
  const winners = teams.filter((t) => t.won);
  const highLoss = losers.length
    ? losers.reduce((x, y) => (y.pts > x.pts ? y : x))
    : null;
  const lowWin = winners.length
    ? winners.reduce((x, y) => (y.pts < x.pts ? y : x))
    : null;
  const decided = results.filter((r) => !r.tie);
  const blowout = decided.length
    ? decided.reduce((x, y) => (y.margin > x.margin ? y : x))
    : null;
  const narrow = decided.length
    ? decided.reduce((x, y) => (y.margin < x.margin ? y : x))
    : null;
  return { best, worst, highLoss, lowWin, blowout, narrow };
}

function playersOfTheWeek(matchupRows, owners, playerCache) {
  const best = Object.fromEntries(POTW_POSITIONS.map((p) => [p, null]));
  for (const row of matchupRows) {
    const owner = owners.get(row.roster_id)?.name ?? 'Unknown';
    const points = row.players_points ?? {};
    for (const pid of row.starters ?? []) {
      if (!pid || pid === '0') continue;
      const info = playerCache[pid] ?? {};
      const pos = info.position;
      if (!POTW_POSITIONS.includes(pos)) continue;
      const pts = round2(points[pid] ?? 0);
      const cur = best[pos];
      if (!cur || pts > cur.pts) {
        best[pos] = {
          pos,
          player: info.name ?? pid,
          team: info.team ?? '',
          owner,
          pts,
        };
      } else if (cur && pts === cur.pts) {
        cur.co = cur.co ?? [];
        cur.co.push({
          player: info.name ?? pid,
          team: info.team ?? '',
          owner,
          pts,
        });
      }
    }
  }
  return best;
}

async function standingsThroughWeek(leagueId, throughWeek, owners) {
  const pf = new Map();
  const pa = new Map();
  const w = new Map();
  const l = new Map();
  const t = new Map();

  for (const [rosterId, owner] of owners) {
    pf.set(rosterId, 0);
    pa.set(rosterId, 0);
    w.set(rosterId, 0);
    l.set(rosterId, 0);
    t.set(rosterId, 0);
  }

  for (let week = 1; week <= throughWeek; week++) {
    const rows = await getJson(`/league/${leagueId}/matchups/${week}`);
    const { teams } = computeWeekResults(pairMatchups(rows), owners);
    for (const team of teams) {
      pf.set(team.rosterId, round2((pf.get(team.rosterId) ?? 0) + team.pts));
      pa.set(team.rosterId, round2((pa.get(team.rosterId) ?? 0) + team.oppPts));
      if (team.won) w.set(team.rosterId, (w.get(team.rosterId) ?? 0) + 1);
      else if (team.lost) l.set(team.rosterId, (l.get(team.rosterId) ?? 0) + 1);
      else t.set(team.rosterId, (t.get(team.rosterId) ?? 0) + 1);
    }
  }

  return [...owners.values()]
    .map((o) => ({
      name: o.name,
      wins: w.get(o.rosterId) ?? 0,
      losses: l.get(o.rosterId) ?? 0,
      ties: t.get(o.rosterId) ?? 0,
      pf: pf.get(o.rosterId) ?? 0,
      pa: pa.get(o.rosterId) ?? 0,
      // Prefer computed totals; settings are a useful cross-check for completed seasons
      settingsPf: pointsFromSettings(o.settings),
      settingsPa: paFromSettings(o.settings),
    }))
    .sort((a, b) => b.pf - a.pf || a.name.localeCompare(b.name));
}

function recordStr(row) {
  if (row.ties) return `${row.wins}-${row.losses}-${row.ties}`;
  return `${row.wins}-${row.losses}`;
}

function formatPotwCell(entry) {
  if (!entry) return '| | | | | |';
  const rows = [entry, ...(entry.co ?? [])];
  return rows
    .map(
      (e, i) =>
        `| ${i === 0 ? entry.pos : ''} | ${e.player} | ${e.team || ''} | ${e.owner} | ${fmt(e.pts)} |`,
    )
    .join('\n');
}

function renderMarkdown({
  leagueName,
  week,
  partial,
  results,
  awards,
  potw,
  standings,
}) {
  const lines = [];
  lines.push(`# ${leagueName} — Week ${week} report`);
  if (partial) {
    lines.push('');
    lines.push(
      '> **Partial:** this week is incomplete; scores may still change.',
    );
  }
  lines.push('');
  lines.push('## Scoreboard');
  lines.push('| Matchup | Result |');
  lines.push('|---|---|');
  for (const r of results) {
    if (r.tie) {
      lines.push(
        `| ${r.aName} ${fmt(r.aPts)} – ${fmt(r.bPts)} ${r.bName} | Tie |`,
      );
    } else {
      const topFirst = r.aPts >= r.bPts;
      const left = topFirst
        ? `${r.aName} ${fmt(r.aPts)} – ${fmt(r.bPts)} ${r.bName}`
        : `${r.bName} ${fmt(r.bPts)} – ${fmt(r.aPts)} ${r.aName}`;
      lines.push(`| ${left} | ${r.winnerName} by ${fmt(r.margin)} |`);
    }
  }

  lines.push('');
  lines.push('## Awards');
  lines.push(
    `- **Best team:** ${awards.best.name} (${fmt(awards.best.pts)})`,
  );
  lines.push(
    `- **Worst team:** ${awards.worst.name} (${fmt(awards.worst.pts)})`,
  );
  if (awards.highLoss) {
    lines.push(
      `- **Highest score in a loss:** ${awards.highLoss.name} (${fmt(awards.highLoss.pts)}, lost to ${awards.highLoss.opp})`,
    );
  }
  if (awards.lowWin) {
    lines.push(
      `- **Lowest score in a win:** ${awards.lowWin.name} (${fmt(awards.lowWin.pts)}, beat ${awards.lowWin.opp})`,
    );
  }
  if (awards.blowout) {
    lines.push(
      `- **Biggest blowout:** ${awards.blowout.winnerName} over ${awards.blowout.loserName} by ${fmt(awards.blowout.margin)}`,
    );
  }
  if (awards.narrow) {
    lines.push(
      `- **Narrowest win:** ${awards.narrow.winnerName} over ${awards.narrow.loserName} by ${fmt(awards.narrow.margin)}`,
    );
  }

  lines.push('');
  lines.push('## Players of the week');
  lines.push('| Pos | Player | Team | Owner | Pts |');
  lines.push('|---|---|---|---|---|');
  for (const pos of POTW_POSITIONS) {
    lines.push(formatPotwCell(potw[pos]));
  }

  lines.push('');
  lines.push(`## Standings by PF (through week ${week})`);
  lines.push('| Rank | Owner | W-L | PF | PA |');
  lines.push('|---|---|---|---|---|');
  standings.forEach((row, i) => {
    lines.push(
      `| ${i + 1} | ${row.name} | ${recordStr(row)} | ${fmt(row.pf)} | ${fmt(row.pa)} |`,
    );
  });
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const leagueId = resolveLeagueId(args.league);
  if (!/^\d+$/.test(leagueId)) {
    console.error(`Invalid league id: ${args.league}`);
    process.exit(1);
  }

  const state = await getJson('/state/nfl');
  const week = args.week ?? Number(state.week);
  if (!Number.isInteger(week) || week < 1) {
    console.error('Could not resolve a valid week');
    process.exit(1);
  }

  const [league, rosters, users, matchups] = await Promise.all([
    getJson(`/league/${leagueId}`),
    getJson(`/league/${leagueId}/rosters`),
    getJson(`/league/${leagueId}/users`),
    getJson(`/league/${leagueId}/matchups/${week}`),
  ]);

  const owners = buildOwners(rosters, users);
  const pairs = pairMatchups(matchups);
  const { results, teams } = computeWeekResults(pairs, owners);
  const awards = pickExtremes(teams, results);
  let cache = loadPlayerCache();
  if (Object.keys(cache).length === 0) {
    const rawPlayers = await getJson('/players/nfl');
    cache = {};
    for (const [id, p] of Object.entries(rawPlayers)) {
      const name =
        p.full_name ||
        [p.first_name, p.last_name].filter(Boolean).join(' ') ||
        id;
      cache[id] = {
        name,
        position: p.position ?? p.fantasy_positions?.[0] ?? null,
        team: p.team ?? null,
      };
    }
  }

  const potw = playersOfTheWeek(matchups, owners, cache);
  const standings = await standingsThroughWeek(leagueId, week, owners);

  const md = renderMarkdown({
    leagueName: league.name ?? `League ${leagueId}`,
    week,
    partial: args.partial,
    results,
    awards,
    potw,
    standings,
  });
  process.stdout.write(md);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
