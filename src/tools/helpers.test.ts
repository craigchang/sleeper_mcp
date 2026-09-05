import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LeagueLockError, SleeperApiError } from '../sleeper/errors.js';
import { assertDraftInLeague, resolveDraftId, resolveLeagueId, runTool } from './helpers.js';

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

test('assertDraftInLeague accepts a draft from the selected league', () => {
  assertDraftInLeague({ draft_id: 'D1', league_id: 'league-a' }, 'league-a');
});

test('assertDraftInLeague rejects a draft from another league', () => {
  assert.throws(
    () => assertDraftInLeague({ draft_id: 'D9', league_id: 'league-z' }, 'league-a'),
    /does not belong to league league-a/,
  );
});

test('assertDraftInLeague rejects a draft with no league', () => {
  assert.throws(
    () => assertDraftInLeague({ draft_id: 'D9', league_id: null }, 'league-a'),
    LeagueLockError,
  );
});

test('resolveDraftId uses the provided draft_id', async () => {
  const id = await resolveDraftId({ getLeague: async () => ({ draft_id: 'ignored' }) }, 'L', '14006');
  assert.equal(id, '14006');
});

test('resolveDraftId defaults to the league draft_id', async () => {
  const id = await resolveDraftId({ getLeague: async () => ({ draft_id: 'league-draft' }) }, 'L');
  assert.equal(id, 'league-draft');
});

test('resolveDraftId rejects a league with no draft', async () => {
  await assert.rejects(
    () => resolveDraftId({ getLeague: async () => ({ draft_id: null }) }, 'L'),
    SleeperApiError,
  );
});

test('runTool hides unexpected error details from the model', async () => {
  const result = await runTool(async () => {
    throw new Error('/Users/me/secret/.env is not readable');
  });
  assert.equal('isError' in result && result.isError, true);
  assert.equal(result.content[0]?.text, 'Unexpected error while calling Sleeper. Check the MCP server logs.');
});
