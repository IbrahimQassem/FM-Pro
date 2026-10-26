import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import { runSheetSync } from '../../functions/scripts/sync_sheet_updates.mjs';
import { analyzeStations } from '../migrate_station_locations.mjs';

const privateFields = 'owner address contactPerson contactPhone contactEmail streamType audioCodec bitrateKbps sampleRateHz transmitterPower transmitterLocation coverageArea rds'.split(' ');
const roots = ['HudHudDev', 'HudHudOfficial'];
function fakeFirestore(existing = false) {
  const writes = [];
  let reads = 0;
  const ref = (path) => ({
    collection: (name) => ref(`${path}/${name}`),
    doc: (id) => ref(`${path}/${id}`),
    get: async () => { reads++; return { exists: path.includes('/locations/') || existing, get: () => 'old-stream' }; },
    set: async (data) => { writes.push({ path, data, kind: 'set' }); },
    update: async (data) => { writes.push({ path, data, kind: 'update' }); },
  });
  return { db: { collection: (name) => ref(name) }, writes, reads: () => reads };
}
for (const field of [...privateFields, 'unexpectedStationField']) {
  test(`sheet creation rejects ${field} before any read or write in both roots`, async () => {
    const fake = fakeFirestore();
    await assert.rejects(runSheetSync({ db: fake.db, targetRoots: roots, shouldApply: true,
      stations: [{ id: 'synthetic-station', data: { name: 'Synthetic', streamUrl: 'https://example.invalid/live', [field]: 'synthetic-private-value' } }],
      upgrades: [], log: () => {},
    }), /public station/i);
    assert.equal(fake.reads(), 0);
    assert.equal(fake.writes.length, 0);
  });
  test(`sheet stream update rejects ${field} before any writes`, async () => {
    const fake = fakeFirestore(true);
    await assert.rejects(runSheetSync({ db: fake.db, targetRoots: roots, shouldApply: true,
      stations: [], upgrades: [{ id: 'synthetic-station', updates: { streamUrl: 'https://example.invalid/live', [field]: 'synthetic-private-value' } }], log: () => {},
    }), /public station/i);
    assert.equal(fake.reads(), 0);
    assert.equal(fake.writes.length, 0);
  });
}
test('sheet dry-run writes nothing, create skips existing stations and stream updates remain narrow', async () => {
  const options = { targetRoots: roots, stations: [{ id: 'synthetic-station', data: { name: 'Synthetic', streamUrl: 'https://example.invalid/live' } }], upgrades: [], log: () => {} };
  const dry = fakeFirestore();
  await runSheetSync({ ...options, db: dry.db });
  assert.equal(dry.writes.length, 0);
  const create = fakeFirestore();
  await runSheetSync({ ...options, db: create.db, shouldApply: true });
  assert.equal(create.writes.length, 2);
  assert.deepEqual(create.writes.map(({ path }) => path), roots.map(root => `${root}/stations/stations/synthetic-station`));
  const existing = fakeFirestore(true);
  await runSheetSync({ ...options, db: existing.db, shouldApply: true });
  assert.equal(existing.writes.length, 0);
  const update = fakeFirestore(true);
  await runSheetSync({ db: update.db, targetRoots: roots, shouldApply: true, stations: [],
    upgrades: [{ id: 'synthetic-station', updates: { streamUrl: 'https://example.invalid/live', isLive: true, healthStatus: 'online', consecutiveFailures: 0 } }], log: () => {} });
  assert.equal(update.writes.length, 2);
  assert.ok(update.writes.every(write => write.kind === 'update' && Object.keys(write.data).length === 4));
});
test('missing-station import public-map guard does not copy private metadata', async () => {
  const source = await readFile(new URL('../import_programs_and_episodes.mjs', import.meta.url), 'utf8');
  const mapping = source.match(/stationsToCreate\.set\(targetStationId, (\{[\s\S]*?\n      \})\);/);
  assert.ok(mapping, 'existing explicit station map must be reviewed if changed');
  const meta = { name: 'Synthetic', nameEn: 'Synthetic', cityCode: 'sanaa', city: 'Synthetic', ...Object.fromEntries(privateFields.map(key => [key, 'synthetic-private-value'])) };
  const data = runInNewContext(`(${mapping[1]})`, { meta });
  assert.ok(privateFields.every(key => !Object.hasOwn(data, key)));
});
test('geography proposal and regional restore retain only geography fields', async () => {
  const privateData = Object.fromEntries(privateFields.map(key => [key, 'synthetic-private-value']));
  const result = analyzeStations([{ id: 'synthetic', data: { cityCode: 'sanaa', cityNameAr: 'صنعاء', ...privateData } }]);
  assert.equal(result.decisions.length, 1);
  assert.ok(result.decisions[0].proposed);
  assert.ok(privateFields.every(key => !Object.hasOwn(result.decisions[0].proposed, key)));
  const source = await readFile(new URL('../migrate_regional_location.mjs', import.meta.url), 'utf8');
  const fields = source.match(/const fields = (\[[\s\S]*?\]);/);
  const restore = source.match(/const restoredProjection = ([\s\S]*?);\n/);
  assert.ok(fields && restore, 'existing regional projection requires review if changed');
  const restored = runInNewContext(`const fields = ${fields[1]}; (${restore[1]})(item)`, { item: { before: { cityCode: 'sanaa', ...privateData }, missing: [] }, FieldValue: { delete: () => 'synthetic-delete' } });
  assert.deepEqual(Object.keys(restored), ['countryCode', 'countryNameAr', 'cityCode', 'cityNameAr', 'locationType']);
  assert.ok(privateFields.every(key => !Object.hasOwn(restored, key)));
});

