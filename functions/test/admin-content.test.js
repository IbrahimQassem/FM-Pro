import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Timestamp } from 'firebase-admin/firestore';
import {
  validateAdminContent,
  editableContent,
  contentIdentity,
} from '../lib/admin-content.js';

const fixtures = JSON.parse(
  await readFile(
    new URL('../../test/fixtures/admin-content-contract.json', import.meta.url),
    'utf8',
  ),
);
function fields(kind) {
  const { stats, ...content } = fixtures[kind];
  if (kind === 'stations' || kind === 'locations')
    content.locationType = 'governorate';
  return content;
}
test('all existing editable fixture kinds validate; episode dates become Firestore timestamps', () => {
  for (const kind of Object.keys(fixtures)) {
    const result = validateAdminContent(kind, fields(kind));
    if (kind === 'episodes') assert.ok(result.broadcastAt instanceof Timestamp);
  }
});
test('rejects operational fields, malformed types, invalid relationships, schedules and unsafe media', () => {
  for (const [kind, change] of [
    ['programs', { stats: { episodesCount: 9 } }],
    ['programs', { title: { unexpected: true } }],
    ['programs', { stationId: '../other' }],
    ['programs', { createdBy: 'forged' }],
    ['programs', { isActive: 'true' }],
    ['programs', { schedule: { weekdays: [0] } }],
    ['episodes', { audioUrl: 'http://radio.example/audio.mp3' }],
    ['episodes', { audioUrl: 'https://user:secret@radio.example/audio.mp3' }],
    ['episodes', { durationSeconds: -1 }],
    ['episodes', { broadcastAt: 'invalid' }],
    ['episodes', { broadcastAt: '+030000-01-01T00:00:00.000Z' }],
    ['locations', { sortOrder: -1 }],
    ['locations', { locationType: 'unknown' }],
    ['stations', { locationType: 'national', isNational: false }],
    ['banners', { startAt: '2030-01-03', expiresAt: '2030-01-02' }],
  ])
    assert.throws(
      () => validateAdminContent(kind, { ...fields(kind), ...change }),
      {
        code: 'invalid-argument',
      },
    );
});
test('legacy station HTTP artwork remains editable without weakening episode HTTPS', () => {
  const station = validateAdminContent('stations', {
    ...fields('stations'),
    logoUrl: 'http://radio.example/logo.png',
  });
  assert.equal(station.logoUrl, 'http://radio.example/logo.png');
});
test('editable comparisons omit backend fields, normalize timestamps and ignore object key order', () => {
  const content = fields('episodes');
  const stored = {
    ...content,
    broadcastAt: Timestamp.fromDate(new Date(content.broadcastAt)),
    stats: { playsCount: 8 },
    createdBy: 'server',
  };
  assert.deepEqual(
    editableContent('episodes', stored),
    editableContent('episodes', content),
  );
  const program = fields('programs');
  assert.deepEqual(
    editableContent('programs', {
      ...program,
      schedule: Object.fromEntries(Object.entries(program.schedule).reverse()),
    }),
    editableContent('programs', program),
  );
});
test('legacy empty list entries compare like the editor payload without false stale conflicts', () => {
  const program = fields('programs');
  assert.deepEqual(
    editableContent('programs', {
      ...program,
      presenters: ['  Presenter  ', ''],
    }),
    editableContent('programs', { ...program, presenters: ['Presenter'] }),
  );
});

test('natural identities match NFKC titles and canonical audio while preserving query identity', () => {
  assert.equal(
    contentIdentity('programs', { stationId: 'a', title: '  برنامج   FM ' }),
    contentIdentity('programs', { stationId: 'a', title: 'برنامج fm' }),
  );
  assert.notEqual(
    contentIdentity('programs', { stationId: 'a', title: 'برنامج' }),
    contentIdentity('programs', { stationId: 'b', title: 'برنامج' }),
  );
  assert.equal(
    contentIdentity('episodes', {
      programId: 'p',
      audioUrl: 'https://RADIO.example/audio?a=1#fragment',
    }),
    contentIdentity('episodes', {
      programId: 'p',
      audioUrl: 'https://radio.example/audio?a=1',
    }),
  );
  assert.notEqual(
    contentIdentity('episodes', {
      programId: 'p',
      audioUrl: 'https://radio.example/audio?a=1',
    }),
    contentIdentity('episodes', {
      programId: 'p',
      audioUrl: 'https://radio.example/audio?a=2',
    }),
  );
});
