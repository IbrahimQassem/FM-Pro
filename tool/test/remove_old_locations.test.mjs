import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let cleanup;
before(async () => {
  // The old script executes live deletion on import. Fail without importing it.
  const source = await readFile(new URL('../remove_old_locations.mjs', import.meta.url), 'utf8');
  assert.match(source, /export function parseCleanupArgs/);
  cleanup = await import('../remove_old_locations.mjs');
});

test('cleanup requires explicit project/root and defaults to read-only', () => {
  assert.throws(() => cleanup.parseCleanupArgs([]));
  assert.throws(() => cleanup.parseCleanupArgs(['--project', 'demo-test', '--root', 'unknown']));
  const options = cleanup.parseCleanupArgs(['--project', 'demo-test', '--root', 'HudHudDev']);
  assert.equal(options.mode, 'dry-run');
  assert.throws(() => cleanup.parseCleanupArgs(['--project', 'demo-test', '--root', 'HudHudOfficial', '--apply']));
  assert.throws(() => cleanup.parseCleanupArgs(['--project', 'demo-test', '--root', 'HudHudDev', '--apply', '--restore', '--report', 'r', '--backup', 'b']));
});

test('report keeps canonical and referenced legacy locations, with deterministic identity', () => {
  const input = { projectId: 'demo-test', root: 'HudHudDev',
    locations: [{ id: 'sanaa', data: { cityCode: 'sanaa' } },
      { id: 'legacy-used', data: { cityCode: 'old-city' } },
      { id: 'legacy-unused', data: { cityCode: 'unused' } }],
    stations: [{ id: 's', data: { cityCode: 'old-city' } }],
  };
  const first = cleanup.createCleanupReport(input);
  assert.deepEqual(first.candidates.map(item => item.id), ['legacy-unused']);
  assert.deepEqual(first.blocked.map(item => item.id), ['legacy-used']);
  assert.equal(first.runId, cleanup.createCleanupReport({ ...input, locations: input.locations.toReversed() }).runId);
  assert.throws(() => cleanup.validateCleanupReport({ ...first, root: 'HudHudOfficial' }, 'demo-test', 'HudHudDev'));
});

test('backup cannot overwrite an existing file or silently accept changed contents', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hudhud-cleanup-'));
  const path = join(dir, 'backup.json');
  const report = cleanup.createCleanupReport({ projectId: 'demo-test', root: 'HudHudDev', locations: [], stations: [] });
  await cleanup.ensureCleanupBackup(path, report);
  await cleanup.ensureCleanupBackup(path, report);
  await writeFile(path, '{}');
  await assert.rejects(cleanup.ensureCleanupBackup(path, report));
});

test('snapshot encoding round-trips nested values and Firestore timestamp precision', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const { Timestamp, GeoPoint } = require('firebase-admin/firestore');
  const value = { text: 'Synthetic', nested: [true, null, 3], stamp: new Timestamp(12, 345), point: new GeoPoint(1, 2) };
  const restored = cleanup.decodeCleanupValue(cleanup.encodeCleanupValue(value), {});
  assert.equal(restored.stamp.isEqual(value.stamp), true);
  assert.equal(restored.point.isEqual(value.point), true);
  assert.deepEqual(restored.nested, value.nested);
});

test('cleanup rejects a client connected to a different project before reading', async () => {
  await assert.rejects(cleanup.runCleanup({ projectId: 'demo-intended', root: 'HudHudDev', mode: 'dry-run' }, {
    projectId: 'demo-other', collection: () => assert.fail('wrong project was read'),
  }), /project does not match/);
});
