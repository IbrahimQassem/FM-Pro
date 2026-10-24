import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type DocumentReference,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

export async function callableEmulator(
  claims: Record<string, unknown> = { admin: true, role: 'super_admin' },
) {
  const projectId = process.env.GCLOUD_PROJECT;
  assert.ok(projectId?.startsWith('demo-'));
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'Auth emulator required');
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore emulator required');
  const require = createRequire(
    new URL('../../../functions/package.json', import.meta.url),
  );
  const {
    initializeApp: initializeAdminApp,
    deleteApp: deleteAdminApp,
  } = require('firebase-admin/app');
  const adminApp = initializeAdminApp(
    { projectId },
    `admin-${crypto.randomUUID()}`,
  );
  const adminAuth = require('firebase-admin/auth').getAuth(adminApp);
  const adminDb = require('firebase-admin/firestore').getFirestore(adminApp);
  const app = initializeApp(
    { projectId, apiKey: 'demo-key' },
    `client-${crypto.randomUUID()}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const credential = await createUserWithEmailAndPassword(
    auth,
    `admin-${crypto.randomUUID()}@example.test`,
    'synthetic-test-password',
  );
  await adminAuth.setCustomUserClaims(credential.user.uid, claims);
  await credential.user.getIdToken(true);
  connectFunctionsEmulator(getFunctions(app), '127.0.0.1', 5001);
  const db = getFirestore(app);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
  connectFirestoreEmulator(db, host, Number(port));
  return {
    app,
    db,
    adminDb,
    seed: (
      reference: DocumentReference,
      value: Record<string, unknown>,
      options?: { merge: boolean },
    ) =>
      options
        ? adminDb.doc(reference.path).set(value, options)
        : adminDb.doc(reference.path).set(value),
    close: async () => {
      await signOut(auth);
      await adminAuth.deleteUser(credential.user.uid);
      await deleteAdminApp(adminApp);
      await deleteApp(app);
    },
  };
}
