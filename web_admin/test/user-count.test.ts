import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Firestore } from 'firebase/firestore';
import { loadUserCount } from '../lib/user-count.ts';
void test('count adapter uses only root and accepts bounded aggregate metadata', async () => {
  const result = { root: 'HudHudOfficial' as const, total: 2001, asOf: '2026-10-26T12:00:00.000Z' };
  assert.deepEqual(await loadUserCount({} as Firestore, result.root, async data => {
    assert.deepEqual(data, { root: result.root }); return { data: result };
  }), result);
});
void test('count adapter rejects cross-root, personal fields and malformed aggregate responses', async () => {
  const valid = { root: 'HudHudDev', total: 1, asOf: '2026-10-26T12:00:00.000Z' };
  for (const data of [null, [], { ...valid, root: 'HudHudOfficial' }, { ...valid, total: -1 },
    { ...valid, total: 1.5 }, { ...valid, asOf: 'invalid' }, { ...valid, email: 'synthetic@example.test' }]) {
    await assert.rejects(loadUserCount({} as Firestore, 'HudHudDev', async () => ({ data })), /Invalid administrative aggregate/);
  }
});
