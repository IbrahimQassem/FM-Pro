import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { contentPayload } from '../lib/content-form.ts';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signOut } from 'firebase/auth';
import {
  connectStorageEmulator,
  getStorage,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { callableEmulator } from './support/callable-emulator.ts';
const require = createRequire(
  new URL('../../functions/package.json', import.meta.url),
);
void test(
  'real admin image callable re-encodes files in Storage, isolates roots and keeps SDK writes closed',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const harness = await callableEmulator();
    const { initializeApp, deleteApp } = require('firebase-admin/app');
    const { getStorage: adminStorage } = require('firebase-admin/storage');
    const adminApp = initializeApp(
      { projectId: process.env.GCLOUD_PROJECT },
      `image-storage-${crypto.randomUUID()}`,
    );
    const sharp = require('sharp');
    try {
      assert.ok(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
      const imageBase64 = (
        await sharp({
          create: {
            width: 1200,
            height: 600,
            channels: 4,
            background: '#33445580',
          },
        })
          .png()
          .toBuffer()
      ).toString('base64');
      const call = httpsCallable(getFunctions(harness.app), 'adminUploadImage');
      const direct = getStorage(
        harness.app,
        `gs://${process.env.GCLOUD_PROJECT}.appspot.com`,
      );
      connectStorageEmulator(direct, '127.0.0.1', 9199);
      for (const root of ['HudHudDev', 'HudHudOfficial']) {
        const payload = {
          root,
          kind: 'stations',
          field: 'logoUrl',
          operationId: crypto.randomUUID(),
          imageBase64,
        };
        const result = (await call(payload)).data as {
          url: string;
          bytes: number;
          width: number;
          uploadId: string;
        };
        assert.equal(result.width, 720);
        assert.ok(result.bytes <= 64 * 1024);
        assert.deepEqual((await call(payload)).data, result);
        const url = new URL(result.url);
        const segments = url.pathname.split('/');
        const bucket = adminStorage(adminApp).bucket(
          decodeURIComponent(segments[3]),
        );
        const object = bucket.file(decodeURIComponent(segments[5]));
        const [metadata] = await object.getMetadata();
        assert.equal(metadata.contentType, 'image/webp');
        assert.ok(object.name.startsWith(`${root}/admin-images/`));
        const [bytes] = await object.download();
        assert.equal(bytes.length, result.bytes);
        assert.equal((await sharp(bytes).metadata()).exif, undefined);
        const fixture = JSON.parse(
          await readFile(
            new URL(
              '../../test/fixtures/admin-content-contract.json',
              import.meta.url,
            ),
            'utf8',
          ),
        );
        const locationId = `image-location-${crypto.randomUUID()}`;
        await harness.adminDb
          .doc(`${root}/locations/locations/${locationId}`)
          .set({
            ...fixture.locations,
            cityCode: locationId,
            locationType: 'governorate',
          });
        const stationId = `image-station-${crypto.randomUUID()}`;
        const save = httpsCallable(
          getFunctions(harness.app),
          'adminSaveContent',
        );
        await save({
          root,
          kind: 'stations',
          id: stationId,
          locationId,
          expected: null,
          content: contentPayload('stations', {
            ...fixture.stations,
            name: stationId,
            cityCode: locationId,
            locationType: 'governorate',
            isNational: false,
            logoUrl: result.url,
          }),
        });
        assert.equal(
          (
            await getDocFromServer(
              doc(harness.db, `${root}/stations/stations/${stationId}`),
            )
          ).get('logoUrl'),
          result.url,
        );

        // Separate demo upload intent; reset only the fixture's server-owned interval.
        const uid = getAuth(harness.app).currentUser!.uid;
        await harness.adminDb
          .doc(
            `${root}/adminImageUploadLimits/actors/${createHash('sha256').update(uid).digest('hex')}`,
          )
          .update({
            lastAt: require('firebase-admin/firestore').Timestamp.fromMillis(0),
          });
        const notification = (
          await call({
            ...payload,
            kind: 'notifications',
            field: 'imageUrl',
            operationId: crypto.randomUUID(),
          })
        ).data as { url: string; bytes: number };
        const nurl = new URL(notification.url).pathname.split('/');
        const nobject = adminStorage(adminApp)
          .bucket(decodeURIComponent(nurl[3]))
          .file(decodeURIComponent(nurl[5]));
        assert.ok(nobject.name.endsWith('.jpg'));
        assert.equal(
          (await nobject.getMetadata())[0].contentType,
          'image/jpeg',
        );
        assert.ok(notification.bytes <= 160 * 1024);

        await assert.rejects(
          uploadBytes(
            ref(direct, `${root}/admin-images/spoof.webp`),
            new Uint8Array([1, 2, 3]),
          ),
        );
        await assert.rejects(
          getDocFromServer(
            doc(harness.db, `${root}/adminImages/images/${result.uploadId}`),
          ),
        );
        await assert.rejects(
          setDoc(
            doc(harness.db, `${root}/adminImageUploadLimits/actors/spoof`),
            { count: 0 },
          ),
        );
      }
      await signOut(getAuth(harness.app));
      await assert.rejects(
        call({
          root: 'HudHudDev',
          kind: 'banners',
          field: 'imageUrl',
          operationId: crypto.randomUUID(),
          imageBase64,
        }),
        { code: 'functions/unauthenticated' },
      );
    } finally {
      await deleteApp(adminApp);
      await harness.close();
    }
  },
);

for (const scoped of [false, true]) {
  void test(
    `real image callable rejects ${scoped ? 'foreign ownership and global media for station admins' : 'authenticated non-admin and forged actor data'}`,
    { skip: !process.env.FIRESTORE_EMULATOR_HOST },
    async () => {
      const harness = await callableEmulator(
        scoped
          ? {
              admin: true,
              role: 'station_admin',
              assignedStations: ['image-owned'],
            }
          : {},
      );
      try {
        const imageBase64 = (
          await require('sharp')({
            create: {
              width: 8,
              height: 8,
              channels: 4,
              background: '#33445580',
            },
          })
            .png()
            .toBuffer()
        ).toString('base64');
        const call = httpsCallable(
          getFunctions(harness.app),
          'adminUploadImage',
        );
        for (const root of ['HudHudDev', 'HudHudOfficial']) {
          const payload = {
            root,
            kind: 'programs',
            field: 'coverUrl',
            stationId: 'image-owned',
            recordId: `image-owned-${root}`,
            operationId: crypto.randomUUID(),
            imageBase64,
          };
          await harness.adminDb
            .doc(`${root}/stations/stations/image-owned`)
            .set({ isActive: true });
          await harness.adminDb
            .doc(`${root}/programs/programs/${payload.recordId}`)
            .set({ stationId: 'image-owned' });
          await harness.adminDb
            .doc(`${root}/programs/programs/image-foreign`)
            .set({ stationId: 'image-foreign-station' });
          await assert.rejects(
            call({ ...payload, recordId: 'image-foreign' }),
            { code: 'functions/permission-denied' },
          );
          await assert.rejects(
            call({ ...payload, kind: 'notifications', field: 'imageUrl' }),
            { code: 'functions/permission-denied' },
          );
          await assert.rejects(
            call({ ...payload, callerUid: 'forged-super', admin: true }),
            {
              code: scoped
                ? 'functions/invalid-argument'
                : 'functions/permission-denied',
            },
          );
          if (scoped)
            assert.ok(
              ((await call(payload)).data as { url: string }).url.startsWith(
                'https://',
              ),
            );
          else
            await assert.rejects(call(payload), {
              code: 'functions/permission-denied',
            });
        }
      } finally {
        await harness.close();
      }
    },
  );
}
