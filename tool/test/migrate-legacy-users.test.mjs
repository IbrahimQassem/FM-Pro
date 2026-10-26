import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

const toolUrl = new URL('../migrate-legacy-users.mjs', import.meta.url);
const source = await readFile(toolUrl, 'utf8');
const roots = ['HudHudDev', 'HudHudOfficial'];
const sentinel = { uid: 'synthetic-private-uid', name: 'Synthetic private name', email: 'synthetic-private@example.test' };

function fixture({ root, legacy = {}, existing, completed = false, lowercase = false } = {}) {
  const writes = [], logs = [], reads = [];
  const targetPath = `${root}/users/users/${sentinel.uid}`;
  const records = new Map(existing === undefined ? [] : [[targetPath, { ...existing }]]);
  const snapshot = data => ({ exists: data !== undefined, data: () => data });
  const firestore = {
    doc(path) {
      return {
        path,
        async get() { reads.push(path); return snapshot(path.includes('/system/') ? (completed ? { status: 'completed' } : undefined) : records.get(path)); },
        async set(data) { writes.push({ kind: 'marker', path, data }); records.set(path, data); },
      };
    },
    collection(path) {
      return { path, async get() {
        reads.push(path);
        const empty = lowercase && path === 'HudHudFmGooglePlay/Users/Users';
        return { empty, size: empty ? 0 : 1, docs: empty ? [] : [{ id: sentinel.uid, data: () => legacy }] };
      } };
    },
    batch() {
      const pending = [];
      return {
        set(ref, data) { pending.push({ kind: 'create', path: ref.path, data }); },
        update(ref, data) { pending.push({ kind: 'update', path: ref.path, data }); },
        async commit() { for (const item of pending) { writes.push(item); records.set(item.path, item.kind === 'update' ? { ...records.get(item.path), ...item.data } : item.data); } },
      };
    },
  };
  return { firestore, writes, logs, reads, records, targetPath, log: message => logs.push(String(message)) };
}

