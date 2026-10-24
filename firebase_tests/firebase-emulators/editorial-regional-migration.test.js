import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureCleanupBackup } from '../../tool/remove_old_locations.mjs';
import { runRegionalMigration } from '../../tool/migrate_regional_location.mjs';
import { saveAdminContent } from '../../functions/lib/editorial-audit.js';
const require = createRequire(
  new URL('../../functions/package.json', import.meta.url),
);
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const projectId = 'demo-hudhud-editorial';
let app, db, directory;
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  app = initializeApp({ projectId });
  db = getFirestore(app);
  directory = await mkdtemp(join(tmpdir(), 'hudhud-regional-tests-'));
});
after(async () => {
  await deleteApp(app);
  await rm(directory, { recursive: true, force: true });
});
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: regional preview, atomic apply/retry, trusted edit and safe restore`, async () => {
    const reference = db.doc(`${root}/locations/locations/global-ar`);
    const station = db.doc(`${root}/stations/stations/regional-fixture`);
    const old = {
      cityCode: 'global-ar',
      cityNameAr: 'عربي',
      countryCode: 'YE',
      countryNameAr: 'اليمن',
      locationType: 'governorate',
    };
    await reference.set({ ...old, isActive: true, sortOrder: 230 });
    await station.set({
      ...old,
      name: 'Synthetic regional station',
      streamUrl: '',
      isActive: true,
      isFeatured: false,
      isVerified: false,
      isLive: false,
      isNational: false,
      priority: 0,
      stats: { programsCount: 0 },
    });
    const options = {
      projectId,
      root,
      reportPath: join(directory, `${root}.json`),
      backupPath: join(directory, `${root}.backup.json`),
    };
    const preview = await runRegionalMigration(options, db);
    assert.equal(preview.changed, 0);
    assert.equal(preview.count, 1);
    assert.equal((await station.get()).get('countryCode'), 'YE');
    await assert.rejects(
      runRegionalMigration(
        { ...options, projectId: 'demo-wrong', mode: 'apply' },
        db,
      ),
      /project/,
    );
    await writeFile(options.backupPath, 'incorrect');
    await assert.rejects(
      runRegionalMigration({ ...options, mode: 'apply' }, db),
      /Backup mismatch/,
    );
    assert.equal((await reference.get()).get('countryCode'), 'YE');
    await rm(options.backupPath);
    await ensureCleanupBackup(options.backupPath, preview.report);
    const concurrent = await Promise.all([
      runRegionalMigration({ ...options, mode: 'apply' }, db),
      runRegionalMigration({ ...options, mode: 'apply' }, db),
    ]);
    assert.deepEqual(concurrent.map((item) => item.changed).sort(), [0, 2]);
    assert.equal(
      (await runRegionalMigration({ ...options, mode: 'apply' }, db)).changed,
      0,
    );
    assert.equal((await reference.get()).get('locationType'), 'regional');
    assert.equal((await station.get()).get('countryCode'), 'ARAB');
    assert.equal(
      (
        await db
          .collection(`${root}/auditLogs/auditLogs`)
          .where('targetId', '==', 'global-ar')
          .where('action', '==', 'regional-migration')
          .get()
      ).size,
      1,
    );
    // The normal trusted writer must accept and preserve the region after migration.
    const current = (await station.get()).data();
    const editable = (
      await import('../../functions/lib/admin-content.js')
    ).editableContent('stations', current);
    await saveAdminContent({
      firestore: db,
      callerUid: 'synthetic-super',
      callerRole: 'super_admin',
      data: {
        root,
        kind: 'stations',
        id: station.id,
        locationId: reference.id,
        content: editable,
        expected: editable,
      },
    });
    await station.update({ countryCode: 'YE' });
    await assert.rejects(
      runRegionalMigration({ ...options, mode: 'restore' }, db),
      /source changed/,
    );
    await station.update({
      countryCode: 'ARAB',
      description: 'Keep unrelated editorial changes',
    });
    assert.equal(
      (await runRegionalMigration({ ...options, mode: 'restore' }, db)).changed,
      2,
    );
    assert.equal(
      (await station.get()).get('description'),
      'Keep unrelated editorial changes',
    );
    assert.equal((await reference.get()).get('countryCode'), 'YE');
    assert.equal(
      (await runRegionalMigration({ ...options, mode: 'restore' }, db)).changed,
      0,
    );
  });
}
test('regional apply refuses stale previews and duplicate references before mutations', async () => {
  const root = 'HudHudDev';
  const reference = db.doc(`${root}/locations/locations/global-ar`);
  const options = {
    projectId,
    root,
    reportPath: join(directory, 'stale.json'),
    backupPath: join(directory, 'stale.backup.json'),
  };
  await runRegionalMigration(options, db);
  await reference.update({ cityNameAr: 'Changed after preview' });
  await assert.rejects(
    runRegionalMigration({ ...options, mode: 'apply' }, db),
    /source changed/,
  );
  const duplicate = db.doc(`${root}/locations/locations/duplicate-regional`);
  await duplicate.set({ cityCode: 'global-ar' });
  await assert.rejects(
    runRegionalMigration({ ...options, reportPath: undefined }, db),
    /ambiguous/,
  );
  await duplicate.delete();
});

test('regional scope is bounded and an audit failure rolls back every projection', async () => {
  const root = 'HudHudDev';
  const options = {
    projectId,
    root,
    reportPath: join(directory, 'atomic.json'),
    backupPath: join(directory, 'atomic.backup.json'),
  };
  const preview = await runRegionalMigration(options, db);
  const rejecting = {
    projectId,
    doc: db.doc.bind(db),
    collection: db.collection.bind(db),
    runTransaction: (callback) =>
      db.runTransaction((tx) =>
        callback(
          new Proxy(tx, {
            get: (object, key) =>
              key === 'create'
                ? () => {
                    throw new Error('Synthetic audit failure');
                  }
                : typeof object[key] === 'function'
                  ? object[key].bind(object)
                  : object[key],
          }),
        ),
      ),
  };
  await assert.rejects(
    runRegionalMigration({ ...options, mode: 'apply' }, rejecting),
    /audit failure/,
  );
  assert.equal(
    (await db.doc(`${root}/locations/locations/global-ar`).get()).get(
      'countryCode',
    ),
    'YE',
  );
  assert.equal(
    (
      await db
        .doc(`${root}/regionalMigrations/runs/${preview.report.runId}`)
        .get()
    ).exists,
    false,
  );
  const batch = db.batch();
  for (let i = 0; i < 450; i++)
    batch.create(db.doc(`${root}/stations/stations/regional-bound-${i}`), {
      countryCode: 'YE',
      cityCode: 'global-ar',
    });
  await batch.commit();
  await assert.rejects(
    runRegionalMigration({ ...options, reportPath: undefined }, db),
    /exceeds450/,
  );
});
