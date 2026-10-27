import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';
import { firestoreRoot } from './firestore-root.ts';
import type { FirestoreRoot } from './firestore-environment.ts';

export type UserCountResult = { root: FirestoreRoot; total: number; asOf: string };
type CountCall = (data: { root: FirestoreRoot }) => Promise<{ data: unknown }>;
export async function loadUserCount(
  firestore: Firestore,
  root: FirestoreRoot = firestoreRoot,
  invoke?: CountCall,
): Promise<UserCountResult> {
  const call = invoke ?? httpsCallable(getFunctions(firestore.app), 'adminGetUserCount');
  const { data } = await call({ root });
  const result = data as UserCountResult;
  if (!result || typeof result !== 'object' || Array.isArray(result) ||
      Object.keys(result).sort().join(',') !== 'asOf,root,total' || result.root !== root ||
      !Number.isSafeInteger(result.total) || result.total < 0 ||
      typeof result.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(result.asOf) ||
      !Number.isFinite(Date.parse(result.asOf))) throw new Error('Invalid administrative aggregate response.');
  return result;
}
