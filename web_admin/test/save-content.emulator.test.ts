import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { callableEmulator } from './support/callable-emulator.ts';
import {
  doc,
  disableNetwork,
  enableNetwork,
  getDocFromServer,
} from 'firebase/firestore';
import { saveWithRelations } from '../lib/save-content.ts';
import { deleteContentWithAudit } from '../lib/delete-episode.ts';
import { loadStationPrivatePage, publicStationData } from '../lib/station-private.ts';
void test(
  'actual save transaction preserves retry counters, rejects stale edits and moves atomically in both roots',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const { db, adminDb, seed: setDoc, close } = await callableEmulator();
    const fixture = JSON.parse(
      readFileSync(
        new URL(
          '../../test/fixtures/admin-content-contract.json',
          import.meta.url,
        ),
        'utf8',
      ),
    ).programs;
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        const id = crypto.randomUUID(),
          path = `${root}/programs/programs`;
        const program = doc(db, path, id),
          old = doc(db, `${root}/stations/stations`, `${id}-old`),
          next = doc(db, `${root}/stations/stations`, `${id}-next`);
        try {
          await setDoc(old, { stats: { programsCount: 0 } });
          await setDoc(next, { stats: { programsCount: 0 } });
          const { stats, ...fields } = fixture;
          const data = { ...fields, stationId: old.id };
          await saveWithRelations(
            db,
            root,
            'programs',
            path,
            id,
            data,
            null,
          );
          assert.equal((await getDocFromServer(program)).get('stats.episodesCount'), stats.episodesCount);
          await saveWithRelations(
            db,
            root,
            'programs',
            path,
            id,
            {
              ...data,
              schedule: Object.fromEntries(
                Object.entries(data.schedule).reverse(),
              ),
            },
            null,
          );
          assert.equal(
            (await getDocFromServer(old)).get('stats.programsCount'),
            1,
          );
          const original = (await getDocFromServer(program)).data()!;
          await setDoc(
            program,
            { title: 'Concurrent title', serverOnly: 'keep' },
            { merge: true },
          );
          await assert.rejects(
            saveWithRelations(db, root, 'programs', path, id, data, {
              reference: program,
              data: original,
            }),
            { name: 'ContentError' },
          );
          assert.equal(
            (await getDocFromServer(program)).get('title'),
            'Concurrent title',
          );
          const current = (await getDocFromServer(program)).data()!;
          const moved = {
            ...data,
            title: 'Concurrent title',
            stationId: next.id,
          };
          await setDoc(old, { stats: { programsCount: 0 } });
          await assert.rejects(
            saveWithRelations(db, root, 'programs', path, id, moved, {
              reference: program,
              data: current,
            }),
            { name: 'ContentError' },
          );
          assert.equal(
            (await getDocFromServer(program)).get('stationId'),
            old.id,
          );
          assert.equal(
            (await getDocFromServer(next)).get('stats.programsCount'),
            0,
          );
          await setDoc(old, { stats: { programsCount: 1 } });
          await saveWithRelations(db, root, 'programs', path, id, moved, {
            reference: program,
            data: current,
          });
          assert.equal(
            (await getDocFromServer(old)).get('stats.programsCount'),
            0,
          );
          assert.equal(
            (await getDocFromServer(next)).get('stats.programsCount'),
            1,
          );
          assert.equal(
            (await getDocFromServer(program)).get('serverOnly'),
            'keep',
          );
          const other = root === 'HudHudDev' ? 'HudHudOfficial' : 'HudHudDev';
          await assert.rejects(
            saveWithRelations(db, other, 'programs', path, id, moved, null),
            { name: 'ContentError' },
          );
        } finally {
          const batch = adminDb.batch();
          [program, old, next].forEach((ref) => batch.delete(adminDb.doc(ref.path)));
          await batch.commit();
        }
      }
    } finally {
      await close();
    }
  },
);

