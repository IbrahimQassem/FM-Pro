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

// R01 regressions use the existing callable boundary and synthetic metadata only.
const stationPrivateKeys = 'owner address contactPerson contactPhone contactEmail streamType audioCodec bitrateKbps sampleRateHz transmitterPower transmitterLocation coverageArea rds'.split(' ');
const syntheticPrivate = Object.fromEntries(stationPrivateKeys.map(key => [key,
  key === 'contactEmail' ? 'privacy-fixture@example.test' : `fixture-${key}`]));
const stationContent = () => ({ ...validContent('stations'), locationType: 'governorate' });
const superActor = { callerRole: 'super_admin', callerClaims: { role: 'super_admin' } };

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  const locationId = 'location-fixture';
  const publicPath = `${root}/stations/stations/target`;
  const privatePath = `${root}/stationPrivate/stations/target`;
  const parents = { [`${root}/locations/locations/${locationId}`]: fixtures.locations };
  for (const operation of ['create', 'update']) {
    const existing = operation === 'create' ? undefined : { name: 'Before', locationType: 'governorate' };
    const saveStation = async () => {
      const f = fixture(root, 'stations', existing, parents);
      await f.save({}, { ...superActor, data: { root, kind: 'stations', id: 'target', locationId,
        content: { ...stationContent(), ...syntheticPrivate, name: 'After' },
        expectedPrivateRevision: null, expected: existing ? editableContent('stations', { ...stationContent(), title: 'Existing', ...existing }) : null } });
      return f;
    };
    test(`${root}: R01 station ${operation} excludes every private field from its public write`, async () => {
      const f = await saveStation();
      const publicWrite = f.written.find(write => write.path === publicPath);
      assert.ok(publicWrite, 'Station save must retain its public write');
      assert.equal(publicWrite.data.streamUrl, stationContent().streamUrl);
      assert.deepEqual(stationPrivateKeys.filter(key => Object.hasOwn(publicWrite.data, key)), [],
        'Private keys must not be stored in the publicly readable station');
    });
    test(`${root}: R01 station ${operation} retains private fields in the same transaction`, async () => {
      const f = await saveStation();
      const privateWrite = f.written.find(write => write.path === privatePath);
      assert.ok(privateWrite, 'The save transaction must write the separate private station document');
      assert.deepEqual(stationPrivateKeys.filter(key => privateWrite.data[key] !== syntheticPrivate[key]), [],
        'All supplied private fields must be retained privately');
      assert.equal(f.written.filter(write => write.path.includes('/auditLogs/')).length, 1);
    });
  }
  test(`${root}: R01 stale station save rejects before public or private writes`, async () => {
    const f = fixture(root, 'stations', { name: 'Concurrent change', locationType: 'governorate' }, parents);
    await assert.rejects(f.save({}, { ...superActor, data: { root, kind: 'stations', id: 'target', locationId,
      content: { ...stationContent(), name: 'Requested edit', ...syntheticPrivate },
      expected: { ...stationContent(), name: 'Stale editor' } } }), { code: 'failed-precondition' });
    assert.equal(f.written.length, 0);
  });
  test(`${root}: R01 public-only older station edit does not erase existing private metadata`, async () => {
    const existing = { ...stationContent(), name: 'Before' };
    for (const key of stationPrivateKeys) delete existing[key];
    const f = fixture(root, 'stations', { ...existing, ...syntheticPrivate }, { ...parents, [privatePath]: { ...syntheticPrivate, schemaVersion: 1, revision: 1 } });
    const content = { ...existing, name: 'Public edit' };
    await f.save({}, { ...superActor, data: { root, kind: 'stations', id: 'target', locationId,
      content, expected: editableContent('stations', { ...stationContent(), ...existing }) } });
    const privateWrites = f.written.filter(write => write.path === privatePath);
    for (const write of privateWrites) {
      assert.equal(Boolean(write.deleted), false, 'Omission must not delete private metadata');
      assert.deepEqual(stationPrivateKeys.filter(key => Object.hasOwn(write.data, key) && write.data[key] !== syntheticPrivate[key]), [],
        'Omitted private values must remain unchanged');
      assert.equal(write.options?.merge, true, 'An omission update must not replace the private document');
    }
  });
  test(`${root}: legacy station missing locationType and isNational heals and saves successfully`, async () => {
    const existing = { ...stationContent(), name: 'Legacy Station' };
    delete existing.locationType;
    delete existing.isNational;
    const f = fixture(root, 'stations', existing, parents);
    const content = { ...existing, name: 'Updated Legacy Station' };
    const result = await f.save({}, {
      ...superActor,
      data: {
        root,
        kind: 'stations',
        id: 'target',
        locationId,
        content,
        expected: existing,
      },
    });
    assert.equal(result.action, 'update');
  });
}

