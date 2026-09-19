import { belongsToRoot, type FirestoreRoot } from './firestore-environment.ts';

declare const __FIRESTORE_ROOT__: FirestoreRoot;
export const firestoreRoot: FirestoreRoot =
  typeof __FIRESTORE_ROOT__ !== 'undefined' ? __FIRESTORE_ROOT__ : 'HudHudDev';

export function assertSelectedRoot(path: string): void {
  if (!belongsToRoot(path, firestoreRoot)) {
    throw new Error('تعذر تنفيذ العملية خارج بيئة الإدارة المحددة.');
  }
}
