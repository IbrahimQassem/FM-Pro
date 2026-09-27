// Manual PL-03 acceptance probe. See docs/operations/ecc-pilot.md.
// Intentionally excluded from *.test.ts until PL-03 fixes the failing journey.
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

const projectId = process.env.GCLOUD_PROJECT;
assert.equal(projectId, 'demo-hudhud-ecc-pilot');
assert.match(
  process.env.FIRESTORE_EMULATOR_HOST ?? '',
  /^(127\.0\.0\.1|localhost):\d+$/,
);
const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const correctedCounter of [false, true]) {
    void test(`${root}: ${correctedCounter ? 'corrected counter control' : 'new comment journey'}`, async () => {
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
      try {
        const authorId = `fixture-author-${id}`;
        const reporterId = `fixture-reporter-${id}`;
        const author = client(authorId);
        const reporter = client(reporterId);
        const admin = client('fixture-admin', true);
        const guest = client();
        const episodePath = `${root}/episodes/episodes/${id}`;
        const commentPath = `${episodePath}/comments/comment`;
        const reportPath = `${root}/users/users/${reporterId}/commentReportEpisodes/${id}/moderationReports/comment`;
        await environment.withSecurityRulesDisabled(async (context) => {
          const db = context.firestore();
          const batch = db.batch();
          batch.set(db.doc(episodePath), {
            stationId: 'fixture-station',
            stats: { playsCount: 0, likesCount: 0, commentsCount: 0 },
          });
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
          // Diagnostic control only; this is not a proposed client-side fix.
          await setDoc(
            doc(admin, episodePath),
            { stats: { commentsCount: 1 } },
            { merge: true },
          );
        }
        let failureName: string | null = null;
        try {
          await reviewReport(
            admin,
            root,
            doc(admin, reportPath),
            'commentHidden',
            'fixture-admin',
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
        await environment.cleanup();
        await Promise.all(apps.map(deleteApp));
      }
    });
  }
}
