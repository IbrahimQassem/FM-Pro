import { readFile } from 'node:fs/promises';
import { editableContent } from '../lib/admin-content.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordEditorialAuditLog, saveAdminContent } from '../lib/editorial-audit.js';

const fixtures = JSON.parse(await readFile(new URL('../../test/fixtures/admin-content-contract.json', import.meta.url), 'utf8'));
function validContent(kind) {
  const { stats, ...value } = fixtures[kind];
  return { ...value, ...(kind === 'programs' || kind === 'episodes' ? { stationId: 'station-a' } : {}),
    ...(kind === 'episodes' ? { programId: 'program-a' } : {}) };
}
function fixture(root, kind, value, parents = {}) {
  const existing = value === undefined ? undefined : { ...validContent(kind), title: 'Existing', ...value };
  const written = [];
  const firestore = {
    doc: path => ({ path }),
    collection: () => ({ query: true, where() { return this; }, limit() { return this; } }),
    runTransaction: async fn => fn({
      get: async ref => {
        if (ref.query) return { docs: [], size: 0 };
        const value = ref.path === `${root}/${kind}/${kind}/target` ? existing : parents[ref.path];
        return { exists: value !== undefined, data: () => value, ref,
          get: field => field.split('.').reduce((item, key) => item?.[key], value) };
      },
      set: (ref, data, options) => written.push({ path: ref.path, data, options }),
      update: (ref, data) => written.push({ path: ref.path, data }),
      delete: ref => written.push({ path: ref.path, deleted: true }),
    }),
  };
  return {
    written,
    save: (content, extra = {}) => saveAdminContent({
      firestore, callerUid: 'admin-a', callerRole: 'station_admin',
      callerClaims: { role: 'station_admin', assignedStations: ['station-a'] },
      data: { root, kind, id: 'target', content: { ...validContent(kind), ...content }, expected: existing ? editableContent(kind, existing) : null }, ...extra,
    }),
  };
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  const parents = {
    [`${root}/stations/stations/station-a`]: { name: 'Station A' },
    [`${root}/stations/stations/station-b`]: { name: 'Station B' },
    [`${root}/programs/programs/program-a`]: { stationId: 'station-a' },
    [`${root}/programs/programs/program-b`]: { stationId: 'station-b' },
  };
  for (const kind of ['programs', 'episodes']) {
    const content = { stationId: 'station-a', title: 'Edited',
      ...(kind === 'episodes' ? { programId: 'program-a' } : {}) };
    test(`${root}: ${kind} rejects taking over another station's existing ID`, async () => {
      const f = fixture(root, kind, { stationId: 'station-b' }, parents);
      await assert.rejects(f.save(content), { code: 'permission-denied' });
      assert.equal(f.written.length, 0);
    });
    test(`${root}: ${kind} permits an own-station edit with valid parent`, async () => {
      const f = fixture(root, kind, { stationId: 'station-a' }, parents);
      await f.save(content);
      assert.equal(f.written.length, 3);
    });
    test(`${root}: ${kind} rejects listener claims with station assignments`, async () => {
      const f = fixture(root, kind, undefined, parents);
      await assert.rejects(f.save(content, {
        callerRole: 'listener', callerClaims: { assignedStations: ['station-a'], allStations: true },
      }), { code: 'permission-denied' });
      assert.equal(f.written.length, 0);
    });
    test(`${root}: ${kind} rejects missing parent and deletion in progress`, async () => {
      const missing = fixture(root, kind, undefined);
      await assert.rejects(missing.save(content), { code: 'failed-precondition' });
      const deleting = fixture(root, kind, { stationId: 'station-a', adminDeletionToken: 'deleting' }, parents);
      await assert.rejects(deleting.save(content), { code: 'failed-precondition' });
      assert.equal(deleting.written.length, 0);
    });
  }
  test(`${root}: episode cannot claim a station different from its program`, async () => {
    const f = fixture(root, 'episodes', undefined, parents);
    await assert.rejects(f.save({ stationId: 'station-a', programId: 'program-b', title: 'Episode' }),
      { code: 'failed-precondition' });
    assert.equal(f.written.length, 0);
  });
  test(`${root}: rejects operational and forged attribution fields`, async () => {
    for (const key of ['createdBy', 'createdByName', 'createdAt', 'updatedBy', 'stats', 'adminDeletionToken', 'healthStatus']) {
      const f = fixture(root, 'programs', undefined, parents);
      await assert.rejects(f.save({ stationId: 'station-a', title: 'Program', [key]: 'forged' }),
        { code: 'invalid-argument' });
      assert.equal(f.written.length, 0);
    }
  });
  test(`${root}: rejects path-valued parent IDs`, async () => {
    const f = fixture(root, 'programs', undefined, parents);
    await assert.rejects(f.save({ stationId: '../station-a', title: 'Program' }), { code: 'invalid-argument' });
  });
}