function transactionalStation(root, initialPublic, initialPrivate, rejectCommit = false) {
  const publicPath = `${root}/stations/stations/target`;
  const privatePath = `${root}/stationPrivate/stations/target`;
  const records = new Map([[`${root}/locations/locations/location-fixture`, fixtures.locations]]);
  if (initialPublic) records.set(publicPath, initialPublic);
  if (initialPrivate) records.set(privatePath, initialPrivate);
  let commits = 0;
  const firestore = {
    doc: path => ({ path }),
    runTransaction: async callback => {
      const pending = [];
      await callback({
        get: async ref => {
          assert.equal(pending.length, 0, 'All transaction reads must precede writes');
          return { exists: records.has(ref.path), data: () => records.get(ref.path), ref };
        },
        set: (ref, data, options) => pending.push({ path: ref.path, data, merge: options?.merge }),
        update: (ref, data) => pending.push({ path: ref.path, data, merge: true }),
      });
      if (rejectCommit) throw new Error('synthetic transaction rejection');
      if (pending.length) commits++;
      for (const write of pending) records.set(write.path, write.merge ? { ...records.get(write.path), ...write.data } : write.data);
    },
  };
  return { records, publicPath, privatePath, commits: () => commits,
    save: data => saveAdminContent({ firestore, callerUid: 'synthetic-admin', ...superActor,
      data: { root, kind: 'stations', id: 'target', locationId: 'location-fixture', ...data } }) };
}
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  const publicOnly = Object.fromEntries(Object.entries(stationContent()).filter(([key]) => !stationPrivateKeys.includes(key)));
  const current = { ...publicOnly, healthStatus: 'healthy', stats: { programsCount: 7 }, adminRelationRevision: 9 };
  const privateValue = { ...syntheticPrivate, schemaVersion: 1, revision: 3 };
  test(`${root}: R01 private-only change preserves operational public state and exact retry is idempotent`, async () => {
    const f = transactionalStation(root, current, privateValue);
    const request = { content: { ...publicOnly, owner: 'changed-owner' }, expected: publicOnly, expectedPrivateRevision: 3 };
    assert.equal((await f.save(request)).action, 'update');
    assert.equal(f.records.get(f.privatePath).revision, 4);
    assert.deepEqual(f.records.get(f.publicPath).stats, current.stats);
    assert.equal(f.records.get(f.publicPath).healthStatus, 'healthy');
    assert.equal(f.records.get(f.publicPath).adminRelationRevision, 9);
    assert.equal((await f.save(request)).action, 'unchanged');
    assert.equal(f.commits(), 1);
    assert.equal(f.records.get(f.privatePath).revision, 4);
  });
  test(`${root}: R01 stale private mutation cannot hide behind unchanged public fields`, async () => {
    const f = transactionalStation(root, current, privateValue);
    await assert.rejects(f.save({ content: { ...publicOnly, owner: 'stale-edit' }, expected: publicOnly, expectedPrivateRevision: 2 }), { code: 'failed-precondition' });
    assert.equal(f.commits(), 0);
    assert.deepEqual(f.records.get(f.privatePath), privateValue);
  });
  test(`${root}: R01 transaction rejection changes neither public nor private document`, async () => {
    const f = transactionalStation(root, current, privateValue, true);
    await assert.rejects(f.save({ content: { ...publicOnly, name: 'Public change', owner: 'Private change' }, expected: publicOnly, expectedPrivateRevision: 3 }), /synthetic transaction rejection/);
    assert.deepEqual(f.records.get(f.publicPath), current);
    assert.deepEqual(f.records.get(f.privatePath), privateValue);
    assert.equal(f.commits(), 0);
  });
  test(`${root}: R01 unchanged legacy fields are scrubbed and retained privately before returning unchanged`, async () => {
    const legacy = { ...current, ...syntheticPrivate };
    const f = transactionalStation(root, legacy, null);
    const request = { content: { ...publicOnly, ...syntheticPrivate }, expected: { ...publicOnly, ...syntheticPrivate } };
    assert.equal((await f.save(request)).action, 'update');
    assert.deepEqual(stationPrivateKeys.filter(key => Object.hasOwn(f.records.get(f.publicPath), key)), []);
    assert.equal(f.records.get(f.privatePath).revision, 1);
    assert.equal((await f.save(request)).action, 'unchanged');
    assert.equal(f.commits(), 1);
  });
}

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const role of ['station_admin', 'moderator']) {
    test(`${root}: R01 ${role} cannot submit mixed station-private edits even with assigned station claims`, async () => {
      const f = fixture(root, 'stations', { locationType: 'governorate' });
      await assert.rejects(f.save({}, { callerRole: role, callerClaims: { role, admin: true, assignedStations: ['target'] },
        data: { root, kind: 'stations', id: 'target', content: { ...stationContent(), ...syntheticPrivate }, expected: null, expectedPrivateRevision: null } }), { code: 'permission-denied' });
      assert.equal(f.written.length, 0);
    });
  }
}

