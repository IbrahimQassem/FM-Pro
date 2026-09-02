import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  createVerificationCode,
  hashEmailIdentifier,
  hashVerificationCode,
  isVerificationCode,
  matchesVerificationCode,
  normalizeEmail,
  safeDisplayName,
} from '../lib/email-verification.js';

describe('email verification helpers', () => {
  test('creates a zero-padded six digit code', () => {
    assert.equal(createVerificationCode(() => 42), '000042');
  });

  test('hashes codes with both uid and server pepper', () => {
    const first = hashVerificationCode({
      uid: 'user-a',
      code: '123456',
      pepper: 'test-pepper',
    });
    const second = hashVerificationCode({
      uid: 'user-b',
      code: '123456',
      pepper: 'test-pepper',
    });
    assert.notEqual(first, second);
    assert.equal(
      matchesVerificationCode({
        uid: 'user-a',
        code: '123456',
        pepper: 'test-pepper',
        expectedHash: first,
      }),
      true,
    );
    assert.equal(
      matchesVerificationCode({
        uid: 'user-a',
        code: '654321',
        pepper: 'test-pepper',
        expectedHash: first,
      }),
      false,
    );
  });

  test('uses a non-reversible normalized email identifier for shared limits', () => {
    const first = hashEmailIdentifier({
      email: ' Listener@Example.COM ',
      pepper: 'test-pepper',
    });
    const second = hashEmailIdentifier({
      email: 'listener@example.com',
      pepper: 'test-pepper',
    });
    assert.equal(first, second);
    assert.equal(first.length, 64);
    assert.equal(first.includes('listener'), false);
  });

  test('validates codes and normalizes email without accepting malformed input', () => {
    assert.equal(isVerificationCode('123456'), true);
    assert.equal(isVerificationCode('12345a'), false);
    assert.equal(normalizeEmail(' Listener@Example.COM '), 'listener@example.com');
    assert.equal(normalizeEmail('not-an-email'), '');
  });

  test('uses a safe display name fallback', () => {
    assert.equal(safeDisplayName('  Sana Listener ', 'x@example.com'), 'Sana Listener');
    assert.equal(safeDisplayName('', 'listener@example.com'), 'listener');
    assert.equal(safeDisplayName('', 'x@example.com'), 'Listener');
  });
});
