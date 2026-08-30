import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

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
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const response = await fetch('/api/firebase-config', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Firebase configuration is unavailable.');
  }

  const config = (await response.json()) as Record<string, string>;
  const app =
    appModule.getApps().length > 0
      ? appModule.getApp()
      : appModule.initializeApp(config);
  const auth = authModule.getAuth(app);
  await authModule.setPersistence(auth, authModule.browserLocalPersistence);
  return { app, auth, firestore: firestoreModule.getFirestore(app) };
}
