import { randomUUID } from 'node:crypto';
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
const roots = ['HudHudDev', 'HudHudOfficial'];
function requestRoot(request) {
  const root = request.data?.root ?? 'HudHudDev';
  if (!roots.includes(root)) throw new HttpsError('invalid-argument', 'Unknown environment.');
  return root;
}
const verificationChallengePath = (uid, root) => `${root}/emailVerificationChallenges/challenges/${uid}`;
const verificationEmailLimitPath = (id, root) => `${root}/emailVerificationRateLimits/emails/${id}`;
const listenerProfilePath = (uid, root) => `${root}/users/users/${uid}`;
const deletionJobPath = (uid, root) => `${root}/accountDeletionRequests/requests/${uid}`;

export const requestEmailVerificationCode = onCall(
  {
    timeoutSeconds: 30,
    maxInstances: 20,
    secrets: [emailVerificationConfig],
  },
  async (request) => {
    const uid = requireAuthenticatedUid(request);
    const root = requestRoot(request);
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
    const challengeReference = firestore.doc(verificationChallengePath(uid, root));
    const emailLimitReference = firestore.doc(
      verificationEmailLimitPath(emailIdentifier, root),
    );
    const now = Date.now();
    await firestore.runTransaction(async (transaction) => {
      const [challenge, emailLimit] = await Promise.all([
        transaction.get(challengeReference),
        transaction.get(emailLimitReference),
      ]);
      const sibling = await transaction.get(firestore.doc(verificationChallengePath(uid, roots.find((r) => r !== root))));
      const jobs = await Promise.all(roots.map((r) => transaction.get(firestore.doc(deletionJobPath(uid, r)))));
      if (jobs.some((job) => job.exists) || sibling.get('status') === 'consumed') throw new HttpsError('failed-precondition', 'An account operation is pending.');
      const previous = challenge.data();
      if (previous?.status === 'consumed') {
        throw new HttpsError('failed-precondition', 'Finish the pending verification before requesting a new code.');
      }
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
      const siblingEmailLimit = await transaction.get(firestore.doc(verificationEmailLimitPath(emailIdentifier, roots.find((r) => r !== root))));
      const siblingWindowStart = siblingEmailLimit.get('sendWindowStartedAt')?.toMillis?.() ?? 0;
      const siblingSendCount = now - siblingWindowStart < 60 * 60 * 1000 ? Number(siblingEmailLimit.get('sendCount') ?? 0) : 0;
      const previousEmailLimit = emailLimit.data();
      const emailWindowStart =
        previousEmailLimit?.sendWindowStartedAt?.toMillis?.() ?? 0;
      const sameEmailWindow = now - emailWindowStart < 60 * 60 * 1000;
      const emailSendCount = sameEmailWindow
        ? Number(previousEmailLimit?.sendCount ?? 0)
        : 0;
      if (emailSendCount + siblingSendCount >= verificationMaxSendsPerHour) {
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
    const root = requestRoot(request);
    const code = typeof request.data?.code === 'string'
      ? request.data.code.trim()
      : '';
    if (!isVerificationCode(code)) {
      throw new HttpsError(
        'invalid-argument',
        'Enter the six digit verification code.',
      );
    }

    const currentUser = await getAuth().getUser(uid);
    const config = readEmailVerificationConfig();
    const firestore = getFirestore();
    const challengeReference = firestore.doc(verificationChallengePath(uid, root));
    const verification = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(challengeReference);
      const sibling = await transaction.get(firestore.doc(verificationChallengePath(uid, roots.find((r) => r !== root))));
      const jobs = await Promise.all(roots.map((r) => transaction.get(firestore.doc(deletionJobPath(uid, r)))));
      if (jobs.some((job) => job.exists) || sibling.get('status') === 'consumed') throw new HttpsError('failed-precondition', 'An account operation is pending.');
      if (!snapshot.exists) return { status: 'missing' };
      const challenge = snapshot.data();
      if (normalizeEmail(currentUser.email) && normalizeEmail(currentUser.email) !== challenge.email) return { status: 'missing' };
      if (challenge.status === 'consumed') return { status: 'consumed' };
      if (currentUser.emailVerified) return { status: 'missing' };
      if (challenge.status === 'locked' || challenge.attemptsRemaining === 0) return { status: 'attempts-exhausted' };
      if (challenge.status !== 'active' || !Number.isInteger(challenge.attemptsRemaining) || challenge.attemptsRemaining < 1) return { status: 'missing' };
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
        operationId: randomUUID(),
        leaseUntil: Timestamp.fromMillis(0),
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
    await completePendingVerification(firestore, uid, root);
    logger.info('Email verification completed.');
    return { verified: true };
  },
);

export const ensureAccountProfile = onCall(
  { timeoutSeconds: 30, maxInstances: 20 },
  async (request) => {
    const uid = requireAuthenticatedUid(request);
    const root = requestRoot(request);
    await completePendingVerification(getFirestore(), uid, root);
    const user = await getAuth().getUser(uid);
    if (!user.emailVerified || !normalizeEmail(user.email)) {
      throw new HttpsError('failed-precondition', 'Email verification is required.');
    }
    await ensureListenerProfile(getFirestore(), user, root);
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
    let deletedCount = 0;
    let retainedCount = 0;
    let scannedCount = 0;
    let deletedEmailLimitCount = 0;
    for (const root of roots) {
      const challenges = await firestore.collection(`${root}/emailVerificationChallenges/challenges`).where('createdAt', '<=', cutoff).limit(500).get();
      scannedCount += challenges.size;
      for (const challenge of challenges.docs) {
        try {
          const uid = challenge.id;
          const user = await auth.getUser(uid);
          const profiles = await Promise.all(roots.map((r) => firestore.doc(listenerProfilePath(uid, r)).get()));
          const pending = await Promise.all(roots.map((r) => firestore.doc(verificationChallengePath(uid, r)).get()));
          const jobs = await Promise.all(roots.map((r) => firestore.doc(deletionJobPath(uid, r)).get()));
          if (pending.some((item) => item.get('status') === 'consumed') || jobs.some((item) => item.exists && item.get('source') !== 'retention')) {
            retainedCount += 1;
            continue;
          }
          if (user.emailVerified || profiles.some((item) => item.exists)) {
            await releaseRetentionBarriers(firestore, uid);
            await challenge.ref.delete();
            retainedCount += 1;
            continue;
          }
          // A newer challenge in either root still has an active retention period.
          if (pending.some((item) => item.exists && (item.get('createdAt')?.toMillis?.() ?? now) > cutoff.toMillis())) continue;
          // Recheck and reserve deletion atomically against profile/OTP callables.
          const reserved = await firestore.runTransaction(async (transaction) => {
            const currentProfiles = await Promise.all(roots.map((r) => transaction.get(firestore.doc(listenerProfilePath(uid, r)))));
            const currentChallenges = await Promise.all(roots.map((r) => transaction.get(firestore.doc(verificationChallengePath(uid, r)))));
            const currentJobs = await Promise.all(roots.map((r) => transaction.get(firestore.doc(deletionJobPath(uid, r)))));
            if (currentProfiles.some((item) => item.exists) || currentJobs.some((item) => item.exists && item.get('source') !== 'retention') || currentChallenges.some((item) => item.exists && (item.get('status') === 'consumed' || (item.get('createdAt')?.toMillis?.() ?? now) > cutoff.toMillis()))) return false;
            for (const r of roots) transaction.set(firestore.doc(deletionJobPath(uid, r)), { status: 'running', source: 'retention', updatedAt: FieldValue.serverTimestamp() });
            return true;
          });
          if (!reserved) continue;
          if ((await auth.getUser(uid)).emailVerified) {
            await releaseRetentionBarriers(firestore, uid);
            retainedCount += 1;
            continue;
          }
          await deleteAccount(uid, 'retention');
          deletedCount += 1;
        } catch (error) {
          if (safeErrorCode(error) === 'auth/user-not-found') await challenge.ref.delete();
          else logger.error('Unverified account cleanup item failed.', { errorCode: safeErrorCode(error) });
        }
      }
      const limits = await firestore.collection(`${root}/emailVerificationRateLimits/emails`).where('expiresAt', '<=', Timestamp.fromMillis(now)).limit(500).get();
      await deleteDocuments(firestore, limits.docs);
      deletedEmailLimitCount += limits.size;
      const expiredJobs = await firestore.collection(`${root}/accountDeletionRequests/requests`).where('expiresAt', '<=', Timestamp.fromMillis(now)).limit(500).get();
      for (const job of expiredJobs.docs) {
        if (job.get('status') !== 'completed') continue;
        try { await auth.getUser(job.id); }
        catch (error) {
          if (safeErrorCode(error) === 'auth/user-not-found') {
            await firestore.runTransaction(async (transaction) => {
              const current = await transaction.get(job.ref);
              if (current.get('status') === 'completed' && (current.get('expiresAt')?.toMillis?.() ?? Infinity) <= now) transaction.delete(job.ref);
            });
          }
          else logger.error('Deletion barrier cleanup failed.', { errorCode: safeErrorCode(error) });
        }
      }
    }
    logger.info('Unverified account cleanup completed.', {
      scannedCount,
      deletedCount,
      retainedCount,
      deletedEmailLimitCount,
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

async function ensureListenerProfile(firestore, user, root) {
  const reference = firestore.doc(listenerProfilePath(user.uid, root));
  await firestore.runTransaction(async (transaction) => {
    const profile = await transaction.get(reference);
    const jobs = await Promise.all(roots.map((r) => transaction.get(firestore.doc(deletionJobPath(user.uid, r)))));
    if (jobs.some((job) => job.exists)) throw new HttpsError('failed-precondition', 'Account deletion is in progress.');
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

function canonicalRelatedDocument(document, collection) {
  const parts = document.ref.path.split('/');
  if (!roots.includes(parts[0])) return false;
  if (collection === 'comments') return parts.length === 6 && parts[1] === 'episodes' && parts[2] === 'episodes' && parts[4] === 'comments';
  if (parts[1] !== 'users' || parts[2] !== 'users') return false;
  if (collection === 'blockedUsers') return parts.length === 6 && parts[4] === 'blockedUsers';
  return parts.length === 8 && ['commentReportEpisodes', 'userReportTargets'].includes(parts[4]) && parts[6] === 'moderationReports';
}

async function releaseRetentionBarriers(firestore, uid) {
  await firestore.runTransaction(async (transaction) => {
    const jobs = await Promise.all(roots.map((root) => transaction.get(firestore.doc(deletionJobPath(uid, root)))));
    for (const job of jobs) if (job.get('source') === 'retention') transaction.delete(job.ref);
  });
}

async function deleteAccount(uid, source = 'user') {
  const firestore = getFirestore();
  // Establish both deletion barriers before removing any profile or comment.
  await firestore.runTransaction(async (transaction) => {
    const profiles = await Promise.all(roots.map((root) => transaction.get(firestore.doc(listenerProfilePath(uid, root)))));
    for (const root of roots) transaction.set(firestore.doc(deletionJobPath(uid, root)), { status: 'running', source, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    for (const profile of profiles) if (profile.exists) transaction.update(profile.ref, { isActive: false, updatedAt: FieldValue.serverTimestamp() });
  });
  for (const root of roots) {
    const jobReference = firestore.doc(deletionJobPath(uid, root));
    const comments = (await firestore.collectionGroup('comments').where('authorId', '==', uid).get()).docs.filter((doc) => canonicalRelatedDocument(doc, 'comments') && doc.ref.path.startsWith(`${root}/`));
    const episodePaths = await firestore.runTransaction(async (transaction) => {
      const job = await transaction.get(jobReference);
      const saved = job.get('affectedEpisodePaths') ?? [];
      const legacy = (job.get('affectedEpisodeIds') ?? []).filter((id) => typeof id === 'string' && id && !id.includes('/')).map((id) => `${root}/episodes/episodes/${id}`);
      const paths = [...new Set([...saved, ...legacy, ...comments.map((doc) => doc.ref.parent.parent.path)])].filter((path) => typeof path === 'string' && path.startsWith(`${root}/episodes/episodes/`) && path.split('/').length === 4);
      transaction.set(jobReference, { affectedEpisodePaths: paths }, { merge: true });
      return paths;
    });
    await deleteDocuments(firestore, comments);
    await reconcileCommentCounts(firestore, episodePaths);
    for (const [collection, field] of [['moderationReports', 'reportedAuthorId'], ['blockedUsers', 'blockedUserId']]) {
      const documents = (await firestore.collectionGroup(collection).where(field, '==', uid).get()).docs.filter((doc) => canonicalRelatedDocument(doc, collection) && doc.ref.path.startsWith(`${root}/`));
      await deleteDocuments(firestore, documents);
    }
    await firestore.recursiveDelete(firestore.doc(listenerProfilePath(uid, root)));
    await firestore.doc(verificationChallengePath(uid, root)).delete();
  }
  try { await getAuth().deleteUser(uid); }
  catch (error) { if (safeErrorCode(error) !== 'auth/user-not-found') throw error; }
  // Keep a minimal barrier beyond cached-token and in-flight callable lifetimes.
  for (const root of roots) await firestore.doc(deletionJobPath(uid, root)).set({
    status: 'completed',
    expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
  });
}

async function deleteDocuments(firestore, documents) {
  if (documents.length === 0) return;
  const writer = firestore.bulkWriter();
  for (const document of documents) writer.delete(document.ref);
  await writer.close();
}

async function reconcileCommentCounts(firestore, episodePaths) {
  for (const path of episodePaths) {
    const episode = firestore.doc(path);
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

async function completePendingVerification(firestore, uid, root) {
  const reference = firestore.doc(verificationChallengePath(uid, root));
  const owner = randomUUID();
  const reservation = await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists || snapshot.get('status') !== 'consumed') return null;
    const jobs = await Promise.all(roots.map((r) => transaction.get(firestore.doc(deletionJobPath(uid, r)))));
    if (jobs.some((job) => job.exists)) throw new HttpsError('failed-precondition', 'Account deletion is in progress.');
    const data = snapshot.data();
    if ((data.leaseUntil?.toMillis?.() ?? 0) > Date.now()) throw new HttpsError('aborted', 'Verification is already completing. Retry shortly.');
    if (!normalizeEmail(data.email) || typeof data.operationId !== 'string') throw new HttpsError('failed-precondition', 'The pending verification is invalid.');
    transaction.update(reference, { leaseOwner: owner, leaseUntil: Timestamp.fromMillis(Date.now() + 60_000) });
    return data;
  });
  if (!reservation) return;
  try {
    const auth = getAuth();
    await assertEmailIsAvailable(auth, reservation.email, uid, { revealConflict: true });
    const current = await auth.getUser(uid);
    if (normalizeEmail(current.email) && normalizeEmail(current.email) !== reservation.email) throw new HttpsError('failed-precondition', 'The account email changed.');
    const user = current.emailVerified && normalizeEmail(current.email) === reservation.email
      ? current
      : await auth.updateUser(uid, { ...(normalizeEmail(current.email) !== reservation.email ? { email: reservation.email } : {}), emailVerified: true, displayName: reservation.displayName });
    await ensureListenerProfile(firestore, user, root);
    await firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(reference);
      if (current.get('operationId') === reservation.operationId && current.get('leaseOwner') === owner) transaction.delete(reference);
    });
  } catch (error) {
    await firestore.runTransaction(async (transaction) => {
      const current = await transaction.get(reference);
      if (current.get('operationId') === reservation.operationId && current.get('leaseOwner') === owner) transaction.update(reference, { leaseUntil: Timestamp.fromMillis(0) });
    });
    throw error;
  }
}

const bundledAvatars = new Set([
  'assets/images/mascot/mascot_avatar_default.webp',
  'assets/images/mascot/mascot_onboarding.webp',
  'assets/images/mascot/mascot_empty_favorites.webp',
  'assets/images/mascot/mascot_empty_comments.webp',
]);
function validAvatar(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  if (value === '' || bundledAvatars.has(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}
export const updateAccountProfile = onCall(
  { timeoutSeconds: 30, maxInstances: 20 },
  async (request) => {
    const uid = requireAuthenticatedUid(request);
    const root = requestRoot(request);
    const user = await getAuth().getUser(uid);
    if (!user.emailVerified || !normalizeEmail(user.email)) throw new HttpsError('failed-precondition', 'Email verification is required.');
    const displayName = typeof request.data?.displayName === 'string' ? request.data.displayName.trim() : '';
    if (displayName.length < 2 || displayName.length > 120) throw new HttpsError('invalid-argument', 'Enter a valid display name.');
    const hasAvatar = Object.hasOwn(request.data ?? {}, 'avatarUrl');
    const avatarUrl = request.data?.avatarUrl ?? '';
    if (hasAvatar && !validAvatar(avatarUrl)) throw new HttpsError('invalid-argument', 'Choose a supported avatar.');
    const firestore = getFirestore();
    const reference = firestore.doc(listenerProfilePath(uid, root));
    await firestore.runTransaction(async (transaction) => {
      const profile = await transaction.get(reference);
      const jobs = await Promise.all(roots.map((r) => transaction.get(firestore.doc(deletionJobPath(uid, r)))));
      if (jobs.some((job) => job.exists) || !profile.exists || profile.get('isActive') !== true || profile.get('role') !== 'listener') throw new HttpsError('failed-precondition', 'An active listener profile is required.');
      transaction.update(reference, { displayName, ...(hasAvatar ? { avatarUrl } : {}), updatedAt: FieldValue.serverTimestamp() });
    });
    return { updated: true };
  },
);
