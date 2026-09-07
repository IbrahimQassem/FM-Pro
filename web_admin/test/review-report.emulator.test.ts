import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import { reviewReport } from '../lib/review-report.ts';

void test(
  'concurrent moderation resolves off-page reports and decrements once',
  { skip: !process.env.FIRESTORE_EMULATOR_HOST },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT;
    assert.ok(projectId?.startsWith('demo-'));
    const app = initializeApp({ projectId }, `review-${crypto.randomUUID()}`);
    const db = getFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
    connectFirestoreEmulator(db, host, Number(port), {
      mockUserToken: { sub: 'fixture-admin', admin: true },
    });
    const environment = await initializeTestEnvironment({
      projectId,
      firestore: { host, port: Number(port) },
    });
    try {
      for (const root of ['HudHudDev', 'HudHudOfficial']) {
        const id = crypto.randomUUID();
        const episodePath = `${root}/episodes/episodes/${id}`;
        const commentPath = `${episodePath}/comments/comment`;
        const reportPath = (i: number) =>
          `${root}/users/users/reporter-${id}-${i}/commentReportEpisodes/${id}/moderationReports/comment`;
        const report = {
          targetType: 'comment',
          episodeId: id,
          commentId: 'comment',
          reportedAuthorId: id,
          reason: 'spam',
          details: '',
          status: 'open',
          createdAt: new Date(),
        };
        await environment.withSecurityRulesDisabled(async (context) => {
          const seed = context.firestore().batch();
          seed.set(context.firestore().doc(episodePath), {
            stats: { commentsCount: 1 },
          });
          seed.set(context.firestore().doc(commentPath), {
            episodeId: id,
            authorId: id,
            content: 'Fixture',
            status: 'published',
          });
          seed.set(context.firestore().doc(`${root}/users/users/${id}`), {
            isActive: true,
          });
          for (let i = 0; i < 455; i++)
            seed.set(context.firestore().doc(reportPath(i)), {
              ...report,
              status: i < 55 ? 'open' : 'dismissed',
            });
          await seed.commit();
        });
        await setDoc(doc(db, episodePath), { stats: { commentsCount: 0 } });
        await assert.rejects(
          reviewReport(
            db,
            root,
            doc(db, reportPath(0)),
            'commentHidden',
            'fixture-admin',
          ),
          { name: 'ContentError' },
        );
        assert.equal(
          (await getDoc(doc(db, commentPath))).data()?.status,
          'published',
        );
        assert.equal(
          (await getDoc(doc(db, reportPath(0)))).data()?.status,
          'open',
        );
        assert.equal(
          (await getDoc(doc(db, episodePath))).data()?.stats.commentsCount,
          0,
        );
        await setDoc(doc(db, episodePath), { stats: { commentsCount: 1 } });
        const results = await Promise.allSettled([
          reviewReport(
            db,
            root,
            doc(db, reportPath(0)),
            'commentHidden',
            'fixture-admin',
          ),
          reviewReport(
            db,
            root,
            doc(db, reportPath(1)),
            'commentRemoved',
            'fixture-admin',
          ),
        ]);
        assert.equal(
          results.filter((result) => result.status === 'fulfilled').length,
          1,
        );
        assert.equal(
          (await getDoc(doc(db, episodePath))).data()?.stats.commentsCount,
          0,
        );
        assert.ok(
          ['hidden', 'removed'].includes(
            (await getDoc(doc(db, commentPath))).data()?.status,
          ),
        );
        for (let i = 0; i < 55; i++)
          assert.equal(
            (await getDoc(doc(db, reportPath(i)))).data()?.status,
            'resolved',
          );
        assert.equal(
          (await getDoc(doc(db, reportPath(55)))).data()?.status,
          'dismissed',
        );
        await assert.rejects(
          reviewReport(
            db,
            root,
            doc(db, reportPath(0)),
            'commentRemoved',
            'fixture-admin',
          ),
        );
        assert.equal(
          (await getDoc(doc(db, episodePath))).data()?.stats.commentsCount,
          0,
        );
        await environment.withSecurityRulesDisabled(async (context) => {
          await context.firestore().doc(reportPath(455)).set(report);
        });
        await reviewReport(
          db,
          root,
          doc(db, reportPath(455)),
          'userDisabled',
          'fixture-admin',
        );
        assert.equal(
          (await getDoc(doc(db, `${root}/users/users/${id}`))).data()?.isActive,
          false,
        );
        assert.equal(
          (await getDoc(doc(db, episodePath))).data()?.stats.commentsCount,
          0,
        );
        await assert.rejects(
          reviewReport(
            db,
            root === 'HudHudDev' ? 'HudHudOfficial' : 'HudHudDev',
            doc(db, reportPath(0)),
            'noAction',
            'fixture-admin',
          ),
        );
      }
    } finally {
      await environment.cleanup();
      await deleteApp(app);
    }
  },
);
