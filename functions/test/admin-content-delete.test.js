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

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: R01 eligible station deletion removes private metadata atomically`, async () => {
    const publicPath = `${root}/stations/stations/target`;
    const privatePath = `${root}/stationPrivate/stations/target`;
    const expected = { name: 'Synthetic station', stats: { programsCount: 0 } };
    const documents = new Map([[publicPath, expected], [privatePath, { owner: 'synthetic-owner', schemaVersion: 1, revision: 1 }]]);
    const commits = [];
    const db = {
      doc: path => ({ path }),
      collection: () => ({ query: true, where() { return this; }, limit() { return this; } }),
      runTransaction: async callback => {
        const writes = [];
        await callback({
          get: async ref => ref.query ? { empty: true, docs: [] } : {
            exists: documents.has(ref.path), data: () => documents.get(ref.path), ref,
            get: field => field.split('.').reduce((value, key) => value?.[key], documents.get(ref.path)),
          },
          delete: ref => writes.push({ path: ref.path, deleted: true }),
          set: (ref, data) => writes.push({ path: ref.path, data }),
          update: (ref, data) => writes.push({ path: ref.path, data }),
        });
        commits.push(writes);
      },
    };
    const result = await deleteAdminContent({ firestore: db, callerUid: 'synthetic-admin',
      callerRole: 'super_admin', callerClaims: { role: 'super_admin' },
      data: { root, kind: 'stations', id: 'target', expected, expectedPrivateRevision: 1 } });
    assert.equal(result.action, 'delete');
    assert.equal(commits.length, 1);
    assert.deepEqual(commits[0].filter(write => write.deleted).map(write => write.path).sort(),
      [publicPath, privatePath].sort(), 'Public and private station deletion must share the same transaction');
  });
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const precondition of [undefined, null, 1]) {
    test(`${root}: R01 station deletion rejects unseen or stale private revision ${String(precondition)}`, async () => {
      const expected = { name: 'Synthetic station', stats: { programsCount: 0 } };
      let writes = 0;
      const db = {
        doc: path => ({ path }),
        collection: () => ({ query: true, where() { return this; }, limit() { return this; } }),
        runTransaction: callback => callback({
          get: async ref => ref.query ? { empty: true, docs: [] } : { exists: true, ref,
            data: () => ref.path.includes('/stationPrivate/') ? { owner: 'synthetic-owner', schemaVersion: 1, revision: 2 } : expected },
          set: () => { writes++; }, update: () => { writes++; }, delete: () => { writes++; },
        }),
      };
      await assert.rejects(deleteAdminContent({ firestore: db, callerUid: 'synthetic-admin', callerRole: 'super_admin',
        callerClaims: { role: 'super_admin' }, data: { root, kind: 'stations', id: 'target', expected,
          ...(precondition === undefined ? {} : { expectedPrivateRevision: precondition }) } }), { code: 'failed-precondition' });
      assert.equal(writes, 0);
    });
  }
  test(`${root}: R01 public-absent deletion leaves private orphan untouched`, async () => {
    const db = { doc: path => ({ path }), runTransaction: callback => callback({
      get: async ref => ({ exists: ref.path.includes('/stationPrivate/'), data: () => ({ owner: 'orphan', schemaVersion: 1, revision: 1 }) }),
      delete: () => assert.fail('Orphan metadata must not be deleted'),
      set: () => assert.fail('Public-absent deletion must not write'),
    }) };
    const result = await deleteAdminContent({ firestore: db, callerUid: 'synthetic-admin', callerRole: 'super_admin',
      callerClaims: { role: 'super_admin' }, data: { root, kind: 'stations', id: 'target', expected: { name: 'Missing' } } });
    assert.equal(result.action, 'unchanged');
  });
}
