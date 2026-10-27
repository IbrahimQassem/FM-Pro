import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { prepareContentIdentity } from '../lib/admin-content-relations.js';
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

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  const aliasFixture = () => {
    const raw = 'https://cdn.example.com/alias.mp3?a=1&amp;b=2', decoded = raw.replace('&amp;', '&');
    const owner = { stationId: 'alias-station', programId: 'alias-program', audioUrl: decoded, externalId: 'stable-guid' };
    const keys = [raw, decoded].map(audioUrl => contentIdentity('episodes', { programId: owner.programId, audioUrl }));
    const reservations = new Map(keys.map(key => [key, { targetKind: 'episodes', targetId: 'alias-owner', keyHash: key,
      rssAliasVersion: 1, rssOwnerRoot: root, rssOwnerProgramId: owner.programId, rssOwnerStationId: owner.stationId, rssOwnerExternalIdHash: createHash('sha256').update(owner.externalId).digest('hex') }]));
    const staged = [];
    const ref = path => ({ path, id: path.split('/').at(-1) });
    const db = { doc: ref, collection: path => ({ where: () => ({ limit: () => ({ queryPath: path }) }) }) };
    const tx = { get: async target => {
      if (target.queryPath) return { size: 1, docs: [{ id: 'alias-owner', data: () => owner }] };
      const value = target.path.includes('/importKeys/') ? reservations.get(target.id) : target.id === 'alias-owner' ? owner : undefined;
      return { exists: !!value, data: () => value, get: key => value?.[key] };
    }, set: (target, value) => staged.push({ action: 'set', target, value }), delete: target => staged.push({ action: 'delete', target }) };
    return { raw, decoded, owner, keys, reservations, staged, db, tx };
  };
  test(`${root}: R09 admin imports cannot steal a verified historical RSS alias`, async () => {
    const f = aliasFixture();
    await assert.rejects(prepareContentIdentity(f.tx, f.db, { root, kind: 'episodes', id: 'other', content: { ...f.owner, audioUrl: f.raw }, existing: null }),
      error => error.code === 'already-exists');
    assert.equal(f.staged.length, 0);
  });
  test(`${root}: R09 editing an RSS URL retains historical alias ownership`, async () => {
    const f = aliasFixture();
    const writes = await prepareContentIdentity(f.tx, f.db, { root, kind: 'episodes', id: 'alias-owner',
      content: { ...f.owner, audioUrl: 'https://cdn.example.com/edited.mp3' }, existing: f.owner });
    for (const write of writes) write();
    assert.equal(f.staged.some(write => write.action === 'delete'), false);
  });
  test(`${root}: R09 malformed RSS alias proof fails closed instead of releasing an occupied key`, async () => {
    const f = aliasFixture(); f.reservations.get(f.keys[0]).rssAliasVersion = 99;
    await assert.rejects(prepareContentIdentity(f.tx, f.db, { root, kind: 'episodes', id: 'other', content: { ...f.owner, audioUrl: f.raw }, existing: null }),
      error => error.code === 'failed-precondition');
    assert.equal(f.staged.length, 0);
  });  for (const [label, change] of [
    ['foreign root', proof => { proof.rssOwnerRoot = root === 'HudHudDev' ? 'HudHudOfficial' : 'HudHudDev'; }],
    ['foreign station', proof => { proof.rssOwnerStationId = 'other-station'; }],
    ['foreign program', proof => { proof.rssOwnerProgramId = 'other-program'; }],
    ['external identity mismatch', proof => { proof.rssOwnerExternalIdHash = 'f'.repeat(64); }],
  ]) test(`${root}: R09 ${label} proof cannot authorize alias ownership`, async () => {
    const f = aliasFixture(); change(f.reservations.get(f.keys[0]));
    await assert.rejects(prepareContentIdentity(f.tx, f.db, { root, kind: 'episodes', id: 'other', content: { ...f.owner, audioUrl: f.raw }, existing: null }),
      error => error.code === 'failed-precondition');
    assert.equal(f.staged.length, 0);
  });

}
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
