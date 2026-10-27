import { callableEmulator } from '../../web_admin/test/support/callable-emulator.ts';
import { ensureDemoCountRoots, seedCountedEpisode, syncFixtureComment, deleteFixtureCommentAtomically } from '../support/comment-count-fixtures.mjs';
import { createRequire } from 'node:module';
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, setDoc } from "firebase/firestore";

const projectId = "demo-hudhud-fm-account-deletion";
const password = "integration-password";
let testEnvironment;
let auth;
let functions;
let adminAuth;
let adminFirestore;
let cleanupUnverifiedAccounts;

before(async () => {
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator must be configured');
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator must be configured');
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  await ensureDemoCountRoots();
  ({ cleanupUnverifiedAccounts } = await import('../../functions/index.js'));
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  adminAuth = require('firebase-admin/auth').getAuth();
  adminFirestore = require('firebase-admin/firestore').getFirestore();
  testEnvironment = await initializeTestEnvironment({ projectId });
  const app = initializeApp({ apiKey: "demo-key", projectId });
  auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  functions = getFunctions(app);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
});

after(async () => {
  await signOut(auth).catch(() => undefined);
  await testEnvironment.cleanup();
});

test("deletes Auth, authored comments, dependent data, and reconciles counts", async () => {
  const email = "delete-me@example.test";
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;
  const otherUid = "other-listener";
  const episode = "HudHudDev/episodes/episodes/episode-1";
  const comment = `${episode}/comments/comment-1`;
  const user = `HudHudDev/users/users/${uid}`;
  const challenge = `HudHudDev/emailVerificationChallenges/challenges/${uid}`;

  await seedCountedEpisode(adminFirestore, 'HudHudDev', 'episode-1', { stats: {} });
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(doc(firestore, user), {
        displayName: "Delete me",
        isActive: true,
        role: "listener",
      }),
      setDoc(doc(firestore, challenge), {
        codeHash: "private-hash",
        status: "active",
      }),
      setDoc(doc(firestore, `${user}/alertDevices/test-device`), { token: 'synthetic-device-registration', updatedAt: new Date() }),
      setDoc(doc(firestore, 'notificationDeviceOwners/test-device'), { uid, root: 'HudHudDev', updatedAt: new Date() }),
      setDoc(doc(firestore, `${user}/favorites/station-1`), {
        targetType: "station",
        targetId: "station-1",
      }),
      setDoc(doc(firestore, `${user}/subscriptions/program-1`), {
        targetType: "program",
        targetId: "program-1",
      }),
      setDoc(doc(firestore, comment), {
        episodeId: "episode-1",
        authorId: uid,
        authorName: "Delete me",
        content: "A comment to delete",
        status: "published",
      }),
      setDoc(doc(firestore, `HudHudDev/users/users/${otherUid}/blockedUsers/${uid}`), {
        blockedUserId: uid,
      }),
      setDoc(
        doc(
          firestore,
          `HudHudDev/users/users/${otherUid}/userReportTargets/${uid}/moderationReports/comment-1`,
        ),
        {
          targetType: "user",
          episodeId: "episode-1",
          commentId: "comment-1",
          reportedAuthorId: uid,
          status: "open",
        },
      ),
    ]);
  });

  await syncFixtureComment(adminFirestore, 'HudHudDev', 'episode-1', 'comment-1');

  const result = await httpsCallable(functions, "deleteAccountData")();
  assert.deepEqual(result.data, { deleted: true });
  assert.equal((await adminFirestore.doc("notificationDeviceOwners/test-device").get()).exists, false);
  assert.equal((await adminFirestore.doc(`${user}/alertDevices/test-device`).get()).exists, false);
  await signOut(auth);
  await assert.rejects(
    signInWithEmailAndPassword(auth, email, password),
    (error) => error?.code === "auth/invalid-credential" || error?.code === "auth/user-not-found",
  );

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    const [profile, verification, authoredComment, favorite, block, report, episodeSnapshot] = await Promise.all([
      getDoc(doc(firestore, user)),
      getDoc(doc(firestore, challenge)),
      getDoc(doc(firestore, comment)),
      getDoc(doc(firestore, `${user}/favorites/station-1`)),
      getDoc(doc(firestore, `HudHudDev/users/users/${otherUid}/blockedUsers/${uid}`)),
      getDoc(
        doc(
          firestore,
          `HudHudDev/users/users/${otherUid}/userReportTargets/${uid}/moderationReports/comment-1`,
        ),
      ),
      getDoc(doc(firestore, episode)),
    ]);
    assert.equal(profile.exists(), false);
    assert.equal(verification.exists(), false);
    assert.equal(authoredComment.exists(), false);
    assert.equal(favorite.exists(), false);
    assert.equal(block.exists(), false);
    assert.equal(report.exists(), false);
    assert.equal(episodeSnapshot.get("stats.commentsCount"), 0);
  });
});