void test(
  'R01 admin helpers read canonical private state, enforce stale revisions and delete both projections',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const { db, adminDb, seed, close } = await callableEmulator();
    const fixtures = JSON.parse(readFileSync(new URL('../../test/fixtures/admin-content-contract.json', import.meta.url), 'utf8'));
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        const id = crypto.randomUUID();
        const path = `${root}/stations/stations`;
        const station = doc(db, path, id);
        const privateRef = doc(db, `${root}/stationPrivate/stations`, id);
        const malformed = doc(db, `${root}/stationPrivate/stations`, `${id}-malformed`);
        const location = doc(db, `${root}/locations/locations`, `${id}-city`);
        const fields = { ...fixtures.stations, cityCode: location.id, locationType: 'governorate', isNational: false, owner: 'Synthetic private owner' };
        try {
          const missing = await loadStationPrivatePage(db, root, [id]);
          assert.deepEqual(missing[id], { revision: null, data: {} });
          await seed(location, { ...fixtures.locations, cityCode: location.id, locationType: 'governorate' });
          await saveWithRelations(db, root, 'stations', path, id, fields, null, location, 'editor',
            { expectedPrivateRevision: missing[id].revision });
          const original = (await getDocFromServer(station)).data()!;
          assert.equal(Object.hasOwn(original, 'owner'), false);
          const first = (await loadStationPrivatePage(db, root, [id]))[id];
          assert.equal(first.revision, 1);
          assert.equal(first.data.owner, fields.owner);
          const changed = { ...fields, owner: 'Changed synthetic owner' };
          await saveWithRelations(db, root, 'stations', path, id, changed,
            { reference: station, data: original }, location, 'editor', { expectedPrivateRevision: first.revision });
          const second = (await loadStationPrivatePage(db, root, [id]))[id];
          assert.equal(second.revision, 2);
          const current = (await getDocFromServer(station)).data()!;
          await assert.rejects(saveWithRelations(db, root, 'stations', path, id,
            { ...changed, name: 'Stale edit', owner: 'Stale synthetic owner' },
            { reference: station, data: current }, location, 'editor', { expectedPrivateRevision: first.revision }),
          { name: 'ContentError' });
          assert.equal((await getDocFromServer(station)).get('name'), fields.name);
          assert.equal((await getDocFromServer(privateRef)).get('owner'), changed.owner);
          const withoutOwner = Object.fromEntries(Object.entries(changed).filter(([key]) => key !== 'owner'));
          await saveWithRelations(db, root, 'stations', path, id, withoutOwner,
            { reference: station, data: current }, location, 'editor',
            { expectedPrivateRevision: second.revision, deletePrivateFields: ['owner'] });
          const third = (await loadStationPrivatePage(db, root, [id]))[id];
          assert.equal(third.revision, 3);
          assert.equal(Object.hasOwn(third.data, 'owner'), false);
          assert.equal(third.data.contactPhone, '');
          const publicData = (await getDocFromServer(station)).data()!;
          await saveWithRelations(db, root, 'stations', path, id,
            { ...publicStationData(withoutOwner), name: 'Public-only edit' },
            { reference: station, data: publicData }, location);
          assert.equal((await getDocFromServer(privateRef)).get('revision'), 3);
          const deletionSnapshot = (await getDocFromServer(station)).data()!;
          await assert.rejects(deleteContentWithAudit(db, root, 'stations', station, deletionSnapshot,
            { expectedPrivateRevision: second.revision }), { name: 'ContentError' });
          assert.equal((await getDocFromServer(privateRef)).exists(), true);
          await deleteContentWithAudit(db, root, 'stations', station, deletionSnapshot);
          assert.equal((await getDocFromServer(station)).exists(), false);
          assert.equal((await getDocFromServer(privateRef)).exists(), false);
          await seed(malformed, { schemaVersion: 2, revision: 1 });
          await assert.rejects(loadStationPrivatePage(db, root, [malformed.id]), { name: 'ContentError' });
        } finally {
          const cleanup = adminDb.batch();
          [station, privateRef, malformed, location].forEach(ref => cleanup.delete(adminDb.doc(ref.path)));
          await cleanup.commit();
        }
      }
    } finally {
      await close();
    }
  },
);

void test(
  'R01 scoped admin cannot load station private metadata through the SDK helper',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const { db, close } = await callableEmulator({ admin: true, role: 'station_admin', assignedStations: ['synthetic-station'] });
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        await assert.rejects(loadStationPrivatePage(db, root, ['synthetic-station']), { name: 'ContentError' });
      }
    } finally {
      await close();
    }
  },
);

void test(
  'R01 offline private reads reject without returning cached metadata or changing either projection',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const { db, adminDb, seed, close } = await callableEmulator();
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        const id = crypto.randomUUID();
        const station = doc(db, `${root}/stations/stations`, id);
        const privateRef = doc(db, `${root}/stationPrivate/stations`, id);
        const publicBefore = { name: 'Synthetic public station', stats: { programsCount: 0 } };
        const privateBefore = { schemaVersion: 1, revision: 1, owner: 'Synthetic private owner' };
        try {
          await seed(station, publicBefore);
          await seed(privateRef, privateBefore);
          const initial = await loadStationPrivatePage(db, root, [id]);
          assert.equal(initial[id].data.owner, privateBefore.owner);
          await disableNetwork(db);
          try {
            let returnedState = false;
            await assert.rejects(async () => {
              await loadStationPrivatePage(db, root, [id]);
              returnedState = true;
            }, { name: 'ContentError' });
            assert.equal(returnedState, false, 'An offline read must not return cached or empty metadata.');
            assert.deepEqual((await adminDb.doc(station.path).get()).data(), publicBefore);
            assert.deepEqual((await adminDb.doc(privateRef.path).get()).data(), privateBefore);
          } finally {
            await enableNetwork(db);
          }
        } finally {
          const cleanup = adminDb.batch();
          [station, privateRef].forEach(ref => cleanup.delete(adminDb.doc(ref.path)));
          await cleanup.commit();
        }
      }
    } finally {
      await close();
    }
  },
);
