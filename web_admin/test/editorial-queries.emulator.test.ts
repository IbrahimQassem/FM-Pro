import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getCountFromServer,
  getFirestore,
  writeBatch,
} from 'firebase/firestore';
import { editorialQueries } from '../lib/editorial-queries.ts';

void test(
  'editorial aggregates respect expiry boundaries, activation and explicit null schedules in both roots',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    assert.ok(projectId?.startsWith('demo-'));
    const app = initializeApp(
      { projectId },
      `editorial-${crypto.randomUUID()}`,
    );
    const db = getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    connectFirestoreEmulator(db, host, Number(port), {
      mockUserToken: { sub: 'fixture-admin', admin: true },
    });
    const now = new Date('2030-01-01T00:00:00Z');
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        const counts = () =>
          Promise.all(
            editorialQueries(db, root, now).map(
              async (request) =>
                (await getCountFromServer(request)).data().count,
            ),
          );
        const before = await counts();
        const prefix = crypto.randomUUID();
        const cases: [string, Record<string, unknown>][] = [
          ['episodes', { isPublished: false }],
          ['episodes', { isPublished: true }],
          ['episodes', {}],
          ...[-1, 0, 1, 7 * 86400000, 7 * 86400000 + 1].map(
            (offset) =>
              [
                'banners',
                { isActive: true, expiresAt: new Date(now.getTime() + offset) },
              ] as [string, Record<string, unknown>],
          ),
          [
            'banners',
            { isActive: false, expiresAt: new Date(now.getTime() + 1000) },
          ],
          ['banners', { isActive: true, expiresAt: null }],
          ['programs', { isActive: true, schedule: null }],
          ['programs', { isActive: false, schedule: null }],
          ['programs', { isActive: true }],
          ['programs', { isActive: true, schedule: { startMinute: 60 } }],
        ];
        const refs = cases.map(([kind], i) =>
          doc(db, `${root}/${kind}/${kind}`, `${prefix}-${i}`),
        );
        try {
          const batch = writeBatch(db);
          cases.forEach(([, data], i) => batch.set(refs[i], data));
          await batch.commit();
          const after = await counts();
          assert.deepEqual(
            after.map((value, i) => value - before[i]),
            [1, 2, 1],
          );
        } finally {
          const cleanup = writeBatch(db);
          refs.forEach((ref) => cleanup.delete(ref));
          await cleanup.commit();
        }
      }
    } finally {
      await deleteApp(app);
    }
  },
);
