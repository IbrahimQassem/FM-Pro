import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import {
  uploadAdminImage,
  collectAdminImages,
} from '../../functions/lib/admin-images.js';
const require = createRequire(
  new URL('../../functions/package.json', import.meta.url),
);
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const sharp = require('sharp');
let app, db, image;
before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  app = initializeApp({ projectId: 'demo-hudhud-editorial' });
  db = getFirestore(app);
  image = (
    await sharp({
      create: { width: 8, height: 8, channels: 4, background: '#44556680' },
    })
      .png()
      .toBuffer()
  ).toString('base64');
});
after(async () => {
  await deleteApp(app);
});
function bucket() {
  const objects = new Map();
  let saves = 0;
  return {
    name: 'synthetic.test',
    objects,
    get saves() {
      return saves;
    },
    file: (path) => ({
      save: async (bytes) => {
        saves++;
        objects.set(path, bytes);
      },
      delete: async () => {
        objects.delete(path);
      },
    }),
  };
}
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: image upload is scoped, idempotent, audited and ready assets survive cleanup`, async () => {
    const storage = bucket();
    const uid = `image-admin-${root}`;
    const stationId = `image-station-${root}`;
    const programId = `image-program-${root}`;
    await db
      .doc(`${root}/stations/stations/${stationId}`)
      .set({ isActive: true });
    await db.doc(`${root}/programs/programs/${programId}`).set({ stationId });
    const args = {
      firestore: db,
      bucket: storage,
      callerUid: uid,
      callerRole: 'station_admin',
      callerClaims: {
        admin: true,
        role: 'station_admin',
        assignedStations: [stationId],
      },
      data: {
        root,
        kind: 'programs',
        field: 'coverUrl',
        stationId,
        recordId: programId,
        operationId: randomUUID(),
        imageBase64: image,
      },
    };
    await assert.rejects(
      uploadAdminImage({
        ...args,
        data: { ...args.data, stationId: 'not-assigned' },
      }),
      { code: 'permission-denied' },
    );
    assert.equal(storage.saves, 0);
    const result = await uploadAdminImage(args);
    assert.match(result.url, /^https:\/\/firebasestorage.googleapis.com\//);
    assert.equal(storage.saves, 1);
    assert.deepEqual(await uploadAdminImage(args), result);
    assert.equal(storage.saves, 1);
    await assert.rejects(
      uploadAdminImage({
        ...args,
        data: { ...args.data, field: 'thumbnailUrl' },
      }),
      { code: 'permission-denied' },
    );
    await assert.rejects(
      uploadAdminImage({
        ...args,
        data: {
          ...args.data,
          kind: 'notifications',
          field: 'imageUrl',
          operationId: randomUUID(),
        },
      }),
      { code: 'permission-denied' },
    );
    await assert.rejects(
      uploadAdminImage({
        ...args,
        data: { ...args.data, operationId: randomUUID() },
      }),
      { code: 'resource-exhausted' },
    );
    await collectAdminImages(db, storage, Date.now() + 2 * 3_600_000);
    assert.equal(storage.objects.size, 1);
    assert.equal(
      (
        await db
          .doc(`${root}/auditLogs/auditLogs/image-${result.uploadId}`)
          .get()
      ).get('actorUid'),
      uid,
    );
    await db
      .doc(`${root}/programs/programs/${programId}`)
      .update({ stationId: 'foreign' });
    await assert.rejects(uploadAdminImage(args), { code: 'permission-denied' });
  });
  test(`${root}: revoked ownership during storage prevents finalization; failed and abandoned uploads expire`, async () => {
    const storage = bucket();
    const stationId = `image-race-${root}`;
    const programId = `${stationId}-program`;
    await db
      .doc(`${root}/stations/stations/${stationId}`)
      .set({ isActive: true });
    const program = db.doc(`${root}/programs/programs/${programId}`);
    await program.set({ stationId });
    const original = storage.file;
    storage.file = (path) => ({
      ...original(path),
      save: async (bytes) => {
        await original(path).save(bytes);
        await program.update({ stationId: 'foreign' });
      },
    });
    const args = {
      firestore: db,
      bucket: storage,
      callerUid: `race-${root}`,
      callerRole: 'station_admin',
      callerClaims: {
        admin: true,
        role: 'station_admin',
        assignedStations: [stationId],
      },
      data: {
        root,
        kind: 'programs',
        field: 'coverUrl',
        stationId,
        recordId: programId,
        operationId: randomUUID(),
        imageBase64: image,
      },
    };
    await assert.rejects(uploadAdminImage(args), { code: 'permission-denied' });
    const ref = db.doc(`${root}/adminImages/images/${args.data.operationId}`);
    assert.equal((await ref.get()).get('state'), 'failed');
    assert.equal(
      (
        await db
          .doc(`${root}/auditLogs/auditLogs/image-${args.data.operationId}`)
          .get()
      ).exists,
      false,
    );
    await collectAdminImages(db, storage, Date.now() + 2 * 3_600_000);
    assert.equal(storage.objects.size, 0);
    assert.equal((await ref.get()).get('state'), 'expired');
    // Missing dueAt on ready records means they cannot starve the bounded collector.
    assert.equal((await ref.get()).get('dueAt'), undefined);
    const staleId = randomUUID();
    const objectPath = `${root}/admin-images/${staleId}.webp`;
    await db.doc(`${root}/adminImages/images/${staleId}`).set({
      root,
      objectPath,
      state: 'uploading',
      dueAt: Timestamp.fromMillis(1),
    });
    storage.objects.set(objectPath, Buffer.from('synthetic'));
    await collectAdminImages(db, storage);
    assert.equal(storage.objects.size, 0);
    const notificationId = randomUUID();
    const notificationPath = `${root}/admin-images/${notificationId}.jpg`;
    await db
      .doc(`${root}/adminImages/images/${notificationId}`)
      .set({
        root,
        kind: 'notifications',
        objectPath: notificationPath,
        state: 'uploading',
        dueAt: Timestamp.fromMillis(1),
      });
    storage.objects.set(notificationPath, Buffer.from('synthetic'));
    await collectAdminImages(db, storage);
    assert.equal(storage.objects.size, 0);
  });
}
