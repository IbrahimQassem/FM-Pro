import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  FieldValue,
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { defineJsonSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  hasRecentAuthentication,
  mergeEpisodeIds,
} from './lib/account-deletion.js';
import {
  createVerificationCode,
  hashEmailIdentifier,
  hashVerificationCode,
  isVerificationCode,
  matchesVerificationCode,
  normalizeEmail,
  safeDisplayName,
  unverifiedAccountRetentionDays,
  verificationCodeLifetimeSeconds,
  verificationMaxAttempts,
  verificationMaxSendsPerHour,
  verificationResendDelaySeconds,
} from './lib/email-verification.js';

initializeApp();

const emailVerificationConfig = defineJsonSecret('EMAIL_VERIFICATION_CONFIG');
const verificationChallengePath = (uid) =>
  `HudHudDev/emailVerificationChallenges/challenges/${uid}`;
const verificationEmailLimitPath = (emailIdentifier) =>
  `HudHudDev/emailVerificationRateLimits/emails/${emailIdentifier}`;
const listenerProfilePath = (uid) => `HudHudDev/users/users/${uid}`;
const verificationChallengesCollection = () => getFirestore().collection(
  'HudHudDev/emailVerificationChallenges/challenges',
);
const verificationEmailLimitsCollection = () => getFirestore().collection(
  'HudHudDev/emailVerificationRateLimits/emails',
);

