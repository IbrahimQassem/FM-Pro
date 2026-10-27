import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { claimDelivery, startDelivery, finishDelivery, notificationFailure } from '../lib/notification-delivery.js';

function store(initial) {
  let data = initial;
  const reference = { path: 'HudHudDev/notificationOperations/operations/synthetic' };
  const firestore = { runTransaction: async fn => fn({
    get: async () => ({ exists: !!data, data: () => data }),
    set: (_ref, next) => { data = { ...next }; },
    update: (_ref, next) => { data = { ...data, ...next }; },
  }) };
  return { firestore, reference, value: () => data };
}

test('one lease owns a pending send and a sent receipt prevents replay', async () => {
  const db = store();
  const lease = await claimDelivery({ ...db, now: 1000 });
  assert.ok(lease);
  assert.equal(await claimDelivery({ ...db, now: 1001 }), null);
  assert.equal(await startDelivery({ ...db, lease: 'another', now: 1001 }), false);
  assert.equal(await startDelivery({ ...db, lease, now: 1001 }), true);
  await finishDelivery({ ...db, lease, status: 'sent', now: 1002 });
  assert.equal(db.value().status, 'sent');
  assert.equal(await claimDelivery({ ...db, now: 99999999 }), null);
});

test('expired prepared work can be reclaimed but an expired sending lease becomes unknown', async () => {
  const prepared = store();
  const old = await claimDelivery({ ...prepared, now: 1000 });
  const replacement = await claimDelivery({ ...prepared, now: 601001 });
  assert.ok(replacement && replacement !== old);
  assert.equal(await startDelivery({ ...prepared, lease: old, now: 601002 }), false);
  const sending = store();
  const lease = await claimDelivery({ ...sending, now: 1000 });
  await startDelivery({ ...sending, lease, now: 1001 });
  assert.equal(await claimDelivery({ ...sending, now: 601001 }), null);
  assert.equal(sending.value().status, 'unknown');
  assert.equal(await claimDelivery({ ...sending, now: 99999999 }), null);
});

test('only a known retryable rejection permits another send after backoff', async () => {
  const db = store();
  const lease = await claimDelivery({ ...db, now: 1000 });
  await startDelivery({ ...db, lease, now: 1001 });
  await finishDelivery({ ...db, lease, now: 1002, ...notificationFailure({ code: 'messaging/server-unavailable' }) });
  assert.equal(db.value().status, 'failed');
  assert.equal(await claimDelivery({ ...db, now: 1003 }), null);
  assert.ok(await claimDelivery({ ...db, now: 121003 }));
  assert.deepEqual(notificationFailure(new Error('private raw transport failure')), { status: 'unknown', retryable: false, reason: 'delivery-uncertain' });
  assert.equal(notificationFailure({ code: 'messaging/registration-token-not-registered' }).retryable, false);
});

test('late completion cannot overwrite another lease or release an uncertain operation', async () => {
  const db = store();
  const lease = await claimDelivery({ ...db, now: 1000 });
  const next = await claimDelivery({ ...db, now: 601001 });
  assert.equal(await finishDelivery({ ...db, lease, now: 601002, status: 'sent' }), false);
  await startDelivery({ ...db, lease: next, now: 601002 });
  await finishDelivery({ ...db, lease: next, now: 601003, status: 'unknown', retryable: false });
  assert.equal(await finishDelivery({ ...db, lease: next, now: 601004, status: 'sent' }), false);
  assert.equal(db.value().status, 'unknown');
});

test('a stable broadcast request key cannot be reused with a changed payload', async () => {
  const db = store();
  const lease = await claimDelivery({ ...db, now: 1000, fingerprint: 'payload-a' });
  await startDelivery({ ...db, lease, now: 1001 });
  await finishDelivery({ ...db, lease, status: 'sent', messageId: 'synthetic-provider-ack', now: 1002 });
  assert.equal(db.value().messageId, 'synthetic-provider-ack');
  await assert.rejects(claimDelivery({ ...db, now: 1003, fingerprint: 'payload-b' }), { code: 'delivery/payload-conflict' });
});

