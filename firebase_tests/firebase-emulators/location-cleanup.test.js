import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCleanup } from '../../tool/remove_old_locations.mjs';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const projectId = 'demo-hudhud-location-cleanup';
let app, db, environment;
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator required');
  app = initializeApp({ projectId }); db = getFirestore(app);
  environment = await initializeTestEnvironment({ projectId, firestore: { rules: await readFile('firestore.rules', 'utf8') } });
});
after(async () => { await environment?.cleanup(); if (app) await deleteApp(app); });

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: cleanup checkpoints are inaccessible to guest, listener and admin clients`, async () => {
    for (const context of [environment.unauthenticatedContext(),
      environment.authenticatedContext('synthetic-listener', { email_verified: true }),
      environment.authenticatedContext('synthetic-admin', { admin: true })]) {
      const reference = doc(context.firestore(), `${root}/locationCleanup/runs/synthetic-run/items/location`);
      await assertFails(getDoc(reference));
      await assertFails(setDoc(reference, { state: 'deleted' }));
    }
  });
  test(`${root}: backup precedes bounded deletion; checkpoints resume and restore preserve values`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'hudhud-cleanup-emulator-'));
    const reportPath = join(directory, 'report.json'), backupPath = join(directory, 'backup.json');
    const options = { projectId, root, reportPath, backupPath, maxItems: 1 };
    const a = db.doc(`${root}/locations/locations/legacy-a`);
    const b = db.doc(`${root}/locations/locations/legacy-b`);
    const original = { cityCode: 'unused-a', cityNameAr: 'تجربة', updatedAt: new Timestamp(123, 456000) };
    await a.set(original); await b.set({ cityCode: 'unused-b' });
    const preview = await runCleanup({ ...options, mode: 'dry-run' }, db);
    assert.equal(preview.changed, 0);
    assert.equal((await a.get()).exists, true);
    await assert.rejects(runCleanup({ ...options, mode: 'apply', backupPath: directory }, db));
    assert.equal((await a.get()).exists, true, 'backup failure must precede deletion');

    const first = await runCleanup({ ...options, mode: 'apply' }, db);
    assert.equal(first.changed, 1); assert.equal((await b.get()).exists, true);
    assert.equal(JSON.parse(await readFile(backupPath, 'utf8')).runId, preview.report.runId);

    // Restore a partial run without treating untouched records as a failure.
    assert.equal((await runCleanup({ ...options, mode: 'restore', maxItems: 25 }, db)).changed, 1);
    assert.equal((await a.get()).get('updatedAt').isEqual(original.updatedAt), true);
    assert.equal((await runCleanup({ ...options, mode: 'restore', maxItems: 25 }, db)).changed, 0);

    const next = { ...options, reportPath: join(directory, 'next.json'), backupPath: join(directory, 'next-backup.json') };
    await runCleanup({ ...next, mode: 'dry-run' }, db);
    assert.equal((await runCleanup({ ...next, mode: 'apply' }, db)).changed, 1);
    assert.equal((await runCleanup({ ...next, mode: 'apply' }, db)).changed, 1);
    assert.equal((await runCleanup({ ...next, mode: 'apply' }, db)).changed, 0);
    assert.equal((await runCleanup({ ...next, mode: 'restore', maxItems: 25 }, db)).changed, 2);
  });
  test(`${root}: location changed or newly referenced after review is retained`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'hudhud-cleanup-race-'));
    const options = { projectId, root, reportPath: join(directory, 'r.json'), backupPath: join(directory, 'b.json') };
    const location = db.doc(`${root}/locations/locations/legacy-a`);
    await runCleanup({ ...options, mode: 'dry-run' }, db);
    await db.doc(`${root}/stations/stations/synthetic-reference`).set({ cityCode: 'unused-a' });
    await assert.rejects(runCleanup({ ...options, mode: 'apply' }, db), /referenced/);
    assert.equal((await location.get()).exists, true);
    await db.doc(`${root}/stations/stations/synthetic-reference`).delete();
    await location.update({ cityNameAr: 'Changed after preview' });
    await assert.rejects(runCleanup({ ...options, mode: 'apply' }, db), /changed since review/);
    assert.equal((await location.get()).exists, true);
  });
}
