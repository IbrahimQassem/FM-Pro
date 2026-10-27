import { waitForEpisodeCount } from '../../firebase_tests/support/comment-count-fixtures.mjs';
import { callableEmulator } from './support/callable-emulator.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { reviewReport } from '../lib/review-report.ts';

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const correctedCounter of [false, true]) {
    void test(
      `${root}: ${correctedCounter ? 'corrected counter control' : 'new comment journey'}`,
      { skip: !process.env.FIRESTORE_EMULATOR_HOST },
      async () => {
        const projectId = process.env.GCLOUD_PROJECT;
        assert.ok(projectId?.startsWith('demo-'));
        const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
        const environment = await initializeTestEnvironment({
          projectId,
          firestore: { host, port: Number(port) },
        });
        const id = crypto.randomUUID();
        const apps: ReturnType<typeof initializeApp>[] = [];
        const client = (uid?: string, admin = false) => {
          const app = initializeApp({ projectId }, crypto.randomUUID());
          apps.push(app);
          const db = getFirestore(app);
          connectFirestoreEmulator(
            db,
            host,
            Number(port),
            uid
              ? {
                  mockUserToken: { sub: uid, email_verified: true, admin },
                }
              : undefined,
          );
          return db;
        };
        let harness: Awaited<ReturnType<typeof callableEmulator>> | undefined;
        try {
          const authorId = `fixture-author-${id}`;
          const reporterId = `fixture-reporter-${id}`;
          const author = client(authorId);
          const reporter = client(reporterId);
          harness = await callableEmulator();
          const admin = harness.db;
          const guest = client();
          const episodePath = `${root}/episodes/episodes/${id}`;
          const commentPath = `${episodePath}/comments/comment`;
          const reportPath = `${root}/users/users/${reporterId}/commentReportEpisodes/${id}/moderationReports/comment`;
          await harness.seedEpisode(root, id, {
            stationId: 'fixture-station', programId: 'fixture-program',
            title: 'Synthetic accepted episode', isPublished: true,
            broadcastAt: new Date(), priority: 0,
            stats: { playsCount: 0, likesCount: 0 },
          });
          await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            const batch = db.batch();
            for (const uid of [authorId, reporterId]) {
              batch.set(db.doc(`${root}/users/users/${uid}`), {
                displayName: 'Fixture listener',
                role: 'listener',
                isActive: true,
              });
            }
            await batch.commit();
          });
          // Schema-equivalent Flutter writes, through the real Firestore Rules.
          await setDoc(
            doc(author, `${root}/users/users/${authorId}/agreements/ugc`),
            {
              termsVersion: '2026-09-01',
              acceptedAt: serverTimestamp(),
            },
          );
          await setDoc(doc(author, commentPath), {
            episodeId: id,
            authorId,
            authorName: 'Fixture listener',
            content: 'Synthetic moderation fixture',
            createdAt: serverTimestamp(),
            isEdited: false,
            status: 'published',
          });
          assert.equal(
            (await getDocFromServer(doc(guest, commentPath))).data()?.status,
            'published',
          );
          await setDoc(doc(reporter, reportPath), {
            targetType: 'comment',
            episodeId: id,
            commentId: 'comment',
            reportedAuthorId: authorId,
            reason: 'spam',
            details: '',
            status: 'open',
            createdAt: serverTimestamp(),
          });
          if (correctedCounter) {
            // Diagnostic control uses the actual authority, never a hand-written
            // expected counter. It is distinct from the real event journeys.
            await harness.syncComment(root, id, 'comment');
          }
          await waitForEpisodeCount(harness.adminDb, root, id, 1);
          let failureName: string | null = null;
          try {
            await reviewReport(
              admin,
              root,
              doc(admin, reportPath),
              'commentHidden',
            );
          } catch (error) {
            failureName = error instanceof Error ? error.name : 'UnknownError';
          }
          const state = {
            failureName,
            comment: (await getDocFromServer(doc(admin, commentPath))).data()
              ?.status,
            report: (await getDocFromServer(doc(admin, reportPath))).data()
              ?.status,
            count: (await getDocFromServer(doc(admin, episodePath))).data()?.stats
              .commentsCount,
          };
          // Assert desired behavior. Never turn the known defect into a green test.
          assert.deepEqual(state, {
            failureName: null,
            comment: 'hidden',
            report: 'resolved',
            count: 0,
          });
          await assert.rejects(getDocFromServer(doc(guest, commentPath)), {
            code: 'permission-denied',
          });
        } finally {
          await harness?.close();
          await environment.cleanup();
          await Promise.all(apps.map(deleteApp));
        }
      },
    );
  }
}

// This path cannot pass through moderation alone: onCreated does not run again
// for a later status write or deletion. No manual review/reconciliation intervenes.
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  void test(`${root}: actual comment write handler converges later status changes and deletion`,
    { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
      const harness = await callableEmulator();
      const id = `write-worker-${crypto.randomUUID()}`, authorId = `worker-author-${id}`;
      const comment = harness.adminDb.doc(`${root}/episodes/episodes/${id}/comments/worker-comment`);
      const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT }, crypto.randomUUID());
      const client = getFirestore(app);
      const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
      connectFirestoreEmulator(client, host, Number(port), { mockUserToken: { sub: authorId, email_verified: true } });
      try {
        await harness.seedEpisode(root, id, { stationId: 'worker-station', programId: 'worker-program', title: 'Worker event fixture', isPublished: true, stats: {} });
        await harness.adminDb.doc(`${root}/users/users/${authorId}`).set({ displayName: 'Synthetic listener', role: 'listener', isActive: true });
        await setDoc(doc(client, `${root}/users/users/${authorId}/agreements/ugc`), { termsVersion: '2026-09-01', acceptedAt: serverTimestamp() });
        await setDoc(doc(client, comment.path), { episodeId: id, authorId, authorName: 'Synthetic listener', content: 'Synthetic event worker fixture', createdAt: serverTimestamp(), isEdited: false, status: 'published' });
        assert.equal((await comment.get()).get('status'), 'published', 'Healthy real client comment creation precedes the worker assertion');
        await waitForEpisodeCount(harness.adminDb, root, id, 1, { requireModeratedComment: comment.id });
        await comment.update({ status: 'hidden' });
        assert.equal((await comment.get()).get('status'), 'hidden', 'The direct status write must succeed before count convergence is asserted');
        await waitForEpisodeCount(harness.adminDb, root, id, 0);
        await comment.update({ status: 'published' });
        await waitForEpisodeCount(harness.adminDb, root, id, 1);
        await comment.delete();
        await waitForEpisodeCount(harness.adminDb, root, id, 0);
        assert.equal((await comment.get()).exists, false);
      } finally { await deleteApp(app); await harness.close(); }
    });
}
