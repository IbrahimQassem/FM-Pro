import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

export const verificationCodeLength = 6;
export const verificationCodeLifetimeSeconds = 10 * 60;
export const verificationResendDelaySeconds = 60;
export const verificationMaxAttempts = 5;
export const verificationMaxSendsPerHour = 5;
export const unverifiedAccountRetentionDays = 30;

export function createVerificationCode(randomInteger = randomInt) {
  return String(randomInteger(0, 10 ** verificationCodeLength)).padStart(
    verificationCodeLength,
    '0',
  );
}

export function hashVerificationCode({ uid, code, pepper }) {
  return createHmac('sha256', pepper)
    .update(`${uid}:${code}`, 'utf8')
    .digest('hex');
}

export function hashEmailIdentifier({ email, pepper }) {
  return createHmac('sha256', pepper)
    .update(`email:${normalizeEmail(email)}`, 'utf8')
    .digest('hex');
}

export function matchesVerificationCode({ uid, code, pepper, expectedHash }) {
  if (!isVerificationCode(code) || typeof expectedHash !== 'string') {
    return false;
  }
  const actual = Buffer.from(
    hashVerificationCode({ uid, code, pepper }),
    'hex',
  );
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isVerificationCode(value) {
  return typeof value === 'string' && /^\d{6}$/.test(value);
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return '';
  }
  return email;
}

export function safeDisplayName(value, email) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate.length >= 2 && candidate.length <= 120) return candidate;
  const prefix = email.split('@')[0]?.trim() ?? '';
  if (prefix.length >= 2 && prefix.length <= 120) return prefix;
  return 'Listener';
}