const receiptHash = tuple => createHash('sha256').update(JSON.stringify(tuple)).digest('hex');
const carriedReceipt = decision => {
  const stamp = Timestamp.fromMillis(500);
  const fingerprint = receiptHash(['program-schedule-v2', 'program', 'station', true, true, [1], 600, 660, 180]);
  return { fingerprint, attempts: 3, lease: 'old-lease', status: decision === 'carried-prepared' ? 'pending' : 'failed',
    phase: 'claimed', retryable: true, leaseUntil: Timestamp.fromMillis(1000), retryAt: Timestamp.fromMillis(1000),
    createdAt: stamp, updatedAt: stamp, expiresAt: Timestamp.fromMillis(1000000), cleanupAt: Timestamp.fromMillis(2000000),
    programCompatibility: { version: 1, manifestHash: 'a'.repeat(64), cutoverAt: stamp, programCreateTime: stamp,
      scheduleFingerprint: fingerprint, legacyDates: ['2026-10-19'], legacyKeys: [receiptHash(['program', '2026-10-19'])],
      evidenceHashes: ['b'.repeat(64)], decision, legacySourceKey: receiptHash(['program', '2026-10-19']),
      legacySourceCreateTime: stamp, legacySourceUpdateTime: stamp, recordedAt: stamp } };
};
for (const decision of ['carried-prepared', 'carried-retryable']) {
  test(`reclaim preserves narrow ${decision} lineage and original delivery clocks`, async () => {
    const previous = carriedReceipt(decision); const db = store(previous);
    const lease = await claimDelivery({ ...db, fingerprint: previous.fingerprint, now: 2000 });
    assert.ok(lease && lease !== previous.lease); assert.equal(db.value().attempts, 4);
    for (const field of ['createdAt', 'expiresAt', 'cleanupAt']) assert.deepEqual(db.value()[field], previous[field]);
    assert.deepEqual(db.value().programCompatibility, previous.programCompatibility);
  });
}
for (const status of ['sent', 'unknown', 'backoff']) {
  test(`claim leaves carried ${status} evidence unchanged`, async () => {
    const previous = { ...carriedReceipt('carried-retryable'), status: status === 'backoff' ? 'failed' : status,
      retryAt: Timestamp.fromMillis(3000) }; const db = store(previous);
    assert.equal(await claimDelivery({ ...db, fingerprint: previous.fingerprint, now: 2000 }), null);
    assert.deepEqual(db.value(), previous);
  });
}
test('default broadcast claim does not acquire program-only compatibility metadata', async () => {
  const db = store(); assert.ok(await claimDelivery({ ...db, fingerprint: 'broadcast-payload', now: 1000 }));
  assert.equal(Object.hasOwn(db.value(), 'programCompatibility'), false);
});

for (const mode of ['accept', 'reject', 'throw']) {
  test(`optional start validator ${mode} is evaluated before the sending write`, async () => {
    const db = store(); const lease = await claimDelivery({ ...db, now: 1000 }); let calls = 0;
    const validate = async tx => {
      calls++; await tx.get(db.reference);
      assert.equal(db.value().phase, 'claimed');
      if (mode === 'throw') throw new Error('Synthetic validation failure');
      return mode === 'accept';
    };
    if (mode === 'throw') await assert.rejects(startDelivery({ ...db, lease, now: 1001, validate }), /Synthetic validation failure/);
    else assert.equal(await startDelivery({ ...db, lease, now: 1001, validate }), mode === 'accept');
    assert.equal(calls, 1); assert.equal(db.value().phase, mode === 'accept' ? 'sending' : 'claimed');
  });
}
test('optional start validator reruns storage reads on a retried transaction before its sole committed write', async () => {
  const db = store(); const lease = await claimDelivery({ ...db, now: 1000 }); let attempts = 0, validations = 0, commits = 0;
  const firestore = { runTransaction: async fn => {
    for (let attempt = 0; attempt < 2; attempt++) {
      attempts++; const writes = []; let reading = true;
      const result = await fn({
        get: async () => { assert.equal(reading, true); return { exists: true, data: () => db.value() }; },
        update: (_ref, patch) => { reading = false; writes.push(patch); },
      });
      if (attempt === 1) { assert.equal(writes.length, 1); commits++; return result; }
    }
  } };
  const result = await startDelivery({ firestore, reference: db.reference, lease, now: 1001,
    validate: async tx => { validations++; await tx.get(db.reference); return true; } });
  assert.equal(result, true); assert.equal(attempts, 2); assert.equal(validations, 2); assert.equal(commits, 1);
});
