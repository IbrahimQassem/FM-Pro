import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bannerStatus } from '../lib/banner-status.ts';

void test('banner visibility matches inclusive start and exclusive expiry in Flutter', () => {
  const start = Date.parse('2026-09-07T10:00:00Z');
  const end = start + 60000;
  const data = {
    isActive: true,
    startAt: { toMillis: () => start },
    expiresAt: new Date(end).toISOString(),
  };
  assert.equal(bannerStatus(data, start - 1), 'upcoming');
  assert.equal(bannerStatus(data, start), 'visible');
  assert.equal(bannerStatus(data, end - 1), 'visible');
  assert.equal(bannerStatus(data, end), 'expired');
  assert.equal(bannerStatus({ ...data, isActive: false }, start), 'inactive');
  assert.equal(bannerStatus({ isActive: true }, start), 'visible');
  assert.equal(
    bannerStatus({ isActive: true, expiresAt: 'bad' }, start),
    'invalid',
  );
});
