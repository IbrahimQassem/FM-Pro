import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  inMemoryPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

declare const __USE_FIREBASE_EMULATORS__: boolean;
declare const __FIREBASE_CONFIG__: Record<string, string>;

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

let servicesPromise: Promise<FirebaseServices> | null = null;

export function getFirebaseServices(): Promise<FirebaseServices> {
  servicesPromise ??= initializeServices();
  return servicesPromise;
}

async function initializeServices(): Promise<FirebaseServices> {
  const app =
    getApps().length > 0 ? getApp() : initializeApp(__FIREBASE_CONFIG__);
  const auth = getAuth(app);
  const firestore = configureEmulators(app, auth);
  await setPersistence(auth, browserLocalPersistence);
  return { app, auth, firestore };
}

// Public deletion must not reuse or replace an administrator's persisted session.
let deletionServicesPromise: Promise<FirebaseServices> | null = null;
export function getAccountDeletionServices(): Promise<FirebaseServices> {
  deletionServicesPromise ??= (async () => {
    const app =
      getApps().find((candidate) => candidate.name === 'account-deletion') ??
      initializeApp(__FIREBASE_CONFIG__, 'account-deletion');
    const auth = getAuth(app);
    const firestore = configureEmulators(app, auth);
    await setPersistence(auth, inMemoryPersistence);
    return { app, auth, firestore };
  })();
  return deletionServicesPromise;
}

function configureEmulators(app: FirebaseApp, auth: Auth): Firestore {
  const firestore = getFirestore(app);
  if (__USE_FIREBASE_EMULATORS__) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
      disableWarnings: true,
    });
    connectFirestoreEmulator(firestore, '127.0.0.1', 8180);
    connectFunctionsEmulator(getFunctions(app), '127.0.0.1', 5001);
  }
  return firestore;
}
