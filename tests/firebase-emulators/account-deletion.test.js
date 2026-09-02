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

before(async () => {
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

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(doc(firestore, episode), { stats: { commentsCount: 1 } }),
      setDoc(doc(firestore, user), {
        displayName: "Delete me",
        isActive: true,
        role: "listener",
      }),
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

  const result = await httpsCallable(functions, "deleteAccountData")();
  assert.deepEqual(result.data, { deleted: true });
  await signOut(auth);
  await assert.rejects(
    signInWithEmailAndPassword(auth, email, password),
    (error) => error?.code === "auth/invalid-credential" || error?.code === "auth/user-not-found",
  );

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    const [profile, authoredComment, favorite, block, report, episodeSnapshot] = await Promise.all([
      getDoc(doc(firestore, user)),
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
    assert.equal(authoredComment.exists(), false);
    assert.equal(favorite.exists(), false);
    assert.equal(block.exists(), false);
    assert.equal(report.exists(), false);
    assert.equal(episodeSnapshot.get("stats.commentsCount"), 0);
  });
});
