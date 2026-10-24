import assert from 'node:assert/strict';
import { test } from 'node:test';
import { broadcastAttempt } from '../lib/broadcast-attempt.ts';

void test('retries keep one broadcast intent; editing, changing account or environment creates a new intent', () => {
  let sequence = 0;
  const id = () => `synthetic-${++sequence}`;
  const original = { root: 'HudHudDev', actorId: 'actor', title: 'Title', body: 'Body' };
  const first = broadcastAttempt(null, original, id);
  assert.deepEqual(broadcastAttempt(first, { ...original }, id), first);
  assert.notEqual(broadcastAttempt(first, { ...original, body: 'Changed' }, id).operationId, first.operationId);
  assert.notEqual(broadcastAttempt(first, { ...original, root: 'HudHudOfficial' }, id).operationId, first.operationId);
  assert.notEqual(broadcastAttempt(first, { ...original, actorId: 'another' }, id).operationId, first.operationId);
  assert.notEqual(broadcastAttempt(null, original, id).operationId, first.operationId);
});