test('recordEditorialAuditLog creates audit log record with actor details and timestamp', async () => {
  const written = [];
  const mockTx = {
    set: (ref, data) => {
      written.push({ path: ref.path, data });
    },
  };
  const mockFirestore = {
    doc: path => ({ path }),
  };

  const logId = await recordEditorialAuditLog(mockTx, mockFirestore, {
    root: 'HudHudDev',
    targetKind: 'stations',
    targetId: 'st-sanaa',
    targetTitle: 'إذاعة صنعاء',
    action: 'create',
    actorUid: 'admin-123',
    actorEmail: 'admin@hudhud.fm',
    summary: 'Created station st-sanaa',
  });

  assert.ok(logId);
  assert.equal(written.length, 1);
  assert.ok(written[0].path.startsWith('HudHudDev/auditLogs/auditLogs/'));
  assert.equal(written[0].data.targetKind, 'stations');
  assert.equal(written[0].data.targetId, 'st-sanaa');
  assert.equal(written[0].data.targetTitle, 'إذاعة صنعاء');
  assert.equal(written[0].data.action, 'create');
  assert.equal(written[0].data.actorUid, 'admin-123');
  assert.equal(written[0].data.actorEmail, 'admin@hudhud.fm');
});

test('saveAdminContent rejects unauthorized callers for restricted kinds', async () => {
  const mockFirestore = { doc: path => ({ path }) };

  // station_admin cannot manage stations
  await assert.rejects(
    saveAdminContent({
      firestore: mockFirestore,
      callerUid: 'station-admin-uid',
      callerEmail: 'sta@hudhud.fm',
      callerRole: 'station_admin',
      callerClaims: { role: 'station_admin' },
      data: { root: 'HudHudDev', kind: 'stations', id: 's1', content: { name: 'S1' } },
    }),
    { code: 'permission-denied' },
  );

  // station_admin cannot manage unauthorized station programs
  await assert.rejects(
    saveAdminContent({
      firestore: mockFirestore,
      callerUid: 'station-admin-uid',
      callerEmail: 'sta@hudhud.fm',
      callerRole: 'station_admin',
      callerClaims: { role: 'station_admin', assignedStations: ['other-station'] },
      data: { root: 'HudHudDev', kind: 'programs', id: 'p1', content: { title: 'P1', stationId: 's1' } },
    }),
    { code: 'permission-denied' },
  );
});

test('trusted create stamps attribution from caller claims and commits its audit', async () => {
  const f = fixture('HudHudDev', 'banners', undefined);
  const result = await f.save({ title: 'New banner' }, { callerRole: 'super_admin', callerClaims: { role: 'super_admin', displayName: 'Trusted editor' } });
  assert.equal(result.action, 'create');
  const document = f.written.find(item => item.path.endsWith('/banners/banners/target'));
  assert.equal(document.data.createdBy, 'admin-a');
  assert.equal(document.data.createdByName, 'Trusted editor');
  assert.equal(document.data.updatedBy, 'admin-a');
  assert.equal(f.written.length, 2);
});

test('trusted update merges without replacing original creation or backend fields', async () => {
  const f = fixture('HudHudDev', 'banners', { createdBy: 'original-creator', createdAt: 'original-time', serverOnly: 'retained' });
  const result = await f.save({ title: 'Updated banner' }, { callerRole: 'super_admin', callerClaims: { role: 'super_admin' } });
  assert.equal(result.action, 'update');
  const document = f.written.find(item => item.path.endsWith('/banners/banners/target'));
  assert.equal(document.data.updatedBy, 'admin-a');
  assert.equal('createdBy' in document.data, false);
  assert.equal('createdAt' in document.data, false);
  assert.equal('serverOnly' in document.data, false);
  assert.equal(document.options.merge, true);
  assert.equal(f.written.length, 2);
});
