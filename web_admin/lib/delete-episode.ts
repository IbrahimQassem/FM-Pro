import type { DocumentReference, Firestore } from 'firebase/firestore';
import type { ResourceKey } from './admin-resources';
import type { FirestoreRoot } from './firestore-environment';
import { contentError, invokeAdminContent, portable } from './save-content.ts';

export function buildAdminDeleteRequest(root: FirestoreRoot, kind: ResourceKey, path: string, expected: Record<string, unknown>) {
  const parts = path.split('/');
  const id = parts[3];
  if (!['HudHudDev', 'HudHudOfficial'].includes(root) || !['stations', 'programs', 'episodes', 'banners'].includes(kind) ||
      parts.length !== 4 || parts[0] !== root || parts[1] !== kind || parts[2] !== kind || !id || id.includes('/') || id.length > 128 || id.trim() !== id || id === '.' || id === '..') {
    throw contentError('مسار المحتوى غير صالح للحذف.');
  }
  return { root, kind, id, expected: portable(expected) };
}

export async function deleteContentWithAudit(firestore: Firestore, root: FirestoreRoot, kind: ResourceKey,
  reference: Pick<DocumentReference, 'path'>, expected: Record<string, unknown>): Promise<void> {
  const request = buildAdminDeleteRequest(root, kind, reference.path, expected);
  const result = await invokeAdminContent<{ success: boolean; id: string; action: string }>(firestore, 'adminDeleteContent', request);
  if (result.id !== request.id || !['delete', 'unchanged'].includes(result.action)) throw contentError('لم يتم تأكيد الحذف. أعد تحميل البيانات قبل المحاولة.');
}

/** The server owns the deletion fence, child guard, counter and audit transaction. */
export async function deleteEpisode(firestore: Firestore, reference: DocumentReference, expected: Record<string, unknown>): Promise<void> {
  const root = reference.path.split('/')[0] as FirestoreRoot;
  await deleteContentWithAudit(firestore, root, 'episodes', reference, expected);
}
