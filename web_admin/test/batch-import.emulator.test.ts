import assert from 'node:assert/strict';
import { test } from 'node:test';
import { callableEmulator } from './support/callable-emulator.ts';
import {
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import {
  previewBatchImport,
  commitBatchImport,
} from '../lib/batch-import.ts';

void test(
  'batch import against emulator: creates programs and episodes, increments counters, and handles unchanged re-imports as no-ops',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const { db, adminDb, seed: setDoc, close } = await callableEmulator();

    const root = 'HudHudDev';
    const unique = crypto.randomUUID().slice(0, 8);
    const stationId = `st-import-${unique}`;
    const programId = `prog-import-${unique}`;
    const episodeId = `ep-import-${unique}`;

    const stationRef = doc(db, `${root}/stations/stations`, stationId);
    const programRef = doc(db, `${root}/programs/programs`, programId);
    const episodeRef = doc(db, `${root}/episodes/episodes`, episodeId);

    try {
      // 1. Setup parent station with programsCount: 0
      await setDoc(stationRef, {
        name: 'محطة الاختبار للاستيراد',
        countryCode: 'YE',
        countryNameAr: 'اليمن',
        cityCode: 'sanaa',
        cityNameAr: 'صنعاء',
        stats: { programsCount: 0, subscribersCount: 0, totalPlays: 0 },
      });

      const sheets = {
        programsRaw: [
          {
            rowNumber: 2,
            data: {
              programId,
              stationId,
              title: 'برنامج الدفعة',
              weekdays: '1, 7',
              startTime: '08:00',
              endTime: '09:00',
              utcOffsetMinutes: 180,
              isActive: true,
              isFeatured: false,
              priority: 1,
            },
          },
        ],
        episodesRaw: [
          {
            rowNumber: 2,
            data: {
              episodeId,
              programId,
              title: 'حلقة الدفعة',
              audioUrl: 'https://cdn.example.com/audio.mp3',
              durationSec: 1200,
              broadcastAt: '2026-10-17T09:00:00.000Z',
              utcOffsetMinutes: 180,
              isPublished: true,
              isFeatured: false,
              priority: 1,
            },
          },
        ],
      };

      // 2. Preview initial import: should detect both as 'create'
      const preview1 = await previewBatchImport(db, root, sheets);
      assert.equal(preview1.hasErrors, false);
      assert.equal(preview1.canCommit, true);
      assert.equal(preview1.summary.newCount, 2);
      assert.equal(preview1.programs[0].status, 'create');
      assert.equal(preview1.episodes[0].status, 'create');
      assert.equal(preview1.episodes[0].normalized.stationId, stationId);

      // 3. Commit batch import
      const commitRes1 = await commitBatchImport(db, root, preview1);
      assert.equal(commitRes1.success, true);
      assert.equal(commitRes1.committedCount, 2);
      assert.equal(commitRes1.failedCount, 0);

      // Check Firestore: Station programsCount incremented to 1
      const stSnap = await getDocFromServer(stationRef);
      assert.equal(stSnap.get('stats.programsCount'), 1);

      // Program created and has episodesCount: 1 from episode save
      const prSnap = await getDocFromServer(programRef);
      assert.ok(prSnap.exists());
      assert.equal(prSnap.get('title'), 'برنامج الدفعة');
      assert.equal(prSnap.get('stats.episodesCount'), 1);

      // Episode created
      const epSnap = await getDocFromServer(episodeRef);
      assert.ok(epSnap.exists());
      assert.equal(epSnap.get('stationId'), stationId);

      // Retrying the original request after an uncertain response must report
      // unchanged rows and must not increment counters or append new audits.
      const retry = await commitBatchImport(db, root, preview1);
      assert.equal(retry.committedCount, 0);
      assert.equal(retry.skippedCount, 2);
      const auditRows = await adminDb.collection(`${root}/auditLogs/auditLogs`).where('targetId', 'in', [programId, episodeId]).get();
      assert.equal(auditRows.size, 2);
      assert.equal(auditRows.docs.every((entry: { get(field: string): unknown }) => entry.get('action') === 'import'), true);

      // 4. Unchanged Re-import check
      const preview2 = await previewBatchImport(db, root, sheets);
      assert.equal(preview2.hasErrors, false);
      assert.equal(preview2.summary.unchangedCount, 2);
      assert.equal(preview2.summary.newCount, 0);
      assert.equal(preview2.programs[0].status, 'unchanged');
      assert.equal(preview2.episodes[0].status, 'unchanged');

      // Re-committing is a zero-write no-op
      const commitRes2 = await commitBatchImport(db, root, preview2);
      assert.equal(commitRes2.committedCount, 0);
      assert.equal(commitRes2.skippedCount, 2);

      // Verify counters DID NOT change (no duplication)
      const stSnapAfter = await getDocFromServer(stationRef);
      assert.equal(stSnapAfter.get('stats.programsCount'), 1);
      const prSnapAfter = await getDocFromServer(programRef);
      assert.equal(prSnapAfter.get('stats.episodesCount'), 1);

      // 5. Update flow: Edit title in the sheet
      const updatedSheets = {
        programsRaw: [
          {
            rowNumber: 2,
            data: {
              ...sheets.programsRaw[0].data,
              title: 'برنامج الدفعة المحدث',
            },
          },
        ],
        episodesRaw: sheets.episodesRaw,
      };

      const preview3 = await previewBatchImport(db, root, updatedSheets);
      assert.equal(preview3.programs[0].status, 'update');
      assert.equal(preview3.episodes[0].status, 'unchanged');
      assert.equal(preview3.programs[0].diff?.[0].field, 'title');

      // Commit update with allowUpdates
      const commitRes3 = await commitBatchImport(db, root, preview3, {
        allowUpdates: true,
      });
      assert.equal(commitRes3.committedCount, 1);
      assert.equal(commitRes3.skippedCount, 1);

      const prUpdatedSnap = await getDocFromServer(programRef);
      assert.equal(prUpdatedSnap.get('title'), 'برنامج الدفعة المحدث');
      // Counter is still 1
      assert.equal(prUpdatedSnap.get('stats.episodesCount'), 1);
    } finally {
      const batch = adminDb.batch();
      [stationRef, programRef, episodeRef].forEach((ref) => batch.delete(adminDb.doc(ref.path)));
      await batch.commit();
      await close();
    }
  },
);
