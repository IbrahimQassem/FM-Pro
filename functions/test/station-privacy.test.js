import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicStation, prepareStationPrivacy, resolveStationPrivacy, validateStationPrivacyOptions, assertStationPrivateDeletion, stationPrivateFields } from '../lib/station-privacy.js';

const canonical = { owner: 'Synthetic owner', contactPhone: '', schemaVersion: 1, revision: 2 };
const station = { name: 'Synthetic station', stats: { programsCount: 3 }, healthStatus: 'healthy' };
const fails = fn => assert.throws(fn, { code: 'failed-precondition' });

test('partition removes all 13 keys including blanks and preserves operational fields without mutation', () => {
  const input = { ...station, ...Object.fromEntries(stationPrivateFields.map(key => [key, ''])) };
  assert.deepEqual(publicStation(input), station);
  assert.equal(Object.keys(input).length, 16);
});
test('private omission and exact state preserve revision; real changes require matching revision', () => {
  const omitted = prepareStationPrivacy(station, canonical, { content: { name: 'Edit' } });
  omitted.checkPrecondition();
  assert.equal(omitted.needsWrite, false);
  assert.equal(omitted.document.revision, 2);
  for (const expectedPrivateRevision of [undefined, null, 1]) {
    const data = { content: { owner: 'Changed' }, ...(expectedPrivateRevision === undefined ? {} : { expectedPrivateRevision }) };
    fails(() => prepareStationPrivacy(station, canonical, data).checkPrecondition());
  }
  const changed = prepareStationPrivacy(station, canonical, { content: { owner: '  Changed  ' }, expectedPrivateRevision: 2 });
  changed.checkPrecondition();
  assert.equal(changed.document.owner, 'Changed');
  assert.equal(changed.document.revision, 3);
});
test('explicit deletion differs from blank and retains metadata on empty private state', () => {
  const result = prepareStationPrivacy(station, canonical, { content: {}, deletePrivateFields: ['owner', 'contactPhone'], expectedPrivateRevision: 2 });
  result.checkPrecondition();
  assert.deepEqual(result.document, { schemaVersion: 1, revision: 3 });
});
test('legacy migration preserves validated fields; conflicts and private orphans fail closed', () => {
  const legacy = prepareStationPrivacy({ ...station, owner: ' Legacy ' }, null, { content: {} });
  legacy.checkPrecondition();
  assert.equal(legacy.scrub, true);
  assert.deepEqual(legacy.document, { owner: 'Legacy', schemaVersion: 1, revision: 1 });
  fails(() => resolveStationPrivacy({ owner: 'Different' }, canonical));
  fails(() => resolveStationPrivacy({ address: 'Legacy only' }, canonical));
  fails(() => prepareStationPrivacy(null, canonical, { content: {} }));
  assert.equal(resolveStationPrivacy({ owner: 'Synthetic owner' }, canonical).scrub, true);
});
test('invalid schemas, revision overflow and malformed options never become silent defaults', () => {
  for (const document of [{ ...canonical, schemaVersion: 2 }, { ...canonical, revision: 0 }, { ...canonical, unexpected: '' }]) fails(() => resolveStationPrivacy(station, document));
  fails(() => prepareStationPrivacy(station, { ...canonical, revision: Number.MAX_SAFE_INTEGER }, { content: { owner: 'Changed' }, expectedPrivateRevision: Number.MAX_SAFE_INTEGER }));
  for (const data of [{ expectedPrivateRevision: 0 }, { expectedPrivateRevision: '2' }, { deletePrivateFields: null },
    { deletePrivateFields: ['owner', 'owner'], expectedPrivateRevision: 2 }, { deletePrivateFields: ['name'], expectedPrivateRevision: 2 },
    { deletePrivateFields: ['owner'], content: { owner: '' }, expectedPrivateRevision: 2 }, { deletePrivateFields: ['owner'] }, { content: { owner: null } }]) {
    assert.throws(() => validateStationPrivacyOptions('stations', data), { code: 'invalid-argument' });
  }
  assert.throws(() => validateStationPrivacyOptions('programs', { expectedPrivateRevision: null }), { code: 'invalid-argument' });
});
test('private deletion requires observed revision and fails for stale or omitted preconditions', () => {
  for (const data of [{}, { expectedPrivateRevision: null }, { expectedPrivateRevision: 1 }]) fails(() => assertStationPrivateDeletion(station, canonical, data));
  assertStationPrivateDeletion(station, canonical, { expectedPrivateRevision: 2 });
  assertStationPrivateDeletion(station, null, {});
});
