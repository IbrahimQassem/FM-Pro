import { createRequire } from 'node:module';
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";

const projectId = "demo-hudhud-fm-email-verification";
const email = "verify-me@example.test";
const password = "integration-password";
let testEnvironment;
let auth;
let functions;
let emailServer;
let deliveredCode;
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp: initializeAdminApp } = require('firebase-admin/app');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');
const adminAuth = getAdminAuth(initializeAdminApp({ projectId }, 'email-test-admin'));

before(async () => {
  emailServer = createServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      const payload = JSON.parse(body);
      deliveredCode = /\b\d{6}\b/.exec(payload.text)?.[0];
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"id":"test-email"}');
    });
  });
  await new Promise((resolve) => emailServer.listen(8787, "127.0.0.1", resolve));

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
  await new Promise((resolve, reject) => {
    emailServer.close((error) => (error ? reject(error) : resolve()));
  });
});

test("delivers a code, verifies Auth, and creates the canonical profile", async () => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: "Verified listener" });

  const requested = await httpsCallable(
    functions,
    "requestEmailVerificationCode",
  )();
  assert.equal(requested.data.sent, true);
  assert.match(deliveredCode, /^\d{6}$/);

  const verified = await httpsCallable(functions, "verifyEmailCode")({
    code: deliveredCode,
  });
  assert.deepEqual(verified.data, { verified: true });
  await auth.currentUser.reload();
  assert.equal(auth.currentUser.emailVerified, true);

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    const profile = await getDoc(
      doc(firestore, `HudHudDev/users/users/${credential.user.uid}`),
    );
    const challenge = await getDoc(
      doc(
        firestore,
        `HudHudDev/emailVerificationChallenges/challenges/${credential.user.uid}`,
      ),
    );
    assert.equal(profile.get("displayName"), "Verified listener");
    assert.equal(profile.get("role"), "listener");
    assert.equal(challenge.exists(), false);
  });

  await assert.rejects(
    httpsCallable(functions, "verifyEmailCode")({ code: deliveredCode }),
    (error) => error.code === "functions/not-found",
  );
});

test("rejects a wrong code and preserves the remaining attempt count", async () => {
  await signOut(auth);
  const credential = await signInAnonymously(auth);
  await httpsCallable(functions, "requestEmailVerificationCode")({
    email: "wrong-code@example.test",
  });
  const correctCode = deliveredCode;
  const wrongCode = correctCode === "000000" ? "000001" : "000000";

  await assert.rejects(
    httpsCallable(functions, "verifyEmailCode")({ code: wrongCode }),
    (error) => error.code === "functions/invalid-argument",
  );
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const challenge = await getDoc(
      doc(
        context.firestore(),
        `HudHudDev/emailVerificationChallenges/challenges/${credential.user.uid}`,
      ),
    );
    assert.equal(challenge.get("attemptsRemaining"), 4);
    assert.equal(challenge.get("status"), "active");
  });

  await httpsCallable(functions, "verifyEmailCode")({ code: correctCode });
});

test("expires and locks challenges without exposing them to clients", async () => {
  await signOut(auth);
  const expiredCredential = await signInAnonymously(auth);
  await httpsCallable(functions, "requestEmailVerificationCode")({
    email: "expired-code@example.test",
  });
  const expiredCode = deliveredCode;
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(
      doc(
        context.firestore(),
        `HudHudDev/emailVerificationChallenges/challenges/${expiredCredential.user.uid}`,
      ),
      { expiresAt: Timestamp.fromMillis(Date.now() - 1_000) },
    );
  });
  await assert.rejects(
    httpsCallable(functions, "verifyEmailCode")({ code: expiredCode }),
    (error) => error.code === "functions/deadline-exceeded",
  );

  await signOut(auth);
  const lockedCredential = await signInAnonymously(auth);
  await httpsCallable(functions, "requestEmailVerificationCode")({
    email: "locked-code@example.test",
  });
  const lockedCode = deliveredCode;
  const wrongLockedCode = lockedCode === "000000" ? "000001" : "000000";
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await updateDoc(
      doc(
        context.firestore(),
        `HudHudDev/emailVerificationChallenges/challenges/${lockedCredential.user.uid}`,
      ),
      { attemptsRemaining: 1 },
    );
  });
  await assert.rejects(
    httpsCallable(functions, "verifyEmailCode")({ code: wrongLockedCode }),
    (error) => error.code === "functions/resource-exhausted",
  );

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const expired = await getDoc(
      doc(
        context.firestore(),
        `HudHudDev/emailVerificationChallenges/challenges/${expiredCredential.user.uid}`,
      ),
    );
    const locked = await getDoc(
      doc(
        context.firestore(),
        `HudHudDev/emailVerificationChallenges/challenges/${lockedCredential.user.uid}`,
      ),
    );
    assert.equal(expired.get("status"), "expired");
    assert.equal(locked.get("status"), "locked");
    assert.equal(locked.get("attemptsRemaining"), 0);
  });
});

