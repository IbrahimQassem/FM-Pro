import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collection, documentId, getDocsFromServer, orderBy, query } from 'firebase/firestore';
import { resourcePageRequest, resourceCursor } from '../lib/resource-pagination.ts';
import { callableEmulator } from './support/callable-emulator.ts';

void test('R06 existing resource request provides bounded ordinary pages and reaches record2001',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async (t) => {
    const harness = await callableEmulator();
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
        const parent = `r06-parent-${crypto.randomUUID()}`;
        const path = `${root}/programs/programs`;
        const ids = Array.from({ length: 2001 }, (_, i) => `${parent}-${String(i).padStart(5, '0')}`);
        try {
          for (let offset = 0; offset < ids.length; offset += 400) {
            const batch = harness.adminDb.batch();
            for (const id of ids.slice(offset, offset + 400)) {
              batch.set(harness.adminDb.doc(`${path}/${id}`), {
                stationId: parent, title: 'Synthetic pagination fixture', isActive: true,
              });
            }
            await batch.commit();
          }
          assert.equal((await harness.adminDb.collection(path).where('stationId', '==', parent).count().get()).data().count, 2001,
            'All synthetic fixture records must exist before the business assertion');
          const base = query(collection(harness.db, path), orderBy(documentId()));
          const first = await getDocsFromServer(resourcePageRequest(base, 'programs', { parent, root }));
          assert.ok(first.size > 0, 'Existing SDK query must succeed before budget/cursor assertions');
          await t.test(`${root}: ordinary page reads at most51 raw documents`, () => {
            assert.ok(first.size <= 51,
              `R06 business failure: existing ordinary-page request read ${first.size} documents; expected at most51`);
          });
          await t.test(`${root}: explicit continuation reaches record2001 without repeating first page`, async () => {
            const seen = new Set(first.docs.slice(0, 50).map((document) => document.id));
            let cursor = resourceCursor('programs', { root, parent }, first.docs.slice(0, 50).at(-1)!.ref.path);
            for (let action = 0; action < 42 && !seen.has(ids.at(-1)!); action++) {
              const next = await getDocsFromServer(resourcePageRequest(base, 'programs', { parent, root, cursor }));
              const consumed = next.docs.slice(0, 50);
              assert.ok(consumed.length > 0 && consumed.every((document) => !seen.has(document.id)),
                'R06 business failure: existing ordinary-page request ignores continuation and cannot reach record2001');
              for (const document of consumed) seen.add(document.id);
              cursor = resourceCursor('programs', { root, parent }, consumed.at(-1)!.ref.path);
            }
            assert.ok(seen.has(ids.at(-1)!), 'Explicit bounded continuations must reach record2001');
          });
        } finally {
          for (let offset = 0; offset < ids.length; offset += 400) {
            const batch = harness.adminDb.batch();
            for (const id of ids.slice(offset, offset + 400)) batch.delete(harness.adminDb.doc(`${path}/${id}`));
            await batch.commit();
          }
        }
      }
    } finally {
      await harness.close();
    }
  });
