import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

declare const __FIREBASE_CONFIG__: Record<string, string>;

let firestorePromise: Promise<Firestore> | null = null;

export function getPublicFirestore(): Promise<Firestore> {
  firestorePromise ??= Promise.resolve().then(() => {
    const app: FirebaseApp = getApps().length > 0
      ? getApp()
      : initializeApp(__FIREBASE_CONFIG__);
    return getFirestore(app);
  }).catch((error: unknown) => {
    firestorePromise = null;
    throw error;
  });
  return firestorePromise;
}
