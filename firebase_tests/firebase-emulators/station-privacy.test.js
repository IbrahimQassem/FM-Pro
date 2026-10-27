import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { applyPrivacy, createPrivacyDemoFirestore, previewPrivacy, privacyJobPath, PrivatePrivacyBackupStore, restorePrivacy, verifyPrivacy } from '../../tool/migrate_station_privacy.mjs';

const projectId = 'demo-hudhud-station-privacy';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
let db, environment;
before(async () => {
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^127\.0\.0\.1:\d+$/);
  db = createPrivacyDemoFirestore({ projectId, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST });
  environment = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') } });
});
beforeEach(async () => environment.clearFirestore());
after(async () => { await environment?.cleanup(); await db?.terminate(); });
async function rehearsal(root, operation = 'station-private') {
  const directory = await mkdtemp(join(tmpdir(), 'hudhud-privacy-emulator-'));
  const store = await PrivatePrivacyBackupStore.open({ directory, key: randomBytes(32), expiresAt: Date.now() + 7 * 86400000 });
  const input = { firestore: db, projectId, root, operation, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST, backupStore: store, deleteValue: () => FieldValue.delete() };
  const manifest = await previewPrivacy(input); await store.writeVerified(manifest);
  return { input: { ...input, manifest, expectedManifestHash: manifest.hash }, directory, close: () => rm(directory, { recursive: true, force: true }) };
}
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: real transactions preserve persisted timestamp precision, atomically partition, replay and recover safely`, async () => {
    const source = db.doc(`${root}/stations/stations/synthetic-station`);
    const privateRef = db.doc(`${root}/stationPrivate/stations/synthetic-station`);
    const timestamp = new Timestamp(1800000000, 123456789);
    await source.set({ name: 'Synthetic station', owner: 'Synthetic owner', contactEmail: 'synthetic@example.test', stats: { programsCount: 3 }, lastCheckedAt: timestamp });
    // Firestore stores timestamps at microsecond precision. Establish the real
    // persisted preimage before preview/apply rather than comparing unsaved nanos.
    const persistedBefore = await source.get();
    const persistedTimestamp = persistedBefore.get('lastCheckedAt');
    assert.equal(persistedTimestamp.seconds, timestamp.seconds);
    assert.equal(persistedTimestamp.nanoseconds, Math.floor(timestamp.nanoseconds / 1000) * 1000);
    const f = await rehearsal(root);
    assert.equal(f.input.manifest.entries[0].before.source.version,
      `${persistedBefore.updateTime.seconds}:${persistedBefore.updateTime.nanoseconds}`);
    assert.deepEqual(f.input.manifest.entries[0].before.source.data.$map.lastCheckedAt,
      { $timestamp: [persistedTimestamp.seconds, persistedTimestamp.nanoseconds] });
    try {
      assert.equal((await applyPrivacy(f.input)).applied, 1);
      const saved = await source.get();
      assert.equal(Object.hasOwn(saved.data(), 'owner'), false);
      assert.equal(Object.hasOwn(saved.data(), 'contactEmail'), false);
      assert.equal(saved.get('lastCheckedAt').isEqual(persistedTimestamp), true);
      assert.equal(saved.get('stats.programsCount'), 3);
      assert.deepEqual((await privateRef.get()).data(), { owner: 'Synthetic owner', contactEmail: 'synthetic@example.test', schemaVersion: 1, revision: 1 });
      assert.equal((await verifyPrivacy(f.input)).verified, 1);
      assert.equal((await applyPrivacy(f.input)).alreadyApplied, 1);
      assert.equal((await restorePrivacy(f.input)).status, 'privacy-preserved');
      assert.equal((await source.get()).get('owner'), undefined);
      assert.equal((await privateRef.get()).get('owner'), 'Synthetic owner');
    } finally { await f.close(); }
  });
  test(`${root}: real concurrent source edits conflict without overwriting or creating private documents`, async () => {
    const source = db.doc(`${root}/stations/stations/concurrent-station`);
    await source.set({ name: 'Original', owner: 'Synthetic' }); const f = await rehearsal(root);
    try {
      await source.update({ name: 'Concurrent edit' });
      await assert.rejects(applyPrivacy(f.input), { code: 'source-conflict' });
      assert.equal((await source.get()).get('name'), 'Concurrent edit');
      assert.equal((await db.doc(`${root}/stationPrivate/stations/concurrent-station`).get()).exists, false);
    } finally { await f.close(); }
  });
  test(`${root}: missing/corrupt durable backup causes zero target or job mutations`, async () => {
    const source = db.doc(`${root}/stations/stations/backup-station`);
    await source.set({ name: 'Public', owner: 'Synthetic' }); const f = await rehearsal(root);
    try {
      await writeFile(join(f.directory, `${f.input.manifest.hash}.privacy.aes`), '{}');
      await assert.rejects(applyPrivacy(f.input));
      assert.equal((await source.get()).get('owner'), 'Synthetic');
      assert.equal((await db.doc(privacyJobPath(root, f.input.manifest.hash)).get()).exists, false);
    } finally { await f.close(); }
  });
  test(`${root}: email cleanup preserves explicit names and a new deletion job blocks further cleanup`, async () => {
    const source = db.doc(`${root}/users/users/listener`);
    await source.set({ displayName: 'Chosen@example.test', email: 'synthetic@example.test', isActive: true }); const f = await rehearsal(root, 'profile-email');
    try {
      await applyPrivacy(f.input); await restorePrivacy(f.input);
      assert.deepEqual((await source.get()).data(), { displayName: 'Chosen@example.test', isActive: true });
    } finally { await f.close(); }
    const blocked = db.doc(`${root}/users/users/blocked`); await blocked.set({ email: 'synthetic@example.test' }); const next = await rehearsal(root, 'profile-email');
    try {
      const sibling = root === 'HudHudDev' ? 'HudHudOfficial' : 'HudHudDev';
      await db.doc(`${sibling}/accountDeletionRequests/requests/blocked`).set({ status: 'pending' });
      await assert.rejects(applyPrivacy(next.input), { code: 'source-conflict' });
      assert.equal((await blocked.get()).get('email'), 'synthetic@example.test');
    } finally { await next.close(); }
  });
  test(`${root}: private job and item receipts deny every SDK client role`, async () => {
    const path = privacyJobPath(root, 'a'.repeat(64));
    await db.doc(path).set({ schemaVersion: 1 }); await db.doc(`${path}/items/000`).set({ index: 0 });
    const clients = [environment.unauthenticatedContext().firestore(),
      ...[{}, { admin: true, role: 'station_admin', allStations: true }, { admin: true, role: 'moderator' }, { admin: true }, { role: 'super_admin' }]
        .map((claims, index) => environment.authenticatedContext(`synthetic-role-${index}`, claims).firestore())];
    for (const client of clients) {
      await assertFails(getDoc(doc(client, path)));
      await assertFails(getDocs(collection(client, `${root}/privacyMigrationJobs/jobs`)));
      await assertFails(setDoc(doc(client, privacyJobPath(root, 'b'.repeat(64))), { schemaVersion: 1 }));
      await assertFails(updateDoc(doc(client, path), { schemaVersion: 2 }));
      await assertFails(deleteDoc(doc(client, path)));
      await assertFails(getDoc(doc(client, `${path}/items/000`)));
    }
  });
}
