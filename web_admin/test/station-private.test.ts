import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAdminSaveRequest } from '../lib/save-content.ts';
import { buildAdminDeleteRequest } from '../lib/delete-episode.ts';
import {
  parseStationPrivateDocument,
  publicStationData,
  stationPrivateFields,
  stationPrivateReadPlan,
  stationPrivacyRequestOptions,
  type StationPrivacyOptions,
} from '../lib/station-private.ts';

for (const root of ['HudHudDev', 'HudHudOfficial'] as const) {
  const path = `${root}/stations/stations`;
  void test(`${root}: R01 save transmits a private revision and excludes legacy private expected fields`, () => {
    const request = buildAdminSaveRequest(root, 'stations', path, 'station',
      { name: 'Station', owner: 'Private owner' },
      { reference: { path: `${path}/station` }, data: { name: 'Station', owner: 'Legacy owner' } },
      undefined, 'editor', { expectedPrivateRevision: 4 });
    assert.equal(request.expectedPrivateRevision, 4);
    assert.equal(Object.hasOwn(request.expected!, 'owner'), false);
    assert.equal(request.content.owner, 'Private owner');
  });
  void test(`${root}: R01 explicit field deletion is distinct from omission and empty strings`, () => {
    const request = buildAdminSaveRequest(root, 'stations', path, 'station',
      { name: 'Station', contactPhone: '' }, null, undefined, 'editor',
      { expectedPrivateRevision: null, deletePrivateFields: ['owner'] });
    assert.deepEqual(request.deletePrivateFields, ['owner']);
    assert.equal(request.expectedPrivateRevision, null);
    assert.equal(request.content.contactPhone, '');
    assert.equal(Object.hasOwn(request.content, 'owner'), false);
  });
  void test(`${root}: R01 private edits require a loaded revision`, () => {
    assert.throws(() => buildAdminSaveRequest(root, 'stations', path, 'station',
      { name: 'Station', owner: 'Private owner' }, null), { name: 'ContentError' });
  });
  void test(`${root}: R01 deletion transmits the private revision and strips legacy private fields`, () => {
    const request = buildAdminDeleteRequest(root, 'stations', `${path}/station`,
      { name: 'Station', owner: 'Legacy owner', stats: { programsCount: 0 } },
      { expectedPrivateRevision: 3 });
    assert.equal(request.expectedPrivateRevision, 3);
    assert.equal(Object.hasOwn(request.expected as object, 'owner'), false);
    assert.deepEqual((request.expected as Record<string, unknown>).stats, { programsCount: 0 });
  });
}

void test('private reads require the existing super-admin claim predicate', () => {
  for (const claims of [{}, { admin: false }, { role: 'listener' },
    { admin: true, role: 'station_admin' }, { admin: true, role: 'moderator' }]) {
    assert.throws(() => stationPrivateReadPlan('HudHudDev', ['s'], claims), { name: 'ContentError' });
  }
  for (const claims of [{ admin: true }, { role: 'super_admin' }]) {
    assert.deepEqual(stationPrivateReadPlan('HudHudDev', ['s'], claims),
      { path: 'HudHudDev/stationPrivate/stations', chunks: [['s']] });
  }
});

void test('private reads are restricted to a validated bounded ID page', () => {
  const claims = { role: 'super_admin' };
  const ids = Array.from({ length: 50 }, (_, i) => `station-${i}`);
  const plan = stationPrivateReadPlan('HudHudOfficial', ids, claims);
  assert.deepEqual(plan.chunks.map(chunk => chunk.length), [30, 20]);
  assert.deepEqual(plan.chunks.flat(), ids);
  assert.deepEqual(stationPrivateReadPlan('HudHudOfficial', [], claims).chunks, []);
  for (const invalid of [['s', 's'], [...ids, 'extra'], ['s/child'], ['.'], ['..'], [''], [' s'], ['a'.repeat(129)]]) {
    assert.throws(() => stationPrivateReadPlan('HudHudOfficial', invalid, claims), { name: 'ContentError' });
  }
  assert.throws(() => stationPrivateReadPlan('Unknown' as never, ['s'], claims), { name: 'ContentError' });
});

void test('missing private documents are explicit, and canonical values are copied immutably', () => {
  assert.deepEqual(parseStationPrivateDocument(undefined), { revision: null, data: {} });
  const original = { schemaVersion: 1, revision: 2, owner: 'Private owner', contactPhone: '' };
  const parsed = parseStationPrivateDocument(original);
  original.owner = 'Changed outside reader';
  assert.deepEqual(parsed, { revision: 2, data: { owner: 'Private owner', contactPhone: '' } });
  assert.equal(Object.isFrozen(parsed), true);
  assert.equal(Object.isFrozen(parsed.data), true);
});

void test('malformed private documents fail closed without empty-value fallback', () => {
  for (const data of [{}, { schemaVersion: 2, revision: 1 },
    { schemaVersion: 1, revision: 0 }, { schemaVersion: 1, revision: 1.5 },
    { schemaVersion: 1, revision: Number.MAX_SAFE_INTEGER + 1 },
    { schemaVersion: 1, revision: 1, unknown: 'no' },
    { schemaVersion: 1, revision: 1, owner: null },
    { schemaVersion: 1, revision: 1, contactEmail: 'invalid' }]) {
    assert.throws(() => parseStationPrivateDocument(data), { name: 'ContentError' });
  }
  for (const key of stationPrivateFields) {
    assert.throws(() => parseStationPrivateDocument({ schemaVersion: 1, revision: 1, [key]: 3 }), { name: 'ContentError' });
  }
});

void test('public projection removes exactly the canonical 13 keys and preserves playback/counters', () => {
  const fields = Object.fromEntries(stationPrivateFields.map(key => [key, 'private']));
  const data: Record<string, unknown> = { ...fields, name: 'Station', streamUrl: 'https://public.example/live', stats: { totalPlays: 2 } };
  assert.deepEqual(publicStationData(data),
    { name: 'Station', streamUrl: 'https://public.example/live', stats: { totalPlays: 2 } });
  assert.equal(data.owner, 'private');
});

void test('privacy options reject invalid revisions, duplicate/overlapping deletions and non-station use', () => {
  for (const options of [{}, { expectedPrivateRevision: undefined },
    { expectedPrivateRevision: 0 }, { expectedPrivateRevision: -1 },
    { expectedPrivateRevision: 1.5 }, { expectedPrivateRevision: Number.MAX_SAFE_INTEGER + 1 },
    { expectedPrivateRevision: 1, deletePrivateFields: ['owner', 'owner'] },
    { expectedPrivateRevision: 1, deletePrivateFields: ['streamUrl'] },
    { expectedPrivateRevision: 1, deletePrivateFields: null },
    { expectedPrivateRevision: 1, schemaVersion: 1 }]) {
    assert.throws(() => stationPrivacyRequestOptions('stations', {}, options as StationPrivacyOptions), { name: 'ContentError' });
  }
  assert.throws(() => stationPrivacyRequestOptions('stations', { owner: '' },
    { expectedPrivateRevision: 1, deletePrivateFields: ['owner'] }), { name: 'ContentError' });
  assert.throws(() => stationPrivacyRequestOptions('programs', {}, { expectedPrivateRevision: null }), { name: 'ContentError' });
  assert.throws(() => buildAdminDeleteRequest('HudHudDev', 'stations', 'HudHudDev/stations/stations/s', {},
    { expectedPrivateRevision: 1, deletePrivateFields: [] }), { name: 'ContentError' });
  assert.deepEqual(stationPrivacyRequestOptions('stations', {}), {});
});