test('active episode creation installs its real empty count baseline in the same native commit', async () => {
  const { MemoryFirestore, FieldValue } = await import('./support/comment-count-fixture.js');
  const db = new MemoryFirestore(), root = 'HudHudDev';
  db.seed(`${root}/commentCountContributions`, { version: 1, writerProtocol: 1, state: 'active', generation: 4, owner: 'unit',
    planHash: 'a'.repeat(64), leaseUntil: 0, activeFrom: FieldValue.serverTimestamp(), baselineManifestHash: 'b'.repeat(64) });
  db.seed(`${root}/stations/stations/station-a`, { isActive: true });
  db.seed(`${root}/programs/programs/program-a`, { stationId: 'station-a', stats: { episodesCount: 0 } });
  await saveAdminContent({ firestore: db, callerUid: 'super', callerRole: 'super_admin', callerClaims: { role: 'super_admin' },
    data: { root, kind: 'episodes', id: 'native-episode', expected: null, content: validContent('episodes') } });
  const episode = db.snapshot(`${root}/episodes/episodes/native-episode`), baseline = db.snapshot(`${root}/commentCountContributions/episodes/native-episode`);
  assert.equal(episode.get('stats.commentsCount'), 0); assert.equal(episode.createTime.isEqual(baseline.updateTime), true);
});
for (const kind of ['episodes', 'programs']) test(`paused root blocks authorized ${kind} mutation before any public or private write`, async () => {
  const { MemoryFirestore } = await import('./support/comment-count-fixture.js'); const db = new MemoryFirestore(), root = 'HudHudDev';
  db.seed(`${root}/commentCountContributions`, { version: 1, writerProtocol: 1, state: 'paused', generation: 4, owner: 'unit', planHash: 'a'.repeat(64), leaseUntil: 0 });
  const before = { ...validContent(kind), title: 'Before', stats: kind === 'programs' ? { episodesCount: 0 } : { commentsCount: 0 } };
  db.seed(`${root}/${kind}/${kind}/target`, before);
  await assert.rejects(saveAdminContent({ firestore: db, callerUid: 'super', callerRole: 'super_admin', callerClaims: { role: 'super_admin' },
    data: { root, kind, id: 'target', expected: editableContent(kind, before), content: { ...editableContent(kind, before),
      ...(kind === 'programs' ? { stationId: 'station-b' } : { title: 'After' }) } } }), error => error.retryable && error.details.reason === 'comment-count-maintenance');
  assert.equal(db.writes.length, 0);
});