test("limits delivery to the same email across different accounts", async () => {
  await signOut(auth);
  const requestCode = httpsCallable(functions, "requestEmailVerificationCode");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await signInAnonymously(auth);
    const result = await requestCode({ email: "shared-rate-limit@example.test" });
    assert.equal(result.data.sent, true);
    if (attempt === 0) {
      await assert.rejects(
        requestCode({ email: "shared-rate-limit@example.test" }),
        (error) => error.code === "functions/resource-exhausted",
      );
    }
    await signOut(auth);
  }

  await signInAnonymously(auth);
  await assert.rejects(
    requestCode({ email: "shared-rate-limit@example.test" }),
    (error) => error.code === "functions/resource-exhausted",
  );
});

test('rejects the correct code after lockout and never spends further attempts', async () => {
  await signOut(auth);
  const { user } = await signInAnonymously(auth);
  await httpsCallable(functions, 'requestEmailVerificationCode')({ email: 'locked-correct@example.test', root: 'HudHudOfficial' });
  const code = deliveredCode;
  const path = `HudHudOfficial/emailVerificationChallenges/challenges/${user.uid}`;
  await testEnvironment.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), path), { status: 'locked', attemptsRemaining: 0 }));
  for (const attempt of [code, code === '000000' ? '000001' : '000000']) {
    await assert.rejects(httpsCallable(functions, 'verifyEmailCode')({ code: attempt, root: 'HudHudOfficial' }), (error) => error.code === 'functions/resource-exhausted');
  }
  await user.reload();
  assert.equal(user.emailVerified, false);
});

test('only one concurrent verification consumes the proof in Official', async () => {
  await signOut(auth);
  const { user } = await signInAnonymously(auth);
  await httpsCallable(functions, 'requestEmailVerificationCode')({ email: 'concurrent@example.test', root: 'HudHudOfficial' });
  const request = { code: deliveredCode, root: 'HudHudOfficial' };
  const results = await Promise.allSettled([httpsCallable(functions, 'verifyEmailCode')(request), httpsCallable(functions, 'verifyEmailCode')(request)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  await assert.rejects(httpsCallable(functions, 'verifyEmailCode')(request));
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    assert.equal((await getDoc(doc(context.firestore(), `HudHudOfficial/users/users/${user.uid}`))).exists(), true);
    assert.equal((await getDoc(doc(context.firestore(), `HudHudDev/users/users/${user.uid}`))).exists(), false);
  });
});

test('recovers accepted proof through profile callable without reusing code', async () => {
  await signOut(auth);
  const { user } = await signInAnonymously(auth);
  await httpsCallable(functions, 'requestEmailVerificationCode')({ email: 'recover@example.test' });
  const code = deliveredCode;
  const path = `HudHudDev/emailVerificationChallenges/challenges/${user.uid}`;
  await testEnvironment.withSecurityRulesDisabled(async (context) => updateDoc(doc(context.firestore(), path), {
    status: 'consumed', operationId: 'accepted-proof-test', leaseUntil: Timestamp.fromMillis(0), consumedAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(0), resendAvailableAt: Timestamp.fromMillis(0),
  }));
  await assert.rejects(httpsCallable(functions, 'verifyEmailCode')({ code }), (error) => error.code === 'functions/not-found');
  await assert.rejects(httpsCallable(functions, 'requestEmailVerificationCode')({ email: 'replacement@example.test' }), (error) => error.code === 'functions/failed-precondition');
  assert.equal((await httpsCallable(functions, 'ensureAccountProfile')()).data.ready, true);
  const recovered = await adminAuth.getUser(user.uid);
  assert.equal(recovered.emailVerified, true);
  assert.equal(recovered.email, 'recover@example.test');
});

