import { belongsToRoot, type FirestoreRoot } from './firestore-environment';

declare const __FIRESTORE_ROOT__: FirestoreRoot;
export const firestoreRoot = __FIRESTORE_ROOT__;

export function assertSelectedRoot(path: string): void {
  if (!belongsToRoot(path, firestoreRoot)) {
    throw new Error('تعذر تنفيذ العملية خارج بيئة الإدارة المحددة.');
  }
}
