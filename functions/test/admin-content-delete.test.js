import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Timestamp } from 'firebase-admin/firestore';
import { deleteAdminContent, deletionSnapshot } from '../lib/admin-content-delete.js';

test('deletion snapshot preserves timestamps, backend data and counters while ignoring an interrupted fence', () => {
  const value = { title: 'Example', stats: { commentsCount: 0 }, createdAt: Timestamp.fromMillis(123000), adminDeletionToken: 'old-attempt', serverOnly: 'keep' };
  const expected = { title: 'Example', createdAt: '1970-01-01T00:02:03.000Z', stats: { commentsCount: 0 }, serverOnly: 'keep' };
  assert.equal(deletionSnapshot(value), deletionSnapshot(expected));
  assert.notEqual(deletionSnapshot(value), deletionSnapshot({ ...expected, stats: { commentsCount: 1 } }));
});
test('deletion rejects invalid roots, paths, kinds and non-admin callers before touching storage', async () => {
  const firestore = { doc: () => assert.fail('Invalid request reached storage') };
  const base = { firestore, callerUid: 'admin', callerRole: 'super_admin', callerClaims: { role: 'super_admin' }, data: { root: 'HudHudDev', kind: 'episodes', id: 'e', expected: {} } };
  for (const data of [{ ...base.data, root: 'Unknown' }, { ...base.data, id: '../e' }, { ...base.data, kind: 'users' }, { ...base.data, expected: null }]) {
    await assert.rejects(deleteAdminContent({ ...base, data }), { code: 'invalid-argument' });
  }
  await assert.rejects(deleteAdminContent({ ...base, callerRole: 'listener', callerClaims: { role: 'listener', allStations: true } }), { code: 'permission-denied' });
  await assert.rejects(deleteAdminContent({ ...base, callerUid: '' }), { code: 'unauthenticated' });
});

test('plain coordinate maps retain extra fields in deletion preconditions', () => {
  assert.notEqual(deletionSnapshot({ coordinates: { latitude: 1, longitude: 2, label: 'before' } }),
    deletionSnapshot({ coordinates: { latitude: 1, longitude: 2, label: 'after' } }));
});

test('a station admin must own the real episode parent before any deletion-fence write', async () => {
  const root = 'HudHudDev';
  const expected = { stationId: 'station-a', programId: 'program-b', title: 'Inconsistent legacy episode' };
  const stored = { ...expected };
  let writes = 0;
  const db = {
    doc: path => ({ path, collection: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) }) }),
    runTransaction: fn => fn({
      get: async ref => ({ exists: true, ref, data: () => ref.path.includes('/programs/')
        ? { stationId: 'station-b', stats: { episodesCount: 1 } } : stored }),
      update: (_ref, data) => { writes++; Object.assign(stored, data); },
    }),
  };
  await assert.rejects(deleteAdminContent({ firestore: db, callerUid: 'admin-a', callerRole: 'station_admin',
    callerClaims: { role: 'station_admin', assignedStations: ['station-a'] },
    data: { root, kind: 'episodes', id: 'e', expected } }), { code: 'permission-denied' });
  assert.equal(writes, 0);
});