test('rejects unknown roots and unverified provisioning, and persists validated profile edits', async () => {
  await signOut(auth);
  await createUserWithEmailAndPassword(auth, 'profile-edit@example.test', password);
  for (const name of ['requestEmailVerificationCode', 'verifyEmailCode', 'ensureAccountProfile', 'updateAccountProfile']) {
    await assert.rejects(httpsCallable(functions, name)({ root: 'Unknown' }), (error) => error.code === 'functions/invalid-argument');
  }
  await assert.rejects(httpsCallable(functions, 'ensureAccountProfile')(), (error) => error.code === 'functions/failed-precondition');
  await httpsCallable(functions, 'requestEmailVerificationCode')();
  await httpsCallable(functions, 'verifyEmailCode')({ code: deliveredCode });
  const edit = httpsCallable(functions, 'updateAccountProfile');
  await assert.rejects(edit({ displayName: 'Listener', avatarUrl: '/private/tmp/photo.jpg' }), (error) => error.code === 'functions/invalid-argument');
  await assert.rejects(edit({ displayName: 'Listener', avatarUrl: 'https://name:password@example.test/photo' }), (error) => error.code === 'functions/invalid-argument');
  assert.equal((await edit({ displayName: 'Updated listener', avatarUrl: 'assets/images/mascot/mascot_onboarding.webp', role: 'admin' })).data.updated, true);
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const profile = await getDoc(doc(context.firestore(), `HudHudDev/users/users/${auth.currentUser.uid}`));
    assert.equal(profile.get('displayName'), 'Updated listener');
    assert.equal(profile.get('role'), 'listener');
    assert.equal(profile.get('avatarUrl'), 'assets/images/mascot/mascot_onboarding.webp');
  });
});

test('downstream Auth failure retains proof and allows recovery after conflict resolution', async () => {
  await signOut(auth);
  const { user } = await signInAnonymously(auth);
  await httpsCallable(functions, 'requestEmailVerificationCode')({ email: 'conflict-recovery@example.test' });
  const code = deliveredCode;
  const conflicting = await adminAuth.createUser({ email: 'conflict-recovery@example.test' });
  await assert.rejects(httpsCallable(functions, 'verifyEmailCode')({ code }), (error) => error.code === 'functions/already-exists');
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const pending = await getDoc(doc(context.firestore(), `HudHudDev/emailVerificationChallenges/challenges/${user.uid}`));
    assert.equal(pending.get('status'), 'consumed');
    assert.equal(pending.get('leaseUntil').toMillis(), 0);
  });
  await assert.rejects(httpsCallable(functions, 'verifyEmailCode')({ code }), (error) => error.code === 'functions/not-found');
  await adminAuth.deleteUser(conflicting.uid);
  assert.equal((await httpsCallable(functions, 'ensureAccountProfile')()).data.ready, true);
  assert.equal((await adminAuth.getUser(user.uid)).emailVerified, true);
});

test('linked social provider cannot promote unverified Auth email', async () => {
  await signOut(auth);
  const uid = 'unverified-linked-social';
  await adminAuth.importUsers([{ uid, email: 'linked-social@example.test', emailVerified: false, providerData: [{ providerId: 'facebook.com', uid: 'facebook-linked-id' }] }]);
  await adminAuth.updateUser(uid, { password });
  await signInWithEmailAndPassword(auth, 'linked-social@example.test', password);
  await assert.rejects(httpsCallable(functions, 'ensureAccountProfile')({ root: 'HudHudOfficial' }), (error) => error.code === 'functions/failed-precondition');
  assert.equal((await adminAuth.getUser(uid)).emailVerified, false);
});
