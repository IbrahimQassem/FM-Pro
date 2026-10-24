import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createRequire } from 'node:module';
import { saveAdminContent } from '../../functions/lib/editorial-audit.js';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
let app, db;
before(() => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator required');
  app = initializeApp({ projectId: 'demo-hudhud-editorial' });
  db = getFirestore(app);
});
after(async () => { if (app) await deleteApp(app); });

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: rejects takeover atomically and allows an audited own-station edit`, async () => {
    const stationPath = `${root}/stations/stations`;
    await db.doc(`${stationPath}/station-a`).set({ name: 'Synthetic A' });
    await db.doc(`${stationPath}/station-b`).set({ name: 'Synthetic B' });
    const program = db.doc(`${root}/programs/programs/target`);
    await program.set({ title: 'Original', stationId: 'station-b' });
    const args = {
      firestore: db, callerUid: 'synthetic-admin-a', callerRole: 'station_admin',
      callerClaims: { role: 'station_admin', assignedStations: ['station-a'] },
      data: { root, kind: 'programs', id: 'target', content: { stationId: 'station-a', title: 'Edited' } },
    };
    await assert.rejects(saveAdminContent(args), { code: 'permission-denied' });
    assert.equal((await program.get()).get('title'), 'Original');
    assert.equal((await db.collection(`${root}/auditLogs/auditLogs`).get()).size, 0);

    await program.set({ title: 'Own program', stationId: 'station-a' });
    await saveAdminContent(args);
    assert.equal((await program.get()).get('title'), 'Edited');
    const audit = await db.collection(`${root}/auditLogs/auditLogs`).get();
    assert.equal(audit.size, 1);
    assert.equal(audit.docs[0].get('actorUid'), 'synthetic-admin-a');
    assert.equal(audit.docs[0].get('action'), 'update');
  });
  test(`${root}: invalid episode parent causes no content or audit writes`, async () => {
    const before = (await db.collection(`${root}/auditLogs/auditLogs`).get()).size;
    await assert.rejects(saveAdminContent({
      firestore: db, callerUid: 'synthetic-super', callerRole: 'super_admin',
      callerClaims: { role: 'super_admin' },
      data: { root, kind: 'episodes', id: 'bad-parent',
        content: { title: 'Synthetic episode', stationId: 'station-a', programId: 'absent' } },
    }), { code: 'failed-precondition' });
    assert.equal((await db.doc(`${root}/episodes/episodes/bad-parent`).get()).exists, false);
    assert.equal((await db.collection(`${root}/auditLogs/auditLogs`).get()).size, before);
  });
}