export const requestEmailVerificationCode = onCall(
  {
    timeoutSeconds: 30,
    maxInstances: 20,
    secrets: [emailVerificationConfig],
  },
  async (request) => {
    const uid = requireAuthenticatedUid(request);
    const auth = getAuth();
    const user = await auth.getUser(uid);
    if (user.emailVerified) {
      throw new HttpsError(
        'failed-precondition',
        'The email address is already verified.',
      );
    }

    const requestedEmail = normalizeEmail(request.data?.email);
    const email = normalizeEmail(user.email) || requestedEmail;
    if (!email) {
      throw new HttpsError(
        'invalid-argument',
        'A valid email address is required.',
      );
    }
    await assertEmailIsAvailable(auth, email, uid);

    const config = readEmailVerificationConfig();
    const code = createVerificationCode();
    const codeHash = hashVerificationCode({
      uid,
      code,
      pepper: config.otpPepper,
    });
    const emailIdentifier = hashEmailIdentifier({
      email,
      pepper: config.otpPepper,
    });
    const firestore = getFirestore();
    const challengeReference = firestore.doc(verificationChallengePath(uid));
    const emailLimitReference = firestore.doc(
      verificationEmailLimitPath(emailIdentifier),
    );
    const now = Date.now();
    await firestore.runTransaction(async (transaction) => {
      const [challenge, emailLimit] = await Promise.all([
        transaction.get(challengeReference),
        transaction.get(emailLimitReference),
      ]);
      const previous = challenge.data();
      const resendAvailableAt = previous?.resendAvailableAt?.toMillis?.() ?? 0;
      if (resendAvailableAt > now) {
        throw new HttpsError(
          'resource-exhausted',
          'Wait before requesting another verification code.',
        );
      }
      const previousWindowStart = previous?.sendWindowStartedAt?.toMillis?.() ?? 0;
      const sameWindow = now - previousWindowStart < 60 * 60 * 1000;
      const sendCount = sameWindow ? Number(previous?.sendCount ?? 0) : 0;
      if (sendCount >= verificationMaxSendsPerHour) {
        throw new HttpsError(
          'resource-exhausted',
          'The verification email limit has been reached.',
        );
      }
      const previousEmailLimit = emailLimit.data();
      const emailWindowStart =
        previousEmailLimit?.sendWindowStartedAt?.toMillis?.() ?? 0;
      const sameEmailWindow = now - emailWindowStart < 60 * 60 * 1000;
      const emailSendCount = sameEmailWindow
        ? Number(previousEmailLimit?.sendCount ?? 0)
        : 0;
      if (emailSendCount >= verificationMaxSendsPerHour) {
        throw new HttpsError(
          'resource-exhausted',
          'The verification email limit has been reached.',
        );
      }
      transaction.set(challengeReference, {
        email,
        displayName: safeDisplayName(user.displayName, email),
        codeHash,
        status: 'active',
        attemptsRemaining: verificationMaxAttempts,
        expiresAt: Timestamp.fromMillis(
          now + verificationCodeLifetimeSeconds * 1000,
        ),
        resendAvailableAt: Timestamp.fromMillis(
          now + verificationResendDelaySeconds * 1000,
        ),
        sendWindowStartedAt: sameWindow
          ? previous.sendWindowStartedAt
          : Timestamp.fromMillis(now),
        sendCount: sendCount + 1,
        createdAt: challenge.exists && previous?.createdAt
          ? previous.createdAt
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(emailLimitReference, {
        sendWindowStartedAt: sameEmailWindow
          ? previousEmailLimit.sendWindowStartedAt
          : Timestamp.fromMillis(now),
        sendCount: emailSendCount + 1,
        expiresAt: Timestamp.fromMillis(now + 24 * 60 * 60 * 1000),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    try {
      await sendVerificationEmail({ email, code, config });
    } catch (error) {
      await removeUnsentChallenge(challengeReference, codeHash);
      logger.error('Verification email delivery failed.', {
        errorCode: safeErrorCode(error),
      });
      throw new HttpsError(
        'unavailable',
        'The verification email could not be delivered.',
      );
    }
    logger.info('Verification email requested.');
    return {
      sent: true,
      expiresInSeconds: verificationCodeLifetimeSeconds,
      retryAfterSeconds: verificationResendDelaySeconds,
    };
  },
);

export const verifyEmailCode = onCall(
  {
    timeoutSeconds: 30,
    maxInstances: 20,
    secrets: [emailVerificationConfig],
  },
  async (request) => {
    const uid = requireAuthenticatedUid(request);
    const code = typeof request.data?.code === 'string'
      ? request.data.code.trim()
      : '';
    if (!isVerificationCode(code)) {
      throw new HttpsError(
        'invalid-argument',
        'Enter the six digit verification code.',
      );
    }

    const config = readEmailVerificationConfig();
    const firestore = getFirestore();
    const challengeReference = firestore.doc(verificationChallengePath(uid));
    const verification = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(challengeReference);
      if (!snapshot.exists) return { status: 'missing' };
      const challenge = snapshot.data();
      const expiresAt = challenge.expiresAt?.toMillis?.() ?? 0;
      if (expiresAt <= Date.now()) {
        transaction.update(challengeReference, {
          status: 'expired',
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { status: 'expired' };
      }
      const matches = matchesVerificationCode({
        uid,
        code,
        pepper: config.otpPepper,
        expectedHash: challenge.codeHash,
      });
      if (!matches) {
        const attemptsRemaining = Math.max(
          0,
          Number(challenge.attemptsRemaining ?? 0) - 1,
        );
        if (attemptsRemaining === 0) {
          transaction.update(challengeReference, {
            status: 'locked',
            attemptsRemaining: 0,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return { status: 'attempts-exhausted' };
        }
        transaction.update(challengeReference, {
          attemptsRemaining,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return { status: 'invalid' };
      }
      transaction.update(challengeReference, {
        status: 'consumed',
        consumedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        status: 'verified',
        email: challenge.email,
        displayName: challenge.displayName,
      };
    });

    if (verification.status !== 'verified') {
      throw verificationError(verification.status);
    }
    const auth = getAuth();
    await assertEmailIsAvailable(auth, verification.email, uid, {
      revealConflict: true,
    });
    const user = await auth.updateUser(uid, {
      email: verification.email,
      emailVerified: true,
      displayName: verification.displayName,
    });
    await ensureListenerProfile(firestore, user);
    await challengeReference.delete();
    logger.info('Email verification completed.');
    return { verified: true };
  },
);

export const ensureAccountProfile = onCall(
  { timeoutSeconds: 30, maxInstances: 20 },
  async (request) => {
    const uid = requireAuthenticatedUid(request);
    const auth = getAuth();
    const user = await auth.getUser(uid);
    if (!user.emailVerified) {
      throw new HttpsError(
        'failed-precondition',
        'Email verification is required.',
      );
    }
    await ensureListenerProfile(getFirestore(), user);
    return { ready: true };
  },
);

export const cleanupUnverifiedAccounts = onSchedule(
  {
    schedule: 'every day 03:00',
    timeZone: 'UTC',
    timeoutSeconds: 300,
    maxInstances: 1,
  },
  async () => {
    const firestore = getFirestore();
    const auth = getAuth();
    const now = Date.now();
    const cutoff = Timestamp.fromMillis(
      now - unverifiedAccountRetentionDays * 24 * 60 * 60 * 1000,
    );
    const [challenges, expiredEmailLimits] = await Promise.all([
      verificationChallengesCollection()
        .where('createdAt', '<=', cutoff)
        .limit(500)
        .get(),
      verificationEmailLimitsCollection()
        .where('expiresAt', '<=', Timestamp.fromMillis(now))
        .limit(500)
        .get(),
    ]);
    let deletedCount = 0;
    let retainedCount = 0;
    for (const challenge of challenges.docs) {
      const uid = challenge.id;
      try {
        const [user, profile] = await Promise.all([
          auth.getUser(uid),
          firestore.doc(listenerProfilePath(uid)).get(),
        ]);
        if (user.emailVerified || profile.exists) {
          await challenge.ref.delete();
          retainedCount += 1;
          continue;
        }
        await auth.deleteUser(uid);
        await challenge.ref.delete();
        deletedCount += 1;
      } catch (error) {
        if (safeErrorCode(error) === 'auth/user-not-found') {
          await challenge.ref.delete();
          continue;
        }
        logger.error('Unverified account cleanup item failed.', {
          errorCode: safeErrorCode(error),
        });
      }
    }
    if (!expiredEmailLimits.empty) {
      const batch = firestore.batch();
      for (const emailLimit of expiredEmailLimits.docs) {
        batch.delete(emailLimit.ref);
      }
      await batch.commit();
    }
    logger.info('Unverified account cleanup completed.', {
      scannedCount: challenges.size,
      deletedCount,
      retainedCount,
      deletedEmailLimitCount: expiredEmailLimits.size,
    });
  },
);

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

function requireAuthenticatedUid(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  return uid;
}

function readEmailVerificationConfig() {
  const value = emailVerificationConfig.value();
  const resendApiKey = typeof value?.resendApiKey === 'string'
    ? value.resendApiKey.trim()
    : '';
  const from = typeof value?.from === 'string' ? value.from.trim() : '';
  const otpPepper = typeof value?.otpPepper === 'string'
    ? value.otpPepper
    : '';
  const apiUrl = typeof value?.apiUrl === 'string' && value.apiUrl.trim()
    ? value.apiUrl.trim()
    : 'https://api.resend.com/emails';
  if (!resendApiKey || !from || otpPepper.length < 32) {
    throw new HttpsError(
      'failed-precondition',
      'Email verification is not configured.',
    );
  }
  if (!apiUrl.startsWith('https://') && process.env.FUNCTIONS_EMULATOR !== 'true') {
    throw new HttpsError(
      'failed-precondition',
      'Email verification provider URL must use HTTPS.',
    );
  }
  return { resendApiKey, from, otpPepper, apiUrl };
}

async function assertEmailIsAvailable(
  auth,
  email,
  uid,
  { revealConflict = false } = {},
) {
  try {
    const existing = await auth.getUserByEmail(email);
    if (existing.uid !== uid) {
      throw new HttpsError(
        revealConflict ? 'already-exists' : 'unavailable',
        revealConflict
          ? 'The email address cannot be used.'
          : 'The verification email could not be delivered.',
      );
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (safeErrorCode(error) !== 'auth/user-not-found') throw error;
  }
}

async function sendVerificationEmail({ email, code, config }) {
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [email],
      subject: 'HudHud FM verification code',
      text: `رمز توثيق بريدك في HudHud FM هو ${code}. تنتهي صلاحيته خلال 10 دقائق.\n\nYour HudHud FM verification code is ${code}. It expires in 10 minutes.`,
      html: `<p dir="rtl">رمز توثيق بريدك في HudHud FM هو <strong>${code}</strong>. تنتهي صلاحيته خلال 10 دقائق.</p><p>Your HudHud FM verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
    }),
  });
  if (!response.ok) {
    const error = new Error('Email provider rejected the request.');
    error.code = `resend/${response.status}`;
    throw error;
  }
}

async function removeUnsentChallenge(reference, codeHash) {
  const firestore = getFirestore();
  await firestore.runTransaction(async (transaction) => {
    const challenge = await transaction.get(reference);
    if (challenge.exists && challenge.get('codeHash') === codeHash) {
      transaction.delete(reference);
    }
  });
}

function verificationError(status) {
  switch (status) {
    case 'expired':
      return new HttpsError('deadline-exceeded', 'The verification code expired.');
    case 'attempts-exhausted':
      return new HttpsError(
        'resource-exhausted',
        'The verification attempt limit was reached.',
      );
    case 'invalid':
      return new HttpsError('invalid-argument', 'The verification code is invalid.');
    default:
      return new HttpsError('not-found', 'Request a new verification code.');
  }
}

async function ensureListenerProfile(firestore, user) {
  const reference = firestore.doc(listenerProfilePath(user.uid));
  await firestore.runTransaction(async (transaction) => {
    const profile = await transaction.get(reference);
    if (profile.exists) return;
    const email = normalizeEmail(user.email);
    transaction.create(reference, {
      displayName: safeDisplayName(user.displayName, email),
      username: '',
      avatarUrl: '',
      isActive: true,
      role: 'listener',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

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
  await firestore.doc(verificationChallengePath(uid)).delete();
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