test('private-field regression set matches the canonical server contract without importing its SDK', async () => {
  const source = await readFile(new URL('../../functions/lib/station-privacy.js', import.meta.url), 'utf8');
  const fields = source.match(/stationPrivateFields = Object\.freeze\('([^']+)'\.split\(' '\)\)/);
  assert.ok(fields, 'canonical field declaration changed; review parity');
  assert.deepEqual(privateFields, fields[1].split(' '));
});
test('stream upgrades cannot widen to other public fields and log no identifiers or URLs', async () => {
  const fake = fakeFirestore(true);
  await assert.rejects(runSheetSync({ db: fake.db, stations: [], upgrades: [{ id: 'synthetic-sensitive-id', updates: { name: 'Synthetic' } }], log: () => {} }), /public station/i);
  assert.equal(fake.reads(), 0);
  const logs = [];
  await runSheetSync({ db: fake.db, shouldApply: true, stations: [], upgrades: [{ id: 'synthetic-sensitive-id', name: 'synthetic-sensitive-name', updates: { streamUrl: 'https://example.invalid/private-path' } }], log: line => logs.push(line) });
  assert.doesNotMatch(logs.join('\n'), /synthetic-sensitive|https?:|old-stream/);
});

test('the shipped sheet station plan remains public and preserves relationship counters', async () => {
  const fake = fakeFirestore();
  await runSheetSync({ db: fake.db, targetRoots: roots, shouldApply: true, log: () => {} });
  assert.equal(fake.writes.length, 14);
  for (const { data } of fake.writes) {
    assert.deepEqual(data.stats, { programsCount: 0, subscribersCount: 0, totalPlays: 0 });
    assert.ok(privateFields.every(key => !Object.hasOwn(data, key)));
  }
});

for (const field of ['streamUrl', 'healthStatus', 'updatedAt']) {
  test(`sheet rejects nested private objects in allowed ${field}`, async () => {
    const fake = fakeFirestore(true);
    await assert.rejects(runSheetSync({ db: fake.db, shouldApply: true, stations: [],
      upgrades: [{ id: 'synthetic', updates: { streamUrl: 'https://example.invalid/live', [field]: { contactEmail: 'synthetic-private' } } }], log: () => {} }), /public station/i);
    assert.equal(fake.reads(), 0);
    assert.equal(fake.writes.length, 0);
  });
}
test('sheet refuses unknown roots before any read', async () => {
  const fake = fakeFirestore();
  await assert.rejects(runSheetSync({ db: fake.db, targetRoots: ['UnknownRoot'], shouldApply: true, stations: [], upgrades: [], log: () => {} }), /root/i);
  assert.equal(fake.reads(), 0);
  assert.equal(fake.writes.length, 0);
});


test('sheet accepts real Date, SDK timestamp and server timestamp without widening partial updates', async () => {
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const { Timestamp, FieldValue } = require('firebase-admin/firestore');
  for (const updatedAt of [new Date('2026-01-01T00:00:00Z'), Timestamp.fromMillis(0), FieldValue.serverTimestamp()]) {
    const fake = fakeFirestore(true);
    await runSheetSync({ db: fake.db, targetRoots: roots, shouldApply: true, stations: [],
      upgrades: [{ id: 'synthetic', updates: { streamUrl: 'https://example.invalid/live', updatedAt } }], log: () => {} });
    assert.equal(fake.writes.length, 2);
    assert.equal(fake.writes[0].data.updatedAt, updatedAt);
  }
  const fake = fakeFirestore(true);
  await assert.rejects(runSheetSync({ db: fake.db, stations: [], upgrades: [{ id: 'synthetic', updates: { updatedAt: FieldValue.delete() } }], log: () => {} }), /public station/i);
  assert.equal(fake.reads(), 0);
});
test('mixed known and unknown roots fail closed for the entire plan', async () => {
  const fake = fakeFirestore();
  await assert.rejects(runSheetSync({ db: fake.db, targetRoots: ['HudHudDev', 'UnknownRoot'], shouldApply: true, stations: [], upgrades: [], log: () => {} }), /root/i);
  assert.equal(fake.reads(), 0);
});
