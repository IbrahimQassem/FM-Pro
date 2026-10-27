import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { doc, getDocFromServer } from 'firebase/firestore';
import { saveWithRelations } from '../lib/save-content.ts';
import { publicStationData } from '../lib/station-private.ts';
import { callableEmulator } from './support/callable-emulator.ts';

void test('trusted location saves update off-page stations, serialize identity and reject stale reference selection',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
    const harness = await callableEmulator();
    const fixture = publicStationData(JSON.parse(await readFile(new URL('../../test/fixtures/admin-content-contract.json', import.meta.url), 'utf8')).stations);
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        const id = crypto.randomUUID();
        const path = `${root}/locations/locations`;
        const location = doc(harness.db, path, id);
        const original = { countryCode: 'YE', countryNameAr: 'اليمن', cityCode: id, cityNameAr: 'Synthetic city', locationType: 'governorate', isActive: true, sortOrder: 0 };
        await saveWithRelations(harness.db, root, 'locations', path, id, original, null);
        const seed = harness.adminDb.batch();
        for (let index = 0; index < 55; index++) seed.set(harness.adminDb.doc(`${root}/stations/stations/${id}-${index}`), { ...original, name: 'Fixture', stats: { programsCount: 2 } });
        await seed.commit();
        const before = (await getDocFromServer(location)).data()!;
        const next = { ...original, cityNameAr: 'Updated city' };
        const results = await Promise.allSettled([
          saveWithRelations(harness.db, root, 'locations', path, id, next, { reference: location, data: before }),
          saveWithRelations(harness.db, root, 'stations', `${root}/stations/stations`, `${id}-concurrent`, { ...fixture, ...original, name: 'Concurrent fixture' }, null, location),
        ]);
        assert.equal(results[0].status, 'fulfilled');
        if (results[1].status === 'rejected') {
          assert.equal(results[1].reason?.code, 'functions/failed-precondition',
            'The concurrent request must reach the server location precondition.');
        }
        const stations = await harness.adminDb.collection(`${root}/stations/stations`).where('cityCode', '==', id).get();
        assert.equal(stations.size, results[1].status === 'fulfilled' ? 56 : 55);
        assert.equal(stations.docs.every((item: { get(key: string): unknown }) => item.get('cityNameAr') === next.cityNameAr), true);
        const first = harness.adminDb.doc(`${root}/stations/stations/${id}-0`);
        assert.equal((await first.get()).get('stats.programsCount'), 2);
        await assert.rejects(saveWithRelations(harness.db, root, 'stations', `${root}/stations/stations`, `${id}-stale`, { ...fixture, ...original }, null, location), { code: 'functions/failed-precondition' });
        const duplicate = { ...original, cityCode: `${id}-duplicate` };
        const candidates = [0, 1].map(index => doc(harness.db, path, `${id}-candidate-${index}`));
        const identity = await Promise.allSettled(candidates.map(ref => saveWithRelations(harness.db, root, 'locations', path, ref.id, duplicate, null)));
        assert.equal(identity.filter(result => result.status === 'fulfilled').length, 1);
        const current = (await getDocFromServer(location)).data()!;
        await assert.rejects(saveWithRelations(harness.db, root, 'locations', path, id, { ...next, cityCode: duplicate.cityCode }, { reference: location, data: current }), { code: 'functions/already-exists' });
        const stamp = (await first.get()).get('updatedAt').toMillis();
        await saveWithRelations(harness.db, root, 'locations', path, id, { ...next, isActive: false }, { reference: location, data: current });
        assert.equal((await first.get()).get('updatedAt').toMillis(), stamp, 'Activation alone does not rewrite station projections');
      }
    } finally { await harness.close(); }
  });
