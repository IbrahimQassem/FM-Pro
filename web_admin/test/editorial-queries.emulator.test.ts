import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  doc,
  getCountFromServer,
} from 'firebase/firestore';
import { editorialQueries } from '../lib/editorial-queries.ts';
import { callableEmulator } from './support/callable-emulator.ts';

void test(
  'editorial aggregates respect expiry boundaries, activation and explicit null schedules in both roots',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const harness = await callableEmulator();
    const db = harness.db;
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
          const batch = harness.adminDb.batch();
          cases.forEach(([, data], i) => batch.set(harness.adminDb.doc(refs[i].path), data));
          await batch.commit();
          const after = await counts();
          assert.deepEqual(
            after.map((value, i) => value - before[i]),
            [1, 2, 1],
          );
        } finally {
          const cleanup = harness.adminDb.batch();
          refs.forEach((ref) => cleanup.delete(harness.adminDb.doc(ref.path)));
          await cleanup.commit();
        }
      }
    } finally {
      await harness.close();
    }
  },
);
