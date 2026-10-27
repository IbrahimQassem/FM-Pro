import { randomUUID } from 'node:crypto';
import { validContentId } from './admin-content.js';

export const healthLimits = Object.freeze({ rootBudgetMs: 100000, invocationMs: 300000,
  invocationReserveMs: 40000, probeTimeoutMs: 8000, flushMarginMs: 10000,
  leaseMs: 120000, pageSize: 50, alertTimeoutMs: 8000 });
const roots = ['HudHudDev', 'HudHudOfficial'];
const fail = () => { const error = new Error('Health progress lease or state changed.'); error.code = 'health-progress-conflict'; throw error; };
const reference = (db, root) => {
  if (!roots.includes(root)) fail();
  return db.doc(`${root}/streamHealthJobs/checkpoints/active`);
};
function validate(value) {
  if (value.version !== 1 || !Number.isSafeInteger(value.generation) || value.generation < 1 ||
      !Number.isSafeInteger(value.cycle) || value.cycle < 0 || !validContentId(value.owner) ||
      !Number.isSafeInteger(value.leaseUntil) || value.leaseUntil < 0 ||
      (value.cursor !== null && !validContentId(value.cursor))) fail();
}
function withinBudget(now, deadline) {
  const time = now();
  if (!Number.isSafeInteger(time) || time < 0 || time >= deadline) {
    const error = new Error('Health root deadline expired.'); error.code = 'health-budget-exhausted'; throw error;
  }
  return time;
}
function owned(snapshot, lease, now) {
  if (!Number.isSafeInteger(now) || !snapshot.exists || now < lease.leaseUntil - healthLimits.leaseMs) fail();
  const value = snapshot.data(); validate(value);
  if (value.owner !== lease.owner || value.generation !== lease.generation || value.cursor !== lease.cursor ||
      value.cycle !== lease.cycle || value.leaseUntil <= now) fail();
  return value;
}
export async function acquireHealthLease(db, root, { owner = randomUUID(), now = Date.now, deadline = Infinity } = {}) {
  if (!validContentId(owner)) fail();
  const ref = reference(db, root);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref), value = snapshot.exists ? snapshot.data() : null, time = withinBudget(now, deadline);
    if (!Number.isSafeInteger(time) || time < 0) fail();
    if (value) validate(value);
    if (value?.leaseUntil > time) return null;
    const lease = { version: 1, generation: (value?.generation ?? 0) + 1, cycle: value?.cycle ?? 0,
      cursor: value?.cursor ?? null, owner, leaseUntil: time + healthLimits.leaseMs };
    validate(lease); withinBudget(now, deadline); tx.set(ref, lease); return lease;
  });
}
export function streamIdentity(data) {
  const text = value => typeof value === 'string' ? value.trim() : '';
  return { streamUrl: text(data?.streamUrl), backupStreamUrl: text(data?.backupStreamUrl),
    active: data?.isActive !== false, deleting: Boolean(data?.adminDeletionToken) };
}
export async function commitHealthUnit(db, root, lease, { id, identity, evaluate, now = Date.now, deadline = Infinity }) {
  if (!validContentId(id)) fail();
  const progress = reference(db, root), station = db.doc(`${root}/stations/stations/${id}`);
  return db.runTransaction(async tx => {
    const [checkpoint, current] = await Promise.all([tx.get(progress), tx.get(station)]);
    owned(checkpoint, lease, now());
    const fresh = current.exists ? current.data() : null;
    const matches = fresh && JSON.stringify(streamIdentity(fresh)) === JSON.stringify(identity);
    const mutation = matches && identity.active && !identity.deleting && identity.streamUrl ? evaluate(fresh) : null;
    withinBudget(now, deadline);
    if (mutation) tx.update(station, mutation.payload);
    tx.update(progress, { cursor: id });
    return { skipped: !matches || !identity.active || identity.deleting || !identity.streamUrl, mutation, cursor: id };
  });
}
export async function releaseHealthLease(db, root, lease, { complete = false, now = Date.now, deadline = Infinity } = {}) {
  const ref = reference(db, root);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref), value = owned(snapshot, lease, now());
    const next = { ...value, ...(complete ? { cursor: null, cycle: value.cycle + 1 } : {}), leaseUntil: 0 };
    validate(next); withinBudget(now, deadline); tx.set(ref, next); return next;
  });
}