test('cleans both canonical roots and keeps unrelated paths despite matching identity and episode IDs', async () => {
  const { user } = await createUserWithEmailAndPassword(auth, 'dual-root-delete@example.test', password);
  const uid = user.uid;
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const root of ['HudHudDev', 'HudHudOfficial', 'UnrelatedRoot']) {
      await setDoc(doc(db, `${root}/users/users/${uid}`), { isActive: true, role: 'listener' });
      await setDoc(doc(db, `${root}/users/users/${uid}/favorites/item`), { targetId: 'item' });
      if (root === 'UnrelatedRoot') await setDoc(doc(db, `${root}/episodes/episodes/shared-id`), { stats: { commentsCount: 2 } });
      else await seedCountedEpisode(adminFirestore, root, 'shared-id', { stats: {} });
      await setDoc(doc(db, `${root}/episodes/episodes/shared-id/comments/mine`), { authorId: uid, episodeId: 'untrusted-field', status: 'published' });
      await setDoc(doc(db, `${root}/episodes/episodes/shared-id/comments/other`), { authorId: 'other', status: 'published' });
      if (root !== 'UnrelatedRoot') {
        await syncFixtureComment(adminFirestore, root, 'shared-id', 'mine');
        await syncFixtureComment(adminFirestore, root, 'shared-id', 'other');
      }
    }
    await setDoc(doc(db, `HudHudDev/unrelated/items/nested/comments/item`), { authorId: uid });
    // Actual atomic deletion commits before a synthetic lost acknowledgement.
    // Recovery replays a valid zero contribution; no unsafe recount control.
    await seedCountedEpisode(adminFirestore, 'HudHudOfficial', 'retry-id', { stats: {} });
    await adminFirestore.doc('HudHudOfficial/episodes/episodes/retry-id/comments/lost-ack').set({ authorId: uid, status: 'published' });
    await syncFixtureComment(adminFirestore, 'HudHudOfficial', 'retry-id', 'lost-ack');
    await assert.rejects(async () => {
      await deleteFixtureCommentAtomically(adminFirestore, 'HudHudOfficial', 'retry-id', 'lost-ack');
      throw new Error('Synthetic acknowledgement lost after atomic deletion');
    }, /acknowledgement lost/);
    await setDoc(doc(db, `HudHudOfficial/accountDeletionRequests/requests/${uid}`), { affectedEpisodePaths: ['HudHudOfficial/episodes/episodes/retry-id'] });
  });
  assert.equal((await httpsCallable(functions, 'deleteAccountData')()).data.deleted, true);
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const root of ['HudHudDev', 'HudHudOfficial']) {
      for (const path of [`${root}/users/users/${uid}`, `${root}/users/users/${uid}/favorites/item`, `${root}/episodes/episodes/shared-id/comments/mine`]) assert.equal((await getDoc(doc(db, path))).exists(), false, path);
      assert.equal((await getDoc(doc(db, `${root}/episodes/episodes/shared-id`))).get('stats.commentsCount'), 1);
      const barrier = await getDoc(doc(db, `${root}/accountDeletionRequests/requests/${uid}`));
      assert.equal(barrier.get('status'), 'completed');
      assert.deepEqual(Object.keys(barrier.data()).sort(), ['expiresAt', 'status']);
    }
    assert.equal((await getDoc(doc(db, 'HudHudOfficial/episodes/episodes/retry-id'))).get('stats.commentsCount'), 0);
    assert.equal((await getDoc(doc(db, `UnrelatedRoot/users/users/${uid}`))).exists(), true);
    assert.equal((await getDoc(doc(db, 'UnrelatedRoot/episodes/episodes/shared-id/comments/mine'))).exists(), true);
    assert.equal((await getDoc(doc(db, 'HudHudDev/unrelated/items/nested/comments/item'))).exists(), true);
  });
  await signOut(auth);
});

