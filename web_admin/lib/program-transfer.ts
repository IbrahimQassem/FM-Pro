import {
  collection,
  getDocsFromServer,
  limit,
  query,
  where,
  type DocumentSnapshot,
  type Transaction,
} from 'firebase/firestore';

function failure(message: string): Error {
  const error = new Error(message);
  error.name = 'ContentError';
  return error;
}

/** The program must have been read in this transaction before querying children.
 * Episode creation/removal updates that program's counter, causing a retry and
 * a fresh child query. Read every child again to detect edits and deletions.
 */
export async function readProgramTransferEpisodes(
  transaction: Transaction,
  program: DocumentSnapshot,
) {
  const [root, group, kind, id, extra] = program.ref.path.split('/');
  if (
    !program.exists() ||
    !['HudHudDev', 'HudHudOfficial'].includes(root) ||
    group !== 'programs' ||
    kind !== 'programs' ||
    !id ||
    extra
  )
    throw failure('مسار البرنامج غير صالح.');
  const children = await getDocsFromServer(
    query(
      collection(program.ref.firestore, `${root}/episodes/episodes`),
      where('programId', '==', id),
      limit(451),
    ),
  );
  if (children.size > 450)
    throw failure(
      'يتجاوز البرنامج 450 حلقة. انقل الحلقات إلى برنامج آخر قبل تغيير المحطة.',
    );
  const episodes = await Promise.all(
    children.docs.map((child) => transaction.get(child.ref)),
  );
  if (
    episodes.some(
      (child) =>
        !child.exists() ||
        child.data()?.programId !== id ||
        child.data()?.adminDeletionToken,
    )
  )
    throw failure('تغيّرت حلقات البرنامج أو توجد حلقة قيد الحذف. أعد المحاولة.');
  return episodes.map((child) => child.ref);
}
