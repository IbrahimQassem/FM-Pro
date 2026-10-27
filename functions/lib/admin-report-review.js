import { prepareCommentCountMutation } from './comment-counts.js';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { administrativeActor } from './admin-content-authorization.js';
import { validContentId } from './admin-content.js';

export function validReportPath(root, path) {
  if (typeof path !== 'string') return false;
  const parts = path.split('/');
  return parts.length === 8 && parts[0] === root && parts[1] === 'users' && parts[2] === 'users' &&
    validContentId(parts[3]) && ['commentReportEpisodes', 'userReportTargets'].includes(parts[4]) &&
    validContentId(parts[5]) && parts[6] === 'moderationReports' && validContentId(parts[7]);
}

export async function reviewAdminReport(args) {
  const { firestore: db, data } = args;
  const { root, path, resolution } = data ?? {};
  if (!['HudHudDev', 'HudHudOfficial'].includes(root) || !validReportPath(root, path) ||
      !['commentHidden', 'commentRemoved', 'userDisabled', 'noAction'].includes(resolution)) {
    throw new HttpsError('invalid-argument', 'Invalid report review.');
  }
  const actor = administrativeActor(args, { allowModerator: true });
  const disabling = resolution === 'userDisabled';
  if (disabling && !actor.isSuperAdmin) throw new HttpsError('permission-denied', 'Super admin privileges are required to disable accounts.');
  const ref = db.doc(path);
  await db.runTransaction(async tx => {
    const selected = await tx.get(ref);
    if (!selected.exists || selected.data().status !== 'open') throw new HttpsError('failed-precondition', 'This report was already reviewed.');
    const report = selected.data();
    const { reportedAuthorId: authorId, episodeId, commentId } = report;
    if (![authorId, episodeId, commentId].every(validContentId)) throw new HttpsError('failed-precondition', 'The report links are invalid.');
    const episode = await tx.get(db.doc(`${root}/episodes/episodes/${episodeId}`));
    if (!actor.canManageStation(episode.data()?.stationId)) throw new HttpsError('permission-denied', 'Not authorized to review this station report.');
    const changing = resolution !== 'noAction';
    const comment = changing ? await tx.get(db.doc(`${root}/episodes/episodes/${episodeId}/comments/${commentId}`)) : null;
    if (comment?.exists && comment.data().authorId !== authorId) throw new HttpsError('failed-precondition', 'The reported author does not match the comment.');
    if (comment?.exists && !episode.exists) throw new HttpsError('failed-precondition', 'The related episode is missing.');
    const user = disabling ? await tx.get(db.doc(`${root}/users/users/${authorId}`)) : null;
    if (disabling && !user.exists) throw new HttpsError('failed-precondition', 'The reported account is missing.');
    let candidates = [selected];
    if (changing) {
      const result = await tx.get(db.collectionGroup('moderationReports')
        .where(FieldPath.documentId(), '>=', db.doc(`${root}/users`))
        .where(FieldPath.documentId(), '<', db.doc(`${root}/users\uf8ff`))
        .where('reportedAuthorId', '==', authorId).where('status', '==', 'open')
        .orderBy(FieldPath.documentId()).limit(451));
      if (result.size > 450) throw new HttpsError('failed-precondition', 'Too many open reports for one review.', { reason: 'report-limit' });
      candidates = result.docs.filter(item => validReportPath(root, item.ref.path) &&
        (disabling || (item.data().episodeId === episodeId && item.data().commentId === commentId)));
    }
    const countMutation = changing && episode.exists ? await prepareCommentCountMutation(tx, db, {
      root, episodeId, commentId, action: 'update', serverTimestamp: () => FieldValue.serverTimestamp(),
      changes: fresh => {
        if (fresh.authorId !== authorId) throw new HttpsError('failed-precondition', 'The reported author changed.');
        return { status: resolution === 'commentHidden' ? 'hidden' : 'removed', moderatedAt: FieldValue.serverTimestamp(), moderatedBy: actor.uid };
      },
    }) : null;
    const review = { status: resolution === 'noAction' ? 'dismissed' : 'resolved', resolution,
      reviewedAt: FieldValue.serverTimestamp(), reviewedBy: actor.uid };
    const targets = new Map([[selected.ref.path, selected], ...candidates.map(item => [item.ref.path, item])]);
    for (const item of targets.values()) if (item.exists && item.data().status === 'open') tx.update(item.ref, review);
    if (countMutation) for (const write of countMutation.writes) write();
    if (user?.exists) tx.update(user.ref, { isActive: false, updatedAt: FieldValue.serverTimestamp() });
  });
  return { success: true };
}