test('scheduled retention protects sibling-root lifecycle states and removes only eligible identities and expired markers', async () => {
  const stale = new Date(Date.now() - 31 * 86400000);
  const now = new Date();
  const users = ['cleanup-profile', 'cleanup-active', 'cleanup-consumed', 'cleanup-eligible', 'cleanup-existing-marker'];
  for (const uid of users) await adminAuth.createUser({ uid, email: `${uid}@example.test`, emailVerified: false });
  const challengePath = (uid, root = 'HudHudDev') => `${root}/emailVerificationChallenges/challenges/${uid}`;
  const jobPath = (uid) => `HudHudDev/accountDeletionRequests/requests/${uid}`;
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const uid of users.slice(0, 4)) await setDoc(doc(db, challengePath(uid)), { status: 'expired', createdAt: stale });
    await setDoc(doc(db, 'HudHudOfficial/users/users/cleanup-profile'), { isActive: true, role: 'listener', displayName: 'Protected listener' });
    await setDoc(doc(db, challengePath('cleanup-active', 'HudHudOfficial')), { status: 'active', createdAt: now });
    await setDoc(doc(db, challengePath('cleanup-consumed', 'HudHudOfficial')), { status: 'consumed', createdAt: stale });
    for (const uid of ['cleanup-absent-marker', 'cleanup-existing-marker', 'cleanup-renewed-marker']) await setDoc(doc(db, jobPath(uid)), { status: 'completed', expiresAt: new Date(Date.now() - 1000) });
    await setDoc(doc(db, jobPath('cleanup-future-marker')), { status: 'completed', expiresAt: new Date(Date.now() + 86400000) });
    await setDoc(doc(db, jobPath('cleanup-running-marker')), { status: 'running', expiresAt: new Date(Date.now() - 1000) });
  });
  // Renew after the sweep's query but before its conditional transaction.
  const originalGetUser = adminAuth.getUser.bind(adminAuth);
  let renewed = false;
  adminAuth.getUser = async (uid) => {
    if (uid === 'cleanup-renewed-marker' && !renewed) {
      renewed = true;
      await adminFirestore.doc(jobPath(uid)).update({ expiresAt: new Date(Date.now() + 86400000) });
    }
    return originalGetUser(uid);
  };
  try { await cleanupUnverifiedAccounts.run({}); }
  finally { adminAuth.getUser = originalGetUser; }
  assert.equal(renewed, true);
  for (const uid of ['cleanup-profile', 'cleanup-active', 'cleanup-consumed', 'cleanup-existing-marker']) assert.equal((await adminAuth.getUser(uid)).uid, uid);
  await assert.rejects(adminAuth.getUser('cleanup-eligible'), (error) => error.code === 'auth/user-not-found');
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    assert.equal((await getDoc(doc(db, 'HudHudOfficial/users/users/cleanup-profile'))).get('isActive'), true);
    assert.equal((await getDoc(doc(db, challengePath('cleanup-profile')))).exists(), false);
    assert.equal((await getDoc(doc(db, challengePath('cleanup-active', 'HudHudOfficial')))).get('status'), 'active');
    assert.equal((await getDoc(doc(db, challengePath('cleanup-consumed', 'HudHudOfficial')))).get('status'), 'consumed');
    assert.equal((await getDoc(doc(db, challengePath('cleanup-eligible')))).exists(), false);
    assert.equal((await getDoc(doc(db, jobPath('cleanup-eligible')))).get('status'), 'completed');
    assert.equal((await getDoc(doc(db, jobPath('cleanup-absent-marker')))).exists(), false);
    for (const uid of ['cleanup-existing-marker', 'cleanup-future-marker', 'cleanup-running-marker', 'cleanup-renewed-marker']) assert.equal((await getDoc(doc(db, jobPath(uid)))).exists(), true, uid);
    for (const uid of ['cleanup-profile', 'cleanup-active', 'cleanup-consumed']) {
      for (const root of ['HudHudDev', 'HudHudOfficial']) assert.equal((await getDoc(doc(db, `${root}/accountDeletionRequests/requests/${uid}`))).exists(), false);
    }
  });
});


test('canonical authored orphan comments are removed in bounded pages without recreating either root parent', async () => {
  const { user } = await createUserWithEmailAndPassword(auth, 'orphan-cleanup@example.test', password);
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    await adminFirestore.doc(`${root}/users/users/${user.uid}`).set({ isActive: true, role: 'listener' });
    const batch = adminFirestore.batch();
    for (let index = 0; index < 26; index++) batch.set(adminFirestore.doc(`${root}/episodes/episodes/missing-parent/comments/orphan-${index}`), { authorId: user.uid, status: 'published' });
    await batch.commit();
  }
  assert.equal((await httpsCallable(functions, 'deleteAccountData')()).data.deleted, true);
  for (const root of ['HudHudDev', 'HudHudOfficial']) {
    assert.equal((await adminFirestore.collection(`${root}/episodes/episodes/missing-parent/comments`).get()).empty, true);
    assert.equal((await adminFirestore.doc(`${root}/episodes/episodes/missing-parent`).get()).exists, false);
    assert.equal((await adminFirestore.doc(`${root}/commentCountContributions/episodes/missing-parent`).get()).exists, false);
  }
  await assert.rejects(adminAuth.getUser(user.uid), error => error.code === 'auth/user-not-found');
  await signOut(auth);
});

