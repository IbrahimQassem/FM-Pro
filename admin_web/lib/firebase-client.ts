import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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
  await setPersistence(auth, browserLocalPersistence);
  return { app, auth, firestore: getFirestore(app) };
}
