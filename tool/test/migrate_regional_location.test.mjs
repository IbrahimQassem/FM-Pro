import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRegionalArgs, runRegionalMigration } from '../migrate_regional_location.mjs';
test('regional maintenance requires an explicit project and root and defaults to preview', () => {
  assert.throws(() => parseRegionalArgs([]), /Explicit/);
  assert.deepEqual(parseRegionalArgs(['--project', 'demo-regional-test', '--root', 'HudHudDev']), { projectId: 'demo-regional-test', root: 'HudHudDev', mode: 'dry-run', reportPath: undefined, backupPath: undefined });
  assert.throws(() => parseRegionalArgs(['--project', 'demo-regional-test', '--root', 'HudHudDev', '--apply']), /report/);
});
test('regional maintenance rejects conflicting modes and misleading batch limits', () => {
  const base = ['--project', 'demo-regional-test', '--root', 'HudHudOfficial'];
  assert.throws(() => parseRegionalArgs([...base, '--apply', '--dry-run']), /mode/);
  assert.throws(() => parseRegionalArgs([...base, '--max-items', '10']), /atomic scope/);
});
test('wrong client projects fail before any collection read or write', async () => {
  let access = 0;
  await assert.rejects(runRegionalMigration({ projectId: 'demo-regional-test', root: 'HudHudDev' }, { projectId: 'demo-other', collection() { access++; } }), /Client project/);
  assert.equal(access, 0);
});
