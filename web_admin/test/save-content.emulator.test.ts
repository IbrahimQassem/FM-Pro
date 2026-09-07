import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  getFirestore,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { saveWithRelations } from '../lib/save-content.ts';
void test(
  'actual save transaction preserves retry counters, rejects stale edits and moves atomically in both roots',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    assert.ok(projectId?.startsWith('demo-'));
    const app = initializeApp({ projectId }, `save-${crypto.randomUUID()}`);
    const db = getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    connectFirestoreEmulator(db, host, Number(port), {
      mockUserToken: { sub: 'fixture-admin', admin: true },
    });
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
            undefined,
            stats,
          );
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
            undefined,
            stats,
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
          const batch = writeBatch(db);
          [program, old, next].forEach((ref) => batch.delete(ref));
          await batch.commit();
        }
      }
    } finally {
      await deleteApp(app);
    }
  },
);
