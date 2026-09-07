import { assertCounterAdjustment } from './relationship-counter.ts';
import {
  collection,
  deleteField,
  doc,
  getDocsFromServer,
  increment,
  limit,
  query,
  runTransaction,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

function failure(message: string): Error {
  const error = new Error(message);
  error.name = 'ContentError';
  return error;
}
function fingerprint(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .filter(([key]) => key !== 'adminDeletionToken')
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => [key, normalize(child)]),
      );
    return item;
  };
  return JSON.stringify(normalize(value));
}

/** Fence new comments before querying children. Rules must reject comments while fenced. */
export async function deleteEpisode(
  firestore: Firestore,
  reference: DocumentReference,
  expected: Record<string, unknown>,
): Promise<void> {
  const segments = reference.path.split('/');
  if (
    segments.length !== 4 ||
    !['HudHudDev', 'HudHudOfficial'].includes(segments[0]) ||
    segments[1] !== 'episodes' ||
    segments[2] !== 'episodes'
  )
    throw failure('مسار الحلقة غير صالح.');
  const token = crypto.randomUUID();
  const acquired = await runTransaction(firestore, async (transaction) => {
    const current = await transaction.get(reference);
    if (!current.exists()) return false;
    if (fingerprint(current.data()) !== fingerprint(expected))
      throw failure('تغيّرت الحلقة. أعد تحميلها قبل الحذف.');
    // A fresh attempt may take over an interrupted deletion; older attempts cannot unlock it.
    transaction.update(reference, { adminDeletionToken: token });
    return true;
  });
  if (!acquired) return;
  try {
    const comments = await getDocsFromServer(
      query(collection(reference, 'comments'), limit(1)),
    );
    if (!comments.empty)
      throw failure('لا يمكن حذف حلقة لها تعليقات. ألغِ نشرها بدلًا من حذفها.');
    await runTransaction(firestore, async (transaction) => {
      const current = await transaction.get(reference);
      if (!current.exists()) return;
      const data = current.data();
      if (
        data.adminDeletionToken !== token ||
        fingerprint(data) !== fingerprint(expected)
      )
        throw failure('تغيّرت الحلقة أثناء الحذف. أعد تحميلها.');
      if (
        typeof data.programId !== 'string' ||
        !data.programId ||
        data.programId.includes('/')
      )
        throw failure('ارتباط البرنامج غير صالح.');
      const parent = doc(
        firestore,
        `${segments[0]}/programs/programs`,
        data.programId,
      );
      const program = await transaction.get(parent);
      if (!program.exists())
        throw failure('البرنامج المرتبط غير موجود. راجع البيانات قبل الحذف.');
      assertCounterAdjustment(program.get('stats.episodesCount'), -1);
      transaction.update(parent, { 'stats.episodesCount': increment(-1) });
      transaction.delete(reference);
    });
  } finally {
    // Also runs after uncertain network outcomes; absent documents are never recreated.
    await runTransaction(firestore, async (transaction) => {
      const current = await transaction.get(reference);
      if (current.exists() && current.data().adminDeletionToken === token)
        transaction.update(reference, { adminDeletionToken: deleteField() });
    });
  }
}
