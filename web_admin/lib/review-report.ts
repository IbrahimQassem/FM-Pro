import type { DocumentReference, Firestore } from 'firebase/firestore';
import { contentError, invokeAdminContent } from './save-content.ts';

type Resolution = 'commentHidden' | 'commentRemoved' | 'userDisabled' | 'noAction';

export async function reviewReport(firestore: Firestore, root: string, reference: DocumentReference, resolution: Resolution) {
  const parts = reference.path.split('/');
  if (!['HudHudDev', 'HudHudOfficial'].includes(root) || parts.length !== 8 || parts[0] !== root ||
      parts[1] !== 'users' || parts[2] !== 'users' || !['commentReportEpisodes', 'userReportTargets'].includes(parts[4]) || parts[6] !== 'moderationReports') {
    throw contentError('مسار البلاغ غير صالح.');
  }
  await invokeAdminContent(firestore, 'adminReviewReport', { root, path: reference.path, resolution });
}
