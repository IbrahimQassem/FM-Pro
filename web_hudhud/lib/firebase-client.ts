import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

declare const __FIREBASE_CONFIG__: Record<string, string>;

export function getPublicApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(__FIREBASE_CONFIG__);
}

let firestorePromise: Promise<Firestore> | null = null;

export function getPublicFirestore(): Promise<Firestore> {
  firestorePromise ??= Promise.resolve().then(() => {
    const app = getPublicApp();
    return getFirestore(app);
  }).catch((error: unknown) => {
    firestorePromise = null;
    throw error;
  });
  return firestorePromise;
}
