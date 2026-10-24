import assert from 'node:assert/strict';
import { test } from 'node:test';
import { claimDelivery, startDelivery, finishDelivery, notificationFailure } from '../lib/notification-delivery.js';

function store() {
  let data;
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
