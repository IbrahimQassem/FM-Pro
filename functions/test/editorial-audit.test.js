import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordEditorialAuditLog, saveAdminContent } from '../lib/editorial-audit.js';

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

test('saveAdminContent on create sets createdBy, createdByName and atomic audit log', async () => {
  const written = [];
  const mockTx = {
    get: async () => ({ exists: false }),
    set: (ref, data, opts) => {
      written.push({ path: ref.path, data, opts });
    },
  };
  const mockFirestore = {
    doc: path => ({ path }),
    runTransaction: async fn => fn(mockTx),
  };

  const result = await saveAdminContent({
    firestore: mockFirestore,
    callerUid: 'super-admin-uid',
    callerEmail: 'super@hudhud.fm',
    callerRole: 'super_admin',
    callerClaims: { role: 'super_admin', displayName: 'Super User' },
    data: {
      root: 'HudHudDev',
      kind: 'stations',
      id: 'st-1',
      content: { name: 'محطة التجربة', cityNameAr: 'صنعاء' },
    },
  });

  assert.equal(result.action, 'create');
  assert.equal(written.length, 2);

  // Document write
  const docWrite = written.find(w => w.path === 'HudHudDev/stations/stations/st-1');
  assert.ok(docWrite);
  assert.equal(docWrite.data.name, 'محطة التجربة');
  assert.equal(docWrite.data.createdBy, 'super-admin-uid');
  assert.equal(docWrite.data.createdByName, 'Super User');
  assert.equal(docWrite.data.updatedBy, 'super-admin-uid');
  assert.equal(docWrite.data.updatedByName, 'Super User');

  // Audit log write
  const auditWrite = written.find(w => w.path.startsWith('HudHudDev/auditLogs/auditLogs/'));
  assert.ok(auditWrite);
  assert.equal(auditWrite.data.action, 'create');
  assert.equal(auditWrite.data.targetId, 'st-1');
  assert.equal(auditWrite.data.actorUid, 'super-admin-uid');
});

test('saveAdminContent on update preserves createdBy and updates updatedBy atomically', async () => {
  const written = [];
  const mockTx = {
    get: async () => ({
      exists: true,
      data: () => ({
        name: 'اسم قديم',
        createdBy: 'original-creator',
        createdByName: 'Original User',
        createdAt: '2026-01-01T00:00:00Z',
      }),
    }),
    set: (ref, data, opts) => {
      written.push({ path: ref.path, data, opts });
    },
  };
  const mockFirestore = {
    doc: path => ({ path }),
    runTransaction: async fn => fn(mockTx),
  };

  const result = await saveAdminContent({
    firestore: mockFirestore,
    callerUid: 'editor-uid',
    callerEmail: 'editor@hudhud.fm',
    callerRole: 'super_admin',
    callerClaims: { role: 'super_admin', displayName: 'Editor User' },
    data: {
      root: 'HudHudDev',
      kind: 'stations',
      id: 'st-1',
      content: { name: 'اسم جديد' },
    },
  });

  assert.equal(result.action, 'update');
  assert.equal(written.length, 2);

  const docWrite = written.find(w => w.path === 'HudHudDev/stations/stations/st-1');
  assert.ok(docWrite);
  assert.equal(docWrite.data.name, 'اسم جديد');
  // Created fields MUST be preserved from original
  assert.equal(docWrite.data.createdBy, 'original-creator');
  assert.equal(docWrite.data.createdByName, 'Original User');
  assert.equal(docWrite.data.createdAt, '2026-01-01T00:00:00Z');
  // Updated fields MUST reflect the new editor
  assert.equal(docWrite.data.updatedBy, 'editor-uid');
  assert.equal(docWrite.data.updatedByName, 'Editor User');
});
