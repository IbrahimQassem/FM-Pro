import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';

const minute = 60000;
const millis = value => value?.toMillis?.() ?? 0;
const retryableCodes = new Set(['messaging/server-unavailable', 'messaging/internal-error', 'messaging/message-rate-exceeded', 'messaging/quota-exceeded']);
const rejectedCodes = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument', 'messaging/invalid-payload', 'messaging/mismatched-credential', 'messaging/authentication-error', 'messaging/third-party-auth-error']);

/** A definite provider rejection is retryable; a transport/lost-ack failure is not. */
export function notificationFailure(error) {
  const code = error?.code;
  if (retryableCodes.has(code)) return { status: 'failed', retryable: true, reason: code };
  if (rejectedCodes.has(code)) return { status: 'failed', retryable: false, reason: code };
  return { status: 'unknown', retryable: false, reason: 'delivery-uncertain' };
}

/** No external send may begin until this lease is claimed and startDelivery succeeds. */
export async function claimDelivery({ firestore, reference, fingerprint, now = Date.now() }) {
  const lease = randomUUID();
  return firestore.runTransaction(async tx => {
    const previous = (await tx.get(reference)).data();
    if (previous && fingerprint !== undefined && previous.fingerprint !== fingerprint) {
      throw Object.assign(new Error('Delivery request payload changed.'), { code: 'delivery/payload-conflict' });
    }
    if (previous) {
      if (previous.status === 'sent' || previous.status === 'unknown') return null;
      if (previous.status === 'failed' && (previous.retryable !== true || millis(previous.retryAt) > now)) return null;
      if (previous.status === 'pending') {
        if (millis(previous.leaseUntil) > now) return null;
        if (previous.phase === 'sending') {
          tx.update(reference, { status: 'unknown', retryable: false, reason: 'lease-expired-during-send', updatedAt: Timestamp.fromMillis(now) });
          return null;
        }
      }
      if (millis(previous.expiresAt) <= now) {
        tx.update(reference, { status: 'failed', retryable: false, reason: 'expired', updatedAt: Timestamp.fromMillis(now) });
        return null;
      }
    }
    tx.set(reference, { status: 'pending', phase: 'claimed', lease,
      ...(fingerprint !== undefined ? { fingerprint } : {}),
      ...(fingerprint !== undefined && previous?.programCompatibility !== undefined ? { programCompatibility: previous.programCompatibility } : {}),
      leaseUntil: Timestamp.fromMillis(now + 10 * minute),
      attempts: (Number.isSafeInteger(previous?.attempts) ? previous.attempts : 0) + 1,
      createdAt: previous?.createdAt ?? Timestamp.fromMillis(now),
      updatedAt: Timestamp.fromMillis(now),
      expiresAt: previous?.expiresAt ?? Timestamp.fromMillis(now + 24 * 60 * minute),
      cleanupAt: previous?.cleanupAt ?? Timestamp.fromMillis(now + 30 * 24 * 60 * minute) });
    return lease;
  });
}

export async function startDelivery({ firestore, reference, lease, now = Date.now(), validate }) {
  return firestore.runTransaction(async tx => {
    const current = (await tx.get(reference)).data();
    if (current?.status !== 'pending' || current.lease !== lease || current.phase !== 'claimed' || millis(current.leaseUntil) <= now) return false;
    if (validate !== undefined && !await validate(tx)) return false;
    tx.update(reference, { phase: 'sending', updatedAt: Timestamp.fromMillis(now) });
    return true;
  });
}

export async function finishDelivery({ firestore, reference, lease, status, retryable = false, reason = '', messageId, now = Date.now() }) {
  if (!['sent', 'failed', 'unknown'].includes(status)) throw new Error('Invalid delivery outcome.');
  const safeReason = retryableCodes.has(reason) || rejectedCodes.has(reason) || ['delivery-uncertain', 'preparation-failed', 'ineligible', 'expired', 'legacy-compatibility-suppression'].includes(reason) ? reason : '';
  return firestore.runTransaction(async tx => {
    const current = (await tx.get(reference)).data();
    if (current?.status !== 'pending' || current.lease !== lease) return false;
    tx.update(reference, { status, retryable: status === 'failed' && retryable,
      ...(status === 'sent' && typeof messageId === 'string' ? { messageId: messageId.slice(0, 256) } : {}),
      reason: safeReason, updatedAt: Timestamp.fromMillis(now), leaseUntil: Timestamp.fromMillis(0),
      retryAt: Timestamp.fromMillis(now + Math.min(60 * minute, minute * 2 ** Math.min(current.attempts, 6))) });
    return true;
  });
}