test('unaccepted legacy count state refuses account cleanup without guessing a baseline or deleting Auth', async () => {
  const { user } = await createUserWithEmailAndPassword(auth, 'legacy-count-refusal@example.test', password);
  const episodeId = `legacy-count-${crypto.randomUUID()}`;
  try {
    for (const root of ['HudHudDev', 'HudHudOfficial']) {
      await adminFirestore.doc(`${root}/users/users/${user.uid}`).set({ isActive: true, role: 'listener' });
      // Deliberate preexisting corruption: no accepted baseline. This is not a
      // valid creation helper and must never be normalized by normal deletion.
      await adminFirestore.doc(`${root}/episodes/episodes/${episodeId}`).set({ stats: { commentsCount: 9 } });
      await adminFirestore.doc(`${root}/episodes/episodes/${episodeId}/comments/legacy`).set({ authorId: user.uid, status: 'published' });
    }
    await assert.rejects(httpsCallable(functions, 'deleteAccountData')(), error => error.code === 'functions/failed-precondition' && error.details?.retryable === true);
    assert.equal((await adminAuth.getUser(user.uid)).uid, user.uid);
    for (const root of ['HudHudDev', 'HudHudOfficial']) {
      assert.equal((await adminFirestore.doc(`${root}/episodes/episodes/${episodeId}`).get()).get('stats.commentsCount'), 9);
      assert.equal((await adminFirestore.doc(`${root}/episodes/episodes/${episodeId}/comments/legacy`).get()).exists, true);
      assert.equal((await adminFirestore.doc(`${root}/commentCountContributions/episodes/${episodeId}`).get()).exists, false);
      assert.notEqual((await adminFirestore.doc(`${root}/accountDeletionRequests/requests/${user.uid}`).get()).get('status'), 'completed');
    }
  } finally {
    // Exact synthetic fixture cleanup, after observing retained Auth/barriers.
    for (const root of ['HudHudDev', 'HudHudOfficial']) {
      await adminFirestore.doc(`${root}/episodes/episodes/${episodeId}/comments/legacy`).delete();
      await adminFirestore.doc(`${root}/episodes/episodes/${episodeId}`).delete();
      await adminFirestore.doc(`${root}/users/users/${user.uid}`).delete();
      await adminFirestore.doc(`${root}/accountDeletionRequests/requests/${user.uid}`).delete();
    }
    await adminAuth.deleteUser(user.uid).catch(error => { if (error.code !== 'auth/user-not-found') throw error; });
    await signOut(auth);
  }
});


test('actual manual review and account deletion races converge to zero in both roots', async () => {
  const { user } = await createUserWithEmailAndPassword(auth, 'count-review-race@example.test', password);
  const harness = await callableEmulator();
  const fixtures = [];
  try {
    for (const root of ['HudHudDev', 'HudHudOfficial']) {
      const id = `review-delete-${crypto.randomUUID()}`;
      await seedCountedEpisode(adminFirestore, root, id, { stationId: 'synthetic-race-station', stats: {} });
      await adminFirestore.doc(`${root}/users/users/${user.uid}`).set({ isActive: true, role: 'listener' });
      const commentPath = `${root}/episodes/episodes/${id}/comments/raced-comment`;
      const reportPath = `${root}/users/users/synthetic-reporter/commentReportEpisodes/${id}/moderationReports/raced-comment`;
      await adminFirestore.doc(commentPath).set({ authorId: user.uid, content: 'Synthetic review race fixture', status: 'published' });
      await syncFixtureComment(adminFirestore, root, id, 'raced-comment');
      await adminFirestore.doc(reportPath).set({ episodeId: id, commentId: 'raced-comment', reportedAuthorId: user.uid, status: 'open' });
      fixtures.push({ root, id, commentPath, reportPath });
    }
    const results = await Promise.allSettled([
      ...fixtures.map(fixture => httpsCallable(getFunctions(harness.app), 'adminReviewReport')({ root: fixture.root, path: fixture.reportPath, resolution: 'commentHidden' })),
      httpsCallable(functions, 'deleteAccountData')(),
    ]);
    const deleted = results.at(-1);
    assert.equal(deleted.status, 'fulfilled', 'Real account deletion must finish despite concurrent manual decisions');
    assert.equal(deleted.value.data.deleted, true);
    for (const result of results.slice(0, -1)) {
      if (result.status === 'rejected') {
        assert.equal(result.reason.code, 'functions/failed-precondition');
        assert.match(result.reason.message, /already reviewed/, 'Only an already-removed/resolved report may reject a raced review');
      }
    }
    for (const fixture of fixtures) {
      assert.equal((await adminFirestore.doc(fixture.commentPath).get()).exists, false);
      assert.equal((await adminFirestore.doc(`${fixture.root}/episodes/episodes/${fixture.id}`).get()).get('stats.commentsCount'), 0);
      assert.equal((await adminFirestore.doc(`${fixture.root}/accountDeletionRequests/requests/${user.uid}`).get()).get('status'), 'completed');
    }
    await assert.rejects(adminAuth.getUser(user.uid), error => error.code === 'auth/user-not-found');
  } finally { await harness.close(); await signOut(auth); }
});
