import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import {
  locationFields,
  prepareLocationIdentity,
  prepareStationLocation,
  readLocationStations,
} from '../lib/location-relations.ts';

void test(
  'location edits update off-page stations and retry concurrent creation',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    assert.ok(projectId?.startsWith('demo-'));
    const app = initializeApp({ projectId }, `location-${crypto.randomUUID()}`);
    const db = getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    connectFirestoreEmulator(db, host, Number(port), {
      mockUserToken: { sub: 'fixture-admin', admin: true },
    });
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial']) {
        const id = crypto.randomUUID();
        const location = doc(db, `${root}/locations/locations`, id);
        const original = {
          countryCode: 'YE',
          countryNameAr: 'اليمن',
          cityCode: id,
          cityNameAr: 'مدينة الاختبار',
        };
        const next = { ...original, cityNameAr: 'الاسم الجديد' };
        const stations = Array.from({ length: 56 }, (_, i) =>
          doc(db, `${root}/stations/stations`, `${id}-${i}`),
        );
        const seed = writeBatch(db);
        seed.set(location, { ...original, isActive: true });
        for (const station of stations.slice(0, 55))
          seed.set(station, {
            ...original,
            name: 'Fixture',
            stats: { programsCount: 2 },
          });
        await seed.commit();
        let attempts = 0;
        await runTransaction(db, async (tx) => {
          const current = await tx.get(location);
          const children = await readLocationStations(tx, current, next);
          if (++attempts === 1) {
            await runTransaction(db, async (create) => {
              const touch = await prepareStationLocation(
                create,
                location,
                original,
              );
              touch();
              create.set(stations[55], {
                ...original,
                name: 'Concurrent fixture',
              });
            });
          }
          for (const station of children)
            tx.update(station, locationFields(next));
          tx.update(location, next);
        });
        assert.ok(attempts > 1, 'Reference touch must retry the city edit');
        for (const station of stations)
          assert.equal(
            (await getDoc(station)).data()?.cityNameAr,
            next.cityNameAr,
          );
        assert.equal(
          (await getDoc(stations[0])).data()?.stats.programsCount,
          2,
        );
        await assert.rejects(
          runTransaction(db, async (tx) => {
            const touch = await prepareStationLocation(tx, location, original);
            touch();
          }),
          /المدينة/,
        );
        const duplicateCode = `${id}-duplicate`;
        const candidates = [0, 1].map((i) =>
          doc(db, `${root}/locations/locations`, `${id}-candidate-${i}`),
        );
        let arrivals = 0;
        let release!: () => void;
        const ready = new Promise<void>((resolve) => {
          release = resolve;
        });
        const results = await Promise.allSettled(
          candidates.map((reference) => {
            let firstAttempt = true;
            return runTransaction(db, async (tx) => {
              const data = { ...original, cityCode: duplicateCode };
              const reserve = await prepareLocationIdentity(
                tx,
                reference,
                data,
              );
              if (firstAttempt) {
                firstAttempt = false;
                if (++arrivals === 2) release();
                await ready;
              }
              reserve();
              tx.set(reference, data);
            });
          }),
        );
        assert.equal(
          results.filter((result) => result.status === 'fulfilled').length,
          1,
        );
        assert.equal(
          (
            await Promise.all(candidates.map((reference) => getDoc(reference)))
          ).filter((snapshot) => snapshot.exists()).length,
          1,
        );
        await assert.rejects(
          runTransaction(db, async (tx) => {
            const reserve = await prepareLocationIdentity(tx, location, {
              ...next,
              cityCode: duplicateCode,
            });
            reserve();
            tx.update(location, { cityCode: duplicateCode });
          }),
          /مستخدم/,
        );
        assert.equal((await getDoc(location)).data()?.cityCode, id);
        const before = await getDoc(location);
        await runTransaction(db, async (tx) => {
          const current = await tx.get(location);
          assert.equal(
            (
              await readLocationStations(tx, current, {
                ...next,
                isActive: false,
              })
            ).length,
            0,
          );
          tx.update(location, { isActive: false });
        });
        assert.equal(
          (await getDoc(location)).data()?.cityNameAr,
          before.data()?.cityNameAr,
        );
      }
    } finally {
      await deleteApp(app);
    }
  },
);
