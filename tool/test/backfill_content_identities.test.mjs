import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { parseIdentityArgs, identityManifest, validateIdentityManifest } from '../backfill_content_identities.mjs';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { Timestamp } = require('firebase-admin/firestore');
const base = { projectId: 'demo-hudhud-identities', root: 'HudHudDev', kind: 'programs', parentId: 'station', parentVersion: Timestamp.fromMillis(100), records: [{ id: 'p', data: { stationId: 'station', title: 'Synthetic' } }], reservations: [] };

test('identity maintenance requires an explicit target and bounded reviewed mutation options', () => {
  const args = ['--project', base.projectId, '--root', base.root, '--kind', base.kind, '--parent', base.parentId];
  assert.equal(parseIdentityArgs(args).mode, 'dry-run');
  for (const invalid of [[], args.slice(2), [...args, '--apply'], [...args, '--restore'], [...args, '--max-items', '101'], [...args, '--max-records', '10001'], [...args, '--kind', 'users'], [...args, '--parent', '../station'], [...args, '--apply', '--dry-run']]) assert.throws(() => parseIdentityArgs(invalid));
});

test('manifests are deterministic, hash-bound to project/root/scope and contain no raw titles or URLs', () => {
  const manifest = identityManifest(base);
  assert.deepEqual(validateIdentityManifest(manifest, base), manifest);
  assert.equal(JSON.stringify(manifest).includes('Synthetic'), false);
  assert.throws(() => validateIdentityManifest({ ...manifest, parentId: 'other' }, base));
  assert.throws(() => validateIdentityManifest(manifest, { ...base, root: 'HudHudOfficial' }));
  assert.throws(() => validateIdentityManifest({ ...manifest, items: [] }, base));
});

test('duplicate identities and malformed or wrong-parent content block the whole manifest', () => {
  const duplicate = identityManifest({ ...base, records: [...base.records, { id: 'p2', data: { stationId: 'station', title: '  SYNTHETIC  ' } }] });
  assert.equal(duplicate.blockers.some(item => item.reason === 'duplicate-identity'), true);
  assert.equal(identityManifest({ ...base, records: [{ id: 'bad', data: { stationId: 'other', title: 'Other' } }] }).blockers.length, 1);
  assert.equal(identityManifest({ ...base, records: [{ id: 'bad', data: { stationId: 'station' } }] }).blockers.length, 1);
});

test('an occupied key must already belong to the reviewed document and kind', () => {
  const initial = identityManifest(base);
  const key = initial.items[0].key;
  const occupied = identityManifest({ ...base, reservations: [{ id: key, data: { targetId: 'other', targetKind: 'programs', keyHash: key } }] });
  assert.equal(occupied.blockers.some(item => item.reason === 'reservation-conflict'), true);
  const own = identityManifest({ ...base, reservations: [{ id: key, data: { targetId: 'p', targetKind: 'programs', keyHash: key } }] });
  assert.equal(own.blockers.length, 0);
});

test('a malformed record discovered by paged preview becomes a blocker without retaining raw data', () => {
  const report = identityManifest({ ...base, records: [{ id: 'broken', key: null, parentId: base.parentId }] });
  assert.equal(report.blockers[0].reason, 'invalid-content');
});
