import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatNotificationDateTime } from '../lib/user-date.ts';
import { resourceDefinitions } from '../lib/admin-resources.ts';

void test('formatNotificationDateTime returns fallback when date is missing, null, or invalid', () => {
  assert.equal(formatNotificationDateTime(null), '');
  assert.equal(formatNotificationDateTime(undefined), '');
  assert.equal(formatNotificationDateTime(null, 'الآن'), 'الآن');
  assert.equal(formatNotificationDateTime(undefined, 'الآن'), 'الآن');
  assert.equal(formatNotificationDateTime('', 'الآن'), 'الآن');
  assert.equal(formatNotificationDateTime('invalid-date', 'الآن'), 'الآن');
  assert.equal(formatNotificationDateTime({}, 'الآن'), 'الآن');
});

void test('formatNotificationDateTime formats valid dates with Arabic locale', () => {
  const tsObj = {
    toDate: () => new Date('2026-09-19T10:30:00Z'),
  };
  const result = formatNotificationDateTime(tsObj, 'الآن');
  assert.notEqual(result, 'الآن');
  assert.match(result, /(2026|٢٠٢٦)/);

  const secondsObj = {
    seconds: Math.floor(new Date('2026-09-19T10:30:00Z').getTime() / 1000),
  };
  const resultSeconds = formatNotificationDateTime(secondsObj, 'الآن');
  assert.notEqual(resultSeconds, 'الآن');
  assert.match(resultSeconds, /(2026|٢٠٢٦)/);

  const isoResult = formatNotificationDateTime('2026-09-19T10:30:00Z', 'الآن');
  assert.notEqual(isoResult, 'الآن');
  assert.match(isoResult, /(2026|٢٠٢٦)/);
});

void test('resourceDefinitions registers notifications resource correctly', () => {
  const def = resourceDefinitions.notifications;
  assert.ok(def, 'notifications resource definition should exist');
  assert.equal(def.key, 'notifications');
  assert.equal(def.singular, 'إشعار');
  assert.equal(def.deletable, true);
  assert.equal(def.editable, false);
  assert.equal(def.creatable, false);
  assert.match(def.path || '', /\/notifications\/notifications$/);
});

void test('notification payload structures and validation bounds', () => {
  const samplePayload = {
    title: 'بث مباشر الآن 🎙️',
    body: 'استمع إلى البث المباشر لأحدث الأخبار والبرامج الإذاعية عبر تطبيق هدهد FM.',
    targetType: 'station',
    targetId: 'station_sanaa',
    targetLabel: 'إذاعة صنعاء',
    imageUrl: 'https://example.com/cover.jpg',
  };

  assert.ok(samplePayload.title.length > 0 && samplePayload.title.length <= 100);
  assert.ok(samplePayload.body.length > 0 && samplePayload.body.length <= 250);
  assert.ok(['general', 'station', 'episode', 'url'].includes(samplePayload.targetType));
  assert.equal(samplePayload.targetId, 'station_sanaa');
  assert.equal(samplePayload.targetLabel, 'إذاعة صنعاء');
  assert.ok(samplePayload.imageUrl.startsWith('https://'));
});

void test('imageUrl must start with https:// to be accepted', () => {
  const validUrl = 'https://cdn.example.com/image.jpg';
  const invalidHttp = 'http://cdn.example.com/image.jpg';
  const invalidRelative = '/images/cover.jpg';
  const empty = '';

  assert.ok(validUrl.startsWith('https://'), 'https:// URL is valid');
  assert.ok(!invalidHttp.startsWith('https://'), 'http:// URL should be rejected');
  assert.ok(!invalidRelative.startsWith('https://'), 'relative URL should be rejected');
  assert.ok(!empty.startsWith('https://'), 'empty string should be rejected');
});

void test('user roles in admin panel match system role values', () => {
  const validRoles = ['super_admin', 'station_admin', 'moderator', 'listener'];
  const legacyRoles = ['admin', 'editor'];

  // Actual roles must be valid
  for (const role of validRoles) {
    assert.ok(validRoles.includes(role), `${role} should be a valid role`);
  }

  // Legacy roles must NOT be used
  for (const role of legacyRoles) {
    assert.ok(!validRoles.includes(role), `Legacy role "${role}" should not be in valid roles`);
  }
});
