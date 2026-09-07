import { assertCounterAdjustment } from './relationship-counter.ts';
import {
  collectionGroup,
  doc,
  documentId,
  getDocsFromServer,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

type Resolution =
  | 'commentHidden'
  | 'commentRemoved'
  | 'userDisabled'
  | 'noAction';
function failure(message: string): Error {
  const error = new Error(message);
  error.name = 'ContentError';
  return error;
}
function identifier(value: unknown): string {
  if (typeof value !== 'string' || !value || value.includes('/'))
    throw failure('ارتباط البلاغ غير صالح.');
  return value;
}

export async function reviewReport(
  firestore: Firestore,
  root: string,
  reference: DocumentReference,
  resolution: Resolution,
  adminUid: string,
) {
  if (
    !['HudHudDev', 'HudHudOfficial'].includes(root) ||
    !reference.path.startsWith(`${root}/users/users/`) ||
    reference.parent.id !== 'moderationReports'
  )
    throw failure('مسار البلاغ غير صالح.');
  await runTransaction(firestore, async (tx) => {
    const selected = await tx.get(reference);
    if (!selected.exists() || selected.data().status !== 'open')
      throw failure('تمت معالجة البلاغ بالفعل.');
    const data = selected.data();
    const authorId = identifier(data.reportedAuthorId);
    const episodeId = identifier(data.episodeId);
    const commentId = identifier(data.commentId);
    const disablingUser = resolution === 'userDisabled';
    const changingComment = resolution !== 'noAction';
    const candidates =
      resolution === 'noAction'
        ? [reference]
        : await (async () => {
            const result = await getDocsFromServer(
              query(
                collectionGroup(firestore, 'moderationReports'),
                where(documentId(), '>=', doc(firestore, root, 'users')),
                where(documentId(), '<', doc(firestore, root, 'users\uf8ff')),
                where('reportedAuthorId', '==', authorId),
                where('status', '==', 'open'),
                orderBy(documentId()),
                limit(451),
              ),
            );
            if (result.size > 450)
              throw failure(
                'يتجاوز عدد البلاغات المفتوحة حد العملية. راجع البلاغات وأغلق غير المستحق منها ثم أعد المحاولة.',
              );
            return result.docs
              .filter(
                (item) =>
                  disablingUser ||
                  (item.data().episodeId === episodeId &&
                    item.data().commentId === commentId),
              )
              .map((item) => item.ref);
          })();
    const reports = await Promise.all(candidates.map((item) => tx.get(item)));
    const comment = changingComment
      ? await tx.get(
          doc(
            firestore,
            `${root}/episodes/episodes/${episodeId}/comments`,
            commentId,
          ),
        )
      : null;
    if (comment?.exists() && comment.data().authorId !== authorId)
      throw failure('لا تتطابق هوية كاتب التعليق مع البلاغ.');
    const user = disablingUser
      ? await tx.get(doc(firestore, `${root}/users/users`, authorId))
      : null;
    if (disablingUser && !user?.exists()) throw failure('الحساب غير موجود.');
    const episode =
      comment?.exists() && comment.data().status === 'published'
        ? await tx.get(doc(firestore, `${root}/episodes/episodes`, episodeId))
        : null;
    if (episode && !episode.exists())
      throw failure('الحلقة غير موجودة. راجع ارتباط البلاغ.');
    if (episode)
      assertCounterAdjustment(episode.get('stats.commentsCount'), -1);
    const review = {
      status: resolution === 'noAction' ? 'dismissed' : 'resolved',
      resolution,
      reviewedAt: serverTimestamp(),
      reviewedBy: adminUid,
    };
    for (const report of reports)
      if (report.exists() && report.data().status === 'open')
        tx.update(report.ref, review);
    tx.update(reference, review);
    if (comment?.exists()) {
      tx.update(comment.ref, {
        status: resolution === 'commentHidden' ? 'hidden' : 'removed',
        moderatedAt: serverTimestamp(),
        moderatedBy: adminUid,
      });
      if (episode)
        tx.update(episode.ref, { 'stats.commentsCount': increment(-1) });
    }
    if (user?.exists())
      tx.update(user.ref, { isActive: false, updatedAt: serverTimestamp() });
  });
}
