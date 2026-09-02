import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  hasRecentAuthentication,
  mergeEpisodeIds,
} from './lib/account-deletion.js';

initializeApp();

export const deleteAccountData = onCall(
  { timeoutSeconds: 300, maxInstances: 10 },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }
    const authTime = Number(request.auth.token.auth_time);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!hasRecentAuthentication(authTime, nowSeconds)) {
      throw new HttpsError(
        'failed-precondition',
        'Recent authentication is required.',
      );
    }

    try {
      await deleteAccount(uid);
      logger.info('Account deletion completed.');
      return { deleted: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error('Account deletion failed.', {
        errorCode: safeErrorCode(error),
      });
      throw new HttpsError(
        'internal',
        'Account deletion could not be completed.',
      );
    }
  },
);

async function deleteAccount(uid) {
  const firestore = getFirestore();
  const userReference = firestore.doc(`HudHudDev/users/users/${uid}`);
  const jobReference = firestore.doc(
    `HudHudDev/accountDeletionRequests/requests/${uid}`,
  );
  const [job, profile] = await Promise.all([
    jobReference.get(),
    userReference.get(),
  ]);
  if (profile.exists) {
    await userReference.update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  const comments = await firestore
    .collectionGroup('comments')
    .where('authorId', '==', uid)
    .get();
  const episodeIds = mergeEpisodeIds(
    job.exists ? job.get('affectedEpisodeIds') : [],
    comments.docs,
  );
  await jobReference.set(
    {
      status: 'running',
      affectedEpisodeIds: episodeIds,
      createdAt: job.exists
        ? job.get('createdAt')
        : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await deleteDocuments(firestore, comments.docs);
  await reconcileCommentCounts(firestore, episodeIds);

  const [reportsAboutUser, blocksOfUser] = await Promise.all([
    firestore
      .collectionGroup('moderationReports')
      .where('reportedAuthorId', '==', uid)
      .get(),
    firestore
      .collectionGroup('blockedUsers')
      .where('blockedUserId', '==', uid)
      .get(),
  ]);
  await deleteDocuments(firestore, [
    ...reportsAboutUser.docs,
    ...blocksOfUser.docs,
  ]);
  await firestore.recursiveDelete(userReference);
  await jobReference.delete();

  try {
    await getAuth().deleteUser(uid);
  } catch (error) {
    if (safeErrorCode(error) !== 'auth/user-not-found') throw error;
  }
}

async function deleteDocuments(firestore, documents) {
  if (documents.length === 0) return;
  const writer = firestore.bulkWriter();
  for (const document of documents) writer.delete(document.ref);
  await writer.close();
}

async function reconcileCommentCounts(firestore, episodeIds) {
  for (const episodeId of episodeIds) {
    const episode = firestore.doc(
      `HudHudDev/episodes/episodes/${episodeId}`,
    );
    const count = await episode
      .collection('comments')
      .where('status', '==', 'published')
      .count()
      .get();
    if (!(await episode.get()).exists) continue;
    await episode.update({
      'stats.commentsCount': count.data().count,
    });
  }
}

function safeErrorCode(error) {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
    ? error.code
    : 'unknown';
}
