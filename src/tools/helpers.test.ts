import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LeagueLockError } from '../sleeper/errors.js';
import { resolveLeagueId, runTool } from './helpers.js';

const one = { userId: 'u', leagueIds: ['league-a'] };
const many = { userId: 'u', leagueIds: ['league-a', 'league-b'] };

test('single configured league defaults when league_id is omitted', () => {
  assert.equal(resolveLeagueId(one), 'league-a');
});

test('single configured league accepts its own id', () => {
  assert.equal(resolveLeagueId(one, 'league-a'), 'league-a');
});

test('single configured league rejects any other id', () => {
  assert.throws(() => resolveLeagueId(one, 'league-z'), LeagueLockError);
});

test('multiple leagues require an allowlisted league_id', () => {
  assert.throws(() => resolveLeagueId(many), /league_id is required/);
  assert.equal(resolveLeagueId(many, 'league-b'), 'league-b');
});

test('multiple leagues reject an unknown league_id', () => {
  assert.throws(() => resolveLeagueId(many, 'league-z'), /not in the configured allowlist/);
});

test('runTool hides unexpected error details from the model', async () => {
  const result = await runTool(async () => {
    throw new Error('/Users/me/secret/.env is not readable');
  });
  assert.equal('isError' in result && result.isError, true);
  assert.equal(result.content[0]?.text, 'Unexpected error while calling Sleeper. Check the MCP server logs.');
});
