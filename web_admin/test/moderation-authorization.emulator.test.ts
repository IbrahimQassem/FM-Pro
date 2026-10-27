import assert from 'node:assert/strict';
import { test } from 'node:test';
import { doc, getDocFromServer } from 'firebase/firestore';
import { reviewReport } from '../lib/review-report.ts';
import { callableEmulator } from './support/callable-emulator.ts';

for (const role of ['station_admin', 'moderator']) {
  void test(`${role}: real callable enforces station scope and reserves account disabling for super admins`,
    { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
      const harness = await callableEmulator({ admin: true, role, assignedStations: ['review-own'] });
      try {
        for (const root of ['HudHudDev', 'HudHudOfficial']) {
          const id = crypto.randomUUID();
          const authorId = `review-author-${id}`;
          const target = (suffix: string) => `${root}/users/users/reporter-${id}/commentReportEpisodes/${id}-${suffix}/moderationReports/comment`;
          const comment = (suffix: string) => `${root}/episodes/episodes/${id}-${suffix}/comments/comment`;
          await harness.adminDb.doc(`${root}/users/users/${authorId}`).set({ isActive: true });
          for (const suffix of ['own', 'other', 'disable']) {
            await harness.seedEpisode(root, `${id}-${suffix}`, { stationId: suffix === 'other' ? 'review-other' : 'review-own', stats: {} });
            await harness.adminDb.doc(comment(suffix)).set({ authorId, status: 'published' });
            await harness.syncComment(root, `${id}-${suffix}`, 'comment');
            await harness.adminDb.doc(target(suffix)).set({ episodeId: `${id}-${suffix}`, commentId: 'comment', reportedAuthorId: authorId, status: 'open' });
          }
          await reviewReport(harness.db, root, doc(harness.db, target('own')), 'commentHidden');
          assert.equal((await getDocFromServer(doc(harness.db, comment('own')))).get('status'), 'hidden');
          await assert.rejects(reviewReport(harness.db, root, doc(harness.db, target('other')), 'commentHidden'), { code: 'functions/permission-denied' });
          await assert.rejects(reviewReport(harness.db, root, doc(harness.db, target('disable')), 'userDisabled'), { code: 'functions/permission-denied' });
          assert.equal((await harness.adminDb.doc(comment('other')).get()).get('status'), 'published');
          assert.equal((await harness.adminDb.doc(`${root}/users/users/${authorId}`).get()).get('isActive'), true);
          assert.equal((await harness.adminDb.doc(target('other')).get()).get('status'), 'open');
        }
      } finally { await harness.close(); }
    });
}
