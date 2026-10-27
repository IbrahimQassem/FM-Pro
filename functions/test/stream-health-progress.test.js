import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acquireHealthLease, releaseHealthLease, commitHealthUnit, streamIdentity, healthLimits } from '../lib/stream-health-progress.js';
function fixture() {
  const root = 'HudHudDev', progress = `${root}/streamHealthJobs/checkpoints/active`, records = new Map(), writes = []; let queue = Promise.resolve();
  const db = { doc: path => ({ path }), runTransaction(fn) {
    const operation = queue.then(async () => {
      const staged = [];
      const result = await fn({ get: async ref => { assert.equal(staged.length, 0); return { exists: records.has(ref.path), data: () => records.get(ref.path) }; },
        set: (ref, data) => staged.push([ref.path, data]), update: (ref, data) => staged.push([ref.path, { ...records.get(ref.path), ...data }]) });
      for (const [path, data] of staged) { records.set(path, data); writes.push(path); } return result;
    }); queue = operation.catch(() => {}); return operation;
  } };
  return { root, progress, records, writes, db };
}
test('private progress acquires one120s lease and reclaims expired ownership with new generation', async () => {
  const f = fixture(); let time = 1000;
  const first = await acquireHealthLease(f.db, f.root, { owner: 'first', now: () => time });
  assert.equal(first.leaseUntil, time + healthLimits.leaseMs);
  assert.equal(await acquireHealthLease(f.db, f.root, { owner: 'second', now: () => time }), null);
  time = first.leaseUntil; const second = await acquireHealthLease(f.db, f.root, { owner: 'second', now: () => time });
  assert.equal(second.generation, 2); assert.equal(second.cursor, null);
  await assert.rejects(releaseHealthLease(f.db, f.root, first, { now: () => time }), { code: 'health-progress-conflict' });
});
test('private progress rejects malformed version/cursor/generation and unknown root without writes', async () => {
  for (const change of [{ version: 99 }, { cursor: '../bad' }, { generation: 0 }, { cycle: -1 }, { leaseUntil: NaN }]) {
    const f = fixture(); f.records.set(f.progress, { version: 1, owner: 'old', cursor: null, cycle: 0, generation: 1, leaseUntil: 0, ...change });
    await assert.rejects(acquireHealthLease(f.db, f.root, { now: () => 1000 })); assert.equal(f.writes.length, 0);
  }
  const f = fixture(); await assert.rejects(acquireHealthLease(f.db, 'UnknownRoot')); assert.equal(f.writes.length, 0);
});
test('stable station work advances only its committed ID and wraps at explicit completed release', async () => {
  const f = fixture(), lease = await acquireHealthLease(f.db, f.root, { now: () => 1000, owner: 'worker' });
  const path = `${f.root}/stations/stations/station`, data = { streamUrl: 'https://example.com/' }; f.records.set(path, data);
  const result = await commitHealthUnit(f.db, f.root, lease, { id: 'station', identity: streamIdentity(data), now: () => 1000, evaluate: () => null });
  lease.cursor = result.cursor; assert.equal(f.records.get(f.progress).cursor, 'station'); assert.equal(f.writes.includes(path), false);
  const next = await releaseHealthLease(f.db, f.root, lease, { complete: true, now: () => 1000 });
  assert.equal(next.cursor, null); assert.equal(next.cycle, 1); assert.equal(next.leaseUntil, 0);
});
test('metadata operation completing after its root deadline cannot commit a station or checkpoint', async () => {
  const f = fixture(); let time = 1000;
  const lease = await acquireHealthLease(f.db, f.root, { owner: 'worker', now: () => time, deadline: 1500 });
  const path = `${f.root}/stations/stations/station`, data = { streamUrl: 'https://example.com/' }; f.records.set(path, data);
  const before = f.writes.length;
  await assert.rejects(commitHealthUnit(f.db, f.root, lease, { id: 'station', identity: streamIdentity(data), now: () => time, deadline: 1500,
    evaluate: () => { time = 1500; return { payload: { healthStatus: 'offline' } }; } }), { code: 'health-budget-exhausted' });
  assert.equal(f.writes.length, before); assert.equal(f.records.get(f.progress).cursor, null);
  await assert.rejects(releaseHealthLease(f.db, f.root, lease, { now: () => time, deadline: 1500 }), { code: 'health-budget-exhausted' });
  assert.equal(f.writes.length, before);
});
