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
  signOut,
  updateProfile,
} from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";

const projectId = "demo-hudhud-fm-email-verification";
const email = "verify-me@example.test";
const password = "integration-password";
let testEnvironment;
let auth;
let functions;
let emailServer;
let deliveredCode;

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
});

test("limits delivery to the same email across different accounts", async () => {
  await signOut(auth);
  const requestCode = httpsCallable(functions, "requestEmailVerificationCode");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await signInAnonymously(auth);
    const result = await requestCode({ email: "shared-rate-limit@example.test" });
    assert.equal(result.data.sent, true);
    await signOut(auth);
  }

  await signInAnonymously(auth);
  await assert.rejects(
    requestCode({ email: "shared-rate-limit@example.test" }),
    (error) => error.code === "functions/resource-exhausted",
  );
});