async function execute(options = {}) {
  const f = fixture(options);
  if (source.includes('export async function runLegacyUsersMigration')) {
    const { runLegacyUsersMigration } = await import(toolUrl);
    f.result = await runLegacyUsersMigration({ firestore: f.firestore, projectId: 'demo-hudhud-legacy', targetRoot: options.root,
      shouldApply: options.apply ?? false, force: options.force ?? false, timestamp: () => 'synthetic-timestamp', log: f.log });
  } else {
    // Pre-refactor RED harness runs the actual legacy script against fake SDKs;
    // no production imports, credential files, Firebase clients or IO execute.
    const stripped = source.replace(/^#!.*\n/, '').replace(/^import .*;\n/gm, '')
      .replace(/^const require = createRequire\(.*;\n/m, '')
      .replace('run().catch(', 'globalThis.execution = run().catch(');
    const fakeProcess = { env: { GCLOUD_PROJECT: 'demo-hudhud-legacy', TARGET_ROOT: options.root },
      argv: ['node', 'tool', ...(options.apply === false ? ['--dry-run'] : []), ...(options.force ? ['--force'] : [])],
      on() {}, exit(code) { throw Object.assign(new Error('Synthetic process exit'), { code }); } };
    const require = name => name.endsWith('/app') ? { initializeApp() {}, cert() {} } :
      { getFirestore: () => f.firestore, FieldValue: { serverTimestamp: () => 'synthetic-timestamp' } };
    const context = { require, process: fakeProcess, console: { log: f.log, error: f.log }, fs: {}, URL };
    vm.runInNewContext(stripped, context);
    await context.execution;
  }
  return f;
}

for (const root of roots) {
  test(`${root}: R10 new profiles omit email and preserve supported mapping`, async () => {
    const f = await execute({ root, apply: true, legacy: { email: sentinel.email, name: sentinel.name, username: 'chosen', photoURL: 'https://example.test/avatar', disabled: true, role: 'listener' } });
    const data = f.records.get(f.targetPath);
    assert.equal(Object.hasOwn(data, 'email'), false);
    assert.equal(data.displayName, sentinel.name);
    assert.equal(data.username, 'chosen');
    assert.equal(data.avatarUrl, 'https://example.test/avatar');
    assert.equal(data.isActive, false);
    assert.equal(data.role, 'listener');
  });
  test(`${root}: R10 existing profiles never acquire an email backfill`, async () => {
    const f = await execute({ root, apply: true, existing: { displayName: 'Chosen listener', isActive: true }, legacy: { email: sentinel.email, name: sentinel.name } });
    assert.equal(Object.hasOwn(f.records.get(f.targetPath), 'email'), false);
    assert.equal(f.records.get(f.targetPath).displayName, 'Chosen listener');
  });
  test(`${root}: R10 missing names use a neutral default`, async () => {
    const f = await execute({ root, apply: true, legacy: { email: sentinel.email } });
    assert.equal(f.records.get(f.targetPath).displayName, 'Listener');
  });
  test(`${root}: R10 account values stay out of logs`, async () => {
    const f = await execute({ root, apply: true, legacy: { email: sentinel.email, name: sentinel.name } });
    assert.equal(Object.values(sentinel).some(value => f.logs.join('\n').includes(value)), false);
  });
  test(`${root}: default execution performs zero writes including barrier`, async () => {
    const f = await execute({ root, legacy: { name: 'Listener' } });
    assert.equal(f.writes.length, 0);
  });
  test(`${root}: explicit dry-run preserves existing fields and marker`, async () => {
    const f = await execute({ root, apply: false, existing: { email: sentinel.email }, legacy: { name: sentinel.name } });
    assert.equal(f.writes.length, 0);
    assert.equal(f.records.get(f.targetPath).email, sentinel.email);
  });
}

// These are guard/compatibility checks, not additional baseline RED claims.
const { parseLegacyUserOptions, runLegacyUsersMigration } = await import(toolUrl);
for (const root of roots) {
  test(`${root}: existing email and explicit chosen name remain untouched`, async () => {
    const existing = { displayName: 'Chosen@listener', email: 'existing@example.test', role: 'listener', isActive: true };
    const f = await execute({ root, apply: true, existing, legacy: { name: sentinel.name, email: sentinel.email } });
    assert.deepEqual(f.records.get(f.targetPath), existing);
    assert.equal(f.writes.some(write => write.kind !== 'marker'), false);
  });
  test(`${root}: safe name backfill does not remove an existing email`, async () => {
    const f = await execute({ root, apply: true, existing: { email: 'existing@example.test', role: 'listener' }, legacy: { name: sentinel.name, email: sentinel.email } });
    assert.equal(f.records.get(f.targetPath).email, 'existing@example.test');
    assert.equal(f.records.get(f.targetPath).displayName, sentinel.name);
    assert.equal(Object.hasOwn(f.writes.find(write => write.kind === 'update').data, 'email'), false);
    assert.equal(Object.values(sentinel).some(value => f.logs.join('\n').includes(value)), false);
  });
  test(`${root}: completed barrier blocks reads and writes unless force is explicit`, async () => {
    const blocked = await execute({ root, apply: true, completed: true, legacy: { name: 'Listener' } });
    assert.equal(blocked.writes.length, 0);
    assert.equal(blocked.reads.length, 1);
    const forced = await execute({ root, apply: true, force: true, completed: true, legacy: { name: 'Listener' } });
    assert.equal(forced.records.get(forced.targetPath).displayName, 'Listener');
    assert.equal(forced.result.status, 'completed');
  });
  test(`${root}: lowercase legacy fallback preserves source provenance`, async () => {
    const f = await execute({ root, apply: true, lowercase: true, legacy: { userName: 'Legacy chosen', photoUrl: 'https://example.test/avatar', timestamp: 'legacy-date' } });
    const profile = f.records.get(f.targetPath);
    assert.equal(profile.migratedFrom, 'HudHudFmGooglePlay/users/users');
    assert.equal(profile.displayName, 'Legacy chosen');
    assert.equal(profile.username, 'Legacy chosen');
    assert.equal(profile.createdAt, 'legacy-date');
  });
}

test('CLI options have no project/root default and default to read-only', () => {
  assert.throws(() => parseLegacyUserOptions([], {}), /explicit project/);
  const options = parseLegacyUserOptions(['--project=demo-hudhud-legacy', '--root=HudHudDev'], {});
  assert.equal(options.shouldApply, false);
  assert.equal(parseLegacyUserOptions(['--apply'], { GCLOUD_PROJECT: 'demo-hudhud-legacy', TARGET_ROOT: 'HudHudOfficial' }).shouldApply, true);
  assert.throws(() => parseLegacyUserOptions(['--apply', '--dry-run'], { GCLOUD_PROJECT: 'demo-hudhud-legacy', TARGET_ROOT: 'HudHudDev' }), /one execution mode/);
  assert.throws(() => parseLegacyUserOptions(['--unknown'], {}), /Unknown/);
});

test('invalid scope is rejected before any Firestore access', async () => {
  const unexpected = () => { throw new Error('Unexpected IO'); };
  for (const override of [{ targetRoot: 'foreign' }, { projectId: '' }, { shouldApply: 'true' }, { sourcePath: 'HudHudDev/users/users' }, { sourcePath: '../users/users' }]) {
    await assert.rejects(runLegacyUsersMigration({ firestore: { doc: unexpected, collection: unexpected },
      projectId: 'demo-hudhud-legacy', targetRoot: 'HudHudDev', timestamp: () => 'timestamp', ...override }),
    error => !error.message.includes('Unexpected IO'));
  }
});

test('module import has no stdout, stderr or Firebase initialization', async () => {
  const { spawnSync } = await import('node:child_process');
  // Import is the only child operation; no CLI main entry point is invoked.
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(toolUrl.href)});`], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});
