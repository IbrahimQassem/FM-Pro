import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import {
  applyPrivacy, createPrivacyDemoFirestore, parsePrivacyOptions, previewPrivacy, privacyJobPath, privacyLimits,
  privacyToolVersion, privacyValue, PrivatePrivacyBackupStore, privateStationFields,
  restorePrivacy, verifyPrivacy, verifyPrivacyManifest,
} from '../migrate_station_privacy.mjs';

const DELETE = Symbol('delete');
const clone = value => value === undefined ? undefined : structuredClone(value);
class MemoryFirestore {
  constructor(projectId = 'demo-hudhud-privacy-test') {
    this.projectId = projectId; this.records = new Map(); this.serial = 1;
    this.writes = []; this.pageSizes = []; this.tail = Promise.resolve(); this.concurrent = 0; this.maxConcurrent = 0;
  }
  settings(options) { this.projectId = options.projectId; this.transportSettings = options; }
  terminate() {}
  seed(path, data) { this.records.set(path, { data: clone(data), version: this.serial++ }); }
  snapshot(path) {
    const entry = this.records.get(path);
    return { id: path.split('/').at(-1), exists: Boolean(entry), ref: this.doc(path),
      updateTime: entry ? { seconds: entry.version, nanoseconds: 0 } : undefined,
      data: () => clone(entry?.data) };
  }
  doc(path) { return { path, get: async () => this.snapshot(path) }; }
  collection(path) {
    const db = this;
    const query = (cursor, count) => ({
      orderBy: () => query(cursor, count), startAfter: next => query(next, count), limit: value => query(cursor, value),
      get: async () => {
        db.pageSizes.push(count);
        const ids = [...db.records.keys()].filter(key => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1)
          .sort().filter(key => cursor === null || key.split('/').at(-1) > cursor).slice(0, count);
        return { size: ids.length, docs: ids.map(key => db.snapshot(key)) };
      },
    });
    return query(null, Infinity);
  }
  getAll(...refs) { return Promise.resolve(refs.map(ref => this.snapshot(ref.path))); }
  async runTransaction(callback) {
    const previous = this.tail;
    let release;
    this.tail = new Promise(resolve => { release = resolve; });
    await previous;
    this.concurrent++; this.maxConcurrent = Math.max(this.maxConcurrent, this.concurrent);
    const pending = [];
    const tx = {
      get: async ref => { assert.equal(pending.length, 0, 'All transaction reads precede writes'); return this.snapshot(ref.path); },
      set: (ref, data) => pending.push(['set', ref.path, clone(data)]),
      create: (ref, data) => { assert.equal(this.records.has(ref.path), false); pending.push(['set', ref.path, clone(data)]); },
      update: (ref, data) => pending.push(['update', ref.path, data]),
    };
    try {
      const result = await callback(tx);
      const version = this.serial++;
      for (const [type, path, data] of pending) {
        if (type === 'set') this.records.set(path, { data, version });
        else {
          assert.ok(this.records.has(path));
          const next = clone(this.records.get(path).data);
          for (const [key, value] of Object.entries(data)) { if (value === DELETE) delete next[key]; else next[key] = clone(value); }
          this.records.set(path, { data: next, version });
        }
        this.writes.push(path);
      }
      return result;
    } finally { this.concurrent--; release(); }
  }
}
const at = (root, kind, id) => `${root}/${kind}/${kind}/${id}`;
const privateAt = (root, id) => `${root}/stationPrivate/stations/${id}`;
async function fixture(root = 'HudHudDev', operation = 'station-private') {
  const directory = await mkdtemp(join(tmpdir(), 'hudhud-privacy-guard-'));
  const clock = { value: 1800000000000 };
  const db = new MemoryFirestore();
  const key = randomBytes(32);
  const store = await PrivatePrivacyBackupStore.open({ directory, key, expiresAt: clock.value + 7 * 86400000, now: () => clock.value });
  const require = createRequire(new URL('../../functions/package.json', import.meta.url));
  const sdkPath = require.resolve('firebase-admin/firestore');
  const actualSdk = require(sdkPath);
  const originalExports = require.cache[sdkPath].exports;
  let transport;
  try {
    require.cache[sdkPath].exports = { ...actualSdk, Firestore: class { constructor() { return db; } } };
    transport = createPrivacyDemoFirestore({ projectId: db.projectId, emulatorHost: '127.0.0.1:8180' });
  } finally { require.cache[sdkPath].exports = originalExports; }
  const input = { firestore: transport, projectId: db.projectId, root, operation, emulatorHost: '127.0.0.1:8180',
    now: () => clock.value, leaseMs: 1000, backupStore: store, deleteValue: () => DELETE };
  return { db, input, store, clock, directory, key, close: () => rm(directory, { recursive: true, force: true }),
    prepare: async () => {
      const manifest = await previewPrivacy(input);
      await store.writeVerified(manifest);
      return { ...input, manifest, expectedManifestHash: manifest.hash };
    } };
}

test('T12 options are explicit, preview-only by default, bounded and import-safe', () => {
  assert.equal(parsePrivacyOptions(['--project=demo-hudhud-test', '--root=HudHudDev', '--operation=station-private']).mode, 'preview');
  assert.equal(parsePrivacyOptions(['--project=demo-hudhud-test', '--root=HudHudDev', '--operation=profile-email', '--limit=3', '--cursor=station-1']).limit, 3);
  for (const argv of [[], ['--project=*', '--root=HudHudDev', '--operation=station-private'],
    ['--project=demo-hudhud-test', '--root=unknown', '--operation=station-private'],
    ['--project=demo-hudhud-test', '--root=HudHudDev', '--operation=station-private', '--limit=101'],
    ['--project=demo-hudhud-test', '--root=HudHudDev', '--operation=station-private', '--apply', '--dry-run']]) assert.throws(() => parsePrivacyOptions(argv));
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL('../migrate_station_privacy.mjs', import.meta.url).href)})`], { encoding: 'utf8' });
  assert.equal(result.status, 0); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
});

test('T13 CLI refuses production mutations before SDK initialization or credential access', () => {
  for (const mode of ['--apply', '--restore', '--verify']) {
    const result = spawnSync(process.execPath, [new URL('../migrate_station_privacy.mjs', import.meta.url).pathname, '--project=sanadev-fm', '--root=HudHudOfficial', '--operation=station-private', mode], { encoding: 'utf8', env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180', GOOGLE_APPLICATION_CREDENTIALS: '/nonexistent/synthetic-no-read.json' } });
    assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.equal(JSON.parse(result.stderr).reason, 'production-mutation-disabled');
    assert.equal(result.stderr.includes('synthetic-no-read'), false);
  }
});

test('T12 preview scans at most100 documents in <=50 pages without any writes', async () => {
  const f = await fixture();
  try {
    for (let index = 0; index < 103; index++) f.db.seed(at('HudHudDev', 'stations', String(index).padStart(3, '0')), { name: 'Public', owner: 'Synthetic owner' });
    const first = await previewPrivacy(f.input);
    assert.equal(first.scanned, 100); assert.equal(first.entries.length, 100); assert.equal(first.exhausted, false); assert.equal(first.nextCursor, '099');
    assert.deepEqual(f.db.pageSizes, [50, 50]); assert.equal(f.db.writes.length, 0);
    const second = await previewPrivacy({ ...f.input, cursor: first.nextCursor });
    assert.equal(second.entries.length, 3); assert.equal(second.exhausted, true);
    const repeated = await previewPrivacy(f.input); assert.equal(repeated.hash, first.hash);
    assert.equal(first.toolVersion, privacyToolVersion); assert.equal(privacyLimits.concurrency, 1);
  } finally { await f.close(); }
});

test('T12 public-only records count against scan budget and never trigger an unbounded target search', async () => {
  const f = await fixture();
  try {
    for (let index = 0; index < 101; index++) f.db.seed(at('HudHudDev', 'stations', String(index).padStart(3, '0')), { name: 'Public' });
    const manifest = await previewPrivacy(f.input); assert.equal(manifest.scanned, 100); assert.equal(manifest.entries.length, 0); assert.equal(manifest.exhausted, false);
  } finally { await f.close(); }
});

test('T12 encrypted immutable private manifests survive readback without plaintext backup values', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev', 'stations', 'station'), { name: 'Public', owner: 'Synthetic private sentinel' });
    const input = await f.prepare();
    const files = await readdir(f.directory); assert.equal(files.length, 1);
    const raw = await readFile(join(f.directory, files[0]), 'utf8'); assert.equal(raw.includes('Synthetic private sentinel'), false);
    assert.deepEqual((await f.store.readVerified(input.manifest.hash)).manifest, input.manifest);
    await f.store.writeVerified(input.manifest); assert.equal(await readFile(join(f.directory, files[0]), 'utf8'), raw);
  } finally { await f.close(); }
});

test('T12 rejects unsafe backup locations, modes, key sizes and retention', async () => {
  const f = await fixture();
  try {
    const options = { directory: f.directory, key: randomBytes(32), expiresAt: f.clock.value + 86400000, now: () => f.clock.value };
    await assert.rejects(PrivatePrivacyBackupStore.open({ ...options, key: Buffer.alloc(1) }));
    await assert.rejects(PrivatePrivacyBackupStore.open({ ...options, expiresAt: f.clock.value + 31 * 86400000 }));
    await assert.rejects(PrivatePrivacyBackupStore.open({ ...options, directory: resolve('.') }));
    await chmod(f.directory, 0o755); await assert.rejects(PrivatePrivacyBackupStore.open(options)); await chmod(f.directory, 0o700);
    const bossDirectory = join(f.directory, '.boss'); await mkdir(bossDirectory, { mode: 0o700 });
    await assert.rejects(PrivatePrivacyBackupStore.open({ ...options, directory: bossDirectory }));
    await writeFile(join(f.directory, '.git'), 'gitdir: synthetic');
    await assert.rejects(PrivatePrivacyBackupStore.open(options)); await rm(join(f.directory, '.git'));
    const link = `${f.directory}-symlink`; await symlink(f.directory, link);
    try { await assert.rejects(PrivatePrivacyBackupStore.open({ ...options, directory: link })); } finally { await rm(link); }
  } finally { await f.close(); }
});

for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`T13 ${root}: move all13fields atomically and preserve public operational values`, async () => {
    const f = await fixture(root);
    try {
      const values = Object.fromEntries(privateStationFields.map(key => [key, key === 'contactEmail' ? 'synthetic@example.test' : `Synthetic ${key}`]));
      const publicData = { name: 'Public station', streamUrl: 'https://example.test/live', stats: { programsCount: 4 }, healthStatus: 'online' };
      f.db.seed(at(root, 'stations', 'station'), { ...publicData, ...values });
      const input = await f.prepare(); const result = await applyPrivacy(input);
      assert.equal(result.applied, 1); assert.deepEqual(f.db.snapshot(at(root, 'stations', 'station')).data(), publicData);
      assert.deepEqual(f.db.snapshot(privateAt(root, 'station')).data(), { ...values, schemaVersion: 1, revision: 1 });
      assert.deepEqual(await verifyPrivacy(input), { status: 'verified', verified: 1 });
      const writes = f.db.writes.length;
      const replay = await applyPrivacy(input); assert.equal(replay.alreadyApplied, 1); assert.equal(f.db.writes.length, writes);
      const restored = await restorePrivacy(input); assert.equal(restored.status, 'privacy-preserved'); assert.equal(f.db.writes.length, writes);
    } finally { await f.close(); }
  });

  test(`T13 ${root}: profile cleanup removes onlyemail, preserves explicitname and safe rollback never restores email`, async () => {
    const f = await fixture(root, 'profile-email');
    try {
      f.db.seed(at(root, 'users', 'listener'), { displayName: 'Chosen@example.test', email: 'private@example.test', role: 'listener', isActive: true, custom: { preserve: true } });
      const input = await f.prepare(); await applyPrivacy(input);
      assert.deepEqual(f.db.snapshot(at(root, 'users', 'listener')).data(), { displayName: 'Chosen@example.test', role: 'listener', isActive: true, custom: { preserve: true } });
      await restorePrivacy(input); assert.equal(Object.hasOwn(f.db.snapshot(at(root, 'users', 'listener')).data(), 'email'), false);
      assert.equal([...f.db.records.keys()].some(path => path.includes('emailVerificationChallenges')), false);
    } finally { await f.close(); }
  });
}

for (const privateData of [{ schemaVersion: 2, revision: 1, owner: 'Same' }, { schemaVersion: 1, revision: 0, owner: 'Same' },
  { schemaVersion: 1, revision: 1, owner: 'Different' }, { schemaVersion: 1, revision: 1, contactPhone: 'Existing' },
  { schemaVersion: 1, revision: 1, owner: 'Same', unknown: true }]) {
  test(`T12 canonical collision or malformedschema fails closed (${JSON.stringify(privateData)})`, async () => {
    const f = await fixture();
    try {
      f.db.seed(at('HudHudDev', 'stations', 'station'), { name: 'Public', owner: 'Same' }); f.db.seed(privateAt('HudHudDev', 'station'), privateData);
      const manifest = await previewPrivacy(f.input); assert.equal(manifest.entries[0].status, 'conflict');
      assert.throws(() => verifyPrivacyManifest(manifest, manifest.hash));
      await f.store.writeVerified(manifest); assert.equal((await f.store.readVerified(manifest.hash)).manifest.entries[0].status, 'conflict');
      await assert.rejects(applyPrivacy({ ...f.input, manifest, expectedManifestHash: manifest.hash })); assert.equal(f.db.writes.length, 0);
    } finally { await f.close(); }
  });
}

test('T13 identical canonical values consolidate without changing existing private revision or unrelated fields', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev', 'stations', 'station'), { name: 'Public', owner: 'Same' });
    f.db.seed(privateAt('HudHudDev', 'station'), { schemaVersion: 1, revision: 8, owner: 'Same', contactPhone: '' });
    const before = f.db.snapshot(privateAt('HudHudDev', 'station')); const input = await f.prepare(); await applyPrivacy(input);
    assert.deepEqual(f.db.snapshot(privateAt('HudHudDev', 'station')).data(), before.data());
    assert.deepEqual(f.db.snapshot(privateAt('HudHudDev', 'station')).updateTime, before.updateTime);
  } finally { await f.close(); }
});

for (const boundary of ['after-backup', 'before-item', 'before-checkpoint', 'after-commit-before-ack', 'after-checkpoint']) {
  test(`T13 crash boundary ${boundary} resumes safely without duplicate target changes`, async () => {
    const f = await fixture();
    try {
      f.db.seed(at('HudHudDev', 'stations', 'station'), { name: 'Public', owner: 'Synthetic' });
      const input = await f.prepare();
      await assert.rejects(applyPrivacy({ ...input, fault: event => { if (event === boundary) throw new Error('Synthetic crash'); } }), /Synthetic crash/);
      f.clock.value += 1001;
      await applyPrivacy(input); await verifyPrivacy(input);
      assert.equal(f.db.writes.filter(path => path === at('HudHudDev', 'stations', 'station')).length, 1);
      assert.equal(f.db.writes.filter(path => path === privateAt('HudHudDev', 'station')).length, 1);
    } finally { await f.close(); }
  });
}

for (const kind of ['corrupt', 'permissions', 'expired', 'missing']) {
  test(`T13 ${kind} backup produces zeroFirestore writes`, async () => {
    const f = await fixture();
    try {
      f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' }); const input = await f.prepare();
      const file = join(f.directory, `${input.manifest.hash}.privacy.aes`);
      if (kind === 'corrupt') await writeFile(file, '{}');
      if (kind === 'permissions') await chmod(file, 0o644);
      if (kind === 'expired') f.clock.value += 8 * 86400000;
      if (kind === 'missing') await rm(file);
      await assert.rejects(applyPrivacy(input)); assert.equal(f.db.writes.length, 0);
    } finally { await f.close(); }
  });
}

test('T13 concurrent edit and deletion never overwrite or resurrect source records', async () => {
  for (const mutate of ['edit', 'delete']) {
    const f = await fixture();
    try {
      const path = at('HudHudDev', 'stations', 'station'); f.db.seed(path, { name: 'Public', owner: 'Synthetic' }); const input = await f.prepare();
      if (mutate === 'delete') f.db.records.delete(path); else f.db.seed(path, { name: 'Concurrent', owner: 'Synthetic' });
      await assert.rejects(applyPrivacy(input), { code: 'source-conflict' }); assert.equal(f.db.records.has(privateAt('HudHudDev', 'station')), false);
      assert.equal(f.db.writes.filter(path => path.includes('/stations/stations/')).length, 0);
    } finally { await f.close(); }
  }
});

test('T13 profile-deletion barrier in either root prevents cleanup and recreation', async () => {
  const f = await fixture('HudHudDev', 'profile-email');
  try {
    f.db.seed(at('HudHudDev', 'users', 'listener'), { email: 'synthetic@example.test' });
    f.db.seed('HudHudOfficial/accountDeletionRequests/requests/listener', { status: 'deleting' });
    const manifest = await previewPrivacy(f.input); assert.equal(manifest.entries[0].reason, 'deletion-in-progress'); assert.equal(f.db.writes.length, 0);
  } finally { await f.close(); }
});

test('T13 active lease blocks a concurrent executor including reuse of its owner string', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' }); const input = await f.prepare();
    await assert.rejects(applyPrivacy({ ...input, owner: 'same-owner', fault: event => { if (event === 'before-item') throw new Error('Synthetic crash'); } }));
    await assert.rejects(applyPrivacy({ ...input, owner: 'same-owner' }), { code: 'lease-busy' });
    f.clock.value += 1001; await applyPrivacy(input); assert.equal(f.db.maxConcurrent, 1);
  } finally { await f.close(); }
});

test('T13 replay and restore reject any post-commit edit, even if changed data reverts to identical values', async () => {
  const f = await fixture();
  try {
    const path = at('HudHudDev', 'stations', 'station'); f.db.seed(path, { name: 'Public', owner: 'Synthetic' }); const input = await f.prepare(); await applyPrivacy(input);
    f.db.seed(path, { name: 'Public' });
    await assert.rejects(restorePrivacy(input), { code: 'postimage-conflict' }); await assert.rejects(applyPrivacy(input), { code: 'postimage-conflict' });
    assert.deepEqual(f.db.snapshot(path).data(), { name: 'Public' });
  } finally { await f.close(); }
});

test('T13 rejects wrongproject/root/hash, non-demo mutations and remote hosts before writes', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' }); const input = await f.prepare();
    for (const patch of [{ projectId: 'sanadev-fm' }, { root: 'Other' }, { root: 'HudHudOfficial' }, { expectedManifestHash: '0'.repeat(64) }, { emulatorHost: 'example.test:8180' }, { emulatorHost: '127.0.0.1:99999' }]) await assert.rejects(applyPrivacy({ ...input, ...patch }));
    assert.equal(f.db.writes.length, 0);
    const tampered = clone(input.manifest); tampered.entries[0].after.source = privacyValue({ name: 'Malicious overwrite' }); delete tampered.hash;
    tampered.hash = createHash('sha256').update(JSON.stringify(tampered)).digest('hex');
    assert.throws(() => verifyPrivacyManifest(tampered, tampered.hash));
    assert.throws(() => privacyJobPath('Other', input.manifest.hash));
  } finally { await f.close(); }
});

test('T13 100targets execute serially with100 target transactions and bounded private job scope', async () => {
  const f = await fixture();
  try {
    for (let index = 0; index < 100; index++) f.db.seed(at('HudHudDev', 'stations', String(index).padStart(3, '0')), { owner: 'Synthetic' });
    const input = await f.prepare(); await applyPrivacy(input); assert.equal(f.db.maxConcurrent, 1);
    assert.equal(f.db.writes.filter(path => path.includes('/stations/stations/')).length, 100);
    assert.equal(f.db.snapshot(privacyJobPath('HudHudDev', input.manifest.hash)).data().nextIndex, 100);
    assert.equal(privacyLimits.transactionsPerBatch, 25);
  } finally { await f.close(); }
});

test('T12 typed private fingerprints distinguish plain maps, dates and byte arrays', () => {
  assert.notDeepEqual(privacyValue(new Date(0)), privacyValue({ $date: new Date(0).toISOString() }));
  assert.notDeepEqual(privacyValue(Buffer.from('test')), privacyValue({ $bytes: Buffer.from('test').toString('base64') }));
  assert.throws(() => privacyValue(undefined), { code: 'unsupported-value' });
});

test('T12 an independent process can decrypt and verify the persisted private backup', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' }); const input = await f.prepare();
    const code = `import {readFileSync} from 'node:fs'; import {PrivatePrivacyBackupStore} from ${JSON.stringify(new URL('../migrate_station_privacy.mjs', import.meta.url).href)}; const input=JSON.parse(readFileSync(0,'utf8')); const store=await PrivatePrivacyBackupStore.open({directory:input.directory,key:Buffer.from(input.key,'base64'),expiresAt:input.expiry,now:()=>input.now}); const result=await store.readVerified(input.hash); console.log(result.manifest.hash===input.hash);`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', input: JSON.stringify({ directory: f.directory, key: f.key.toString('base64'), expiry: f.clock.value + 7 * 86400000, now: f.clock.value, hash: input.manifest.hash }) });
    assert.equal(result.status, 0); assert.equal(result.stdout.trim(), 'true'); assert.equal(result.stderr, '');
  } finally { await f.close(); }
});

test('T13 a deletion request introduced after preview prevents profile mutation', async () => {
  const f = await fixture('HudHudDev', 'profile-email');
  try {
    const path = at('HudHudDev', 'users', 'listener'); f.db.seed(path, { email: 'synthetic@example.test' }); const input = await f.prepare();
    f.db.seed('HudHudOfficial/accountDeletionRequests/requests/listener', { status: 'pending' });
    await assert.rejects(applyPrivacy(input), { code: 'source-conflict' }); assert.equal(f.db.writes.includes(path), false);
  } finally { await f.close(); }
});

test('T13 partial progress survives a later source conflict without overwriting either record', async () => {
  const f = await fixture();
  try {
    const first = at('HudHudDev', 'stations', 'a'), second = at('HudHudDev', 'stations', 'b');
    f.db.seed(first, { name: 'First', owner: 'Synthetic' }); f.db.seed(second, { name: 'Second', owner: 'Synthetic' }); const input = await f.prepare();
    await assert.rejects(applyPrivacy({ ...input, fault: (event, index) => { if (event === 'after-checkpoint' && index === 0) f.db.seed(second, { name: 'Concurrent', owner: 'Synthetic' }); } }), { code: 'source-conflict' });
    assert.deepEqual(f.db.snapshot(first).data(), { name: 'First' }); assert.equal(f.db.snapshot(second).data().name, 'Concurrent');
    assert.equal(f.db.snapshot(privacyJobPath('HudHudDev', input.manifest.hash)).data().nextIndex, 1);
    assert.equal(f.db.snapshot(privacyJobPath('HudHudDev', input.manifest.hash)).data().status, 'running');
  } finally { await f.close(); }
});

test('T13 backup loss between target transactions stops further source changes', async () => {
  const f = await fixture();
  try {
    const first = at('HudHudDev', 'stations', 'a'), second = at('HudHudDev', 'stations', 'b');
    f.db.seed(first, { owner: 'Synthetic' }); f.db.seed(second, { owner: 'Synthetic' }); const input = await f.prepare();
    await assert.rejects(applyPrivacy({ ...input, fault: async (event, index) => { if (event === 'after-checkpoint' && index === 0) await rm(join(f.directory, `${input.manifest.hash}.privacy.aes`)); } }));
    assert.equal(Object.hasOwn(f.db.snapshot(first).data(), 'owner'), false);
    assert.equal(f.db.snapshot(second).data().owner, 'Synthetic');
  } finally { await f.close(); }
});

test('T13 simultaneous executors cannot both hold the live lease', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' }); const input = await f.prepare();
    let entered, release;
    const waiting = new Promise(resolve => { entered = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    const first = applyPrivacy({ ...input, owner: 'first', fault: async event => { if (event === 'before-item') { entered(); await gate; } } });
    await waiting;
    try { await assert.rejects(applyPrivacy({ ...input, owner: 'second' }), { code: 'lease-busy' }); }
    finally { release(); }
    await first; assert.equal(f.db.writes.filter(path => path.includes('/stations/stations/')).length, 1);
  } finally { await f.close(); }
});


test('Review R1: claimed loopback host never authorizes an unknown or remote injected transport', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' });
    const input = await f.prepare();
    const untrusted = new MemoryFirestore(input.projectId);
    untrusted.records = f.db.records;
    let transactions = 0;
    untrusted.runTransaction = async () => { transactions++; throw new Error('UNTRUSTED_TRANSPORT_REACHED'); };
    for (const operation of [applyPrivacy, restorePrivacy]) {
      await assert.rejects(operation({ ...input, firestore: untrusted }), { code: 'untrusted-mutation-transport' });
    }
    assert.equal(transactions, 0);
    assert.equal(f.db.writes.length, 0);
  } finally { await f.close(); }
});

for (const empty of [false, true]) {
  test(`Review R2: initial lease rechecks durable backup after clock advances (empty=${empty})`, async () => {
    const f = await fixture();
    try {
      if (!empty) f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' });
      const input = await f.prepare();
      await assert.rejects(applyPrivacy({ ...input, fault: event => {
        if (event === 'after-backup') f.clock.value += 7 * 86400000;
      } }), { code: 'backup-expired-or-invalid' });
      assert.equal(f.db.writes.length, 0, 'Expired backup must never create even an empty job');
    } finally { await f.close(); }
  });
}

for (const drift of ['permissions', 'replacement']) {
  test(`Review R3: backup directory ${drift} drift fails read, write and mutation closed`, async () => {
    const f = await fixture();
    const moved = `${f.directory}-original`;
    try {
      f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' });
      const input = await f.prepare();
      if (drift === 'permissions') await chmod(f.directory, 0o777);
      else {
        await rename(f.directory, moved); await mkdir(f.directory, { mode: 0o700 });
        await writeFile(join(f.directory, `${input.manifest.hash}.privacy.aes`),
          await readFile(join(moved, `${input.manifest.hash}.privacy.aes`)), { mode: 0o600 });
      }
      await assert.rejects(f.store.readVerified(input.manifest.hash), { code: 'unsafe-backup-directory' });
      await assert.rejects(f.store.writeVerified(input.manifest), { code: 'unsafe-backup-directory' });
      await assert.rejects(applyPrivacy(input), { code: 'unsafe-backup-directory' });
      assert.equal(f.db.writes.length, 0);
    } finally { await f.close(); await rm(moved, { recursive: true, force: true }); }
  });
}


test('Review R1: factory owns and freezes actual SDK loopback settings without making a request', async () => {
  const db = createPrivacyDemoFirestore({ projectId: 'demo-hudhud-privacy-test', emulatorHost: '127.0.0.1:8180' });
  try {
    assert.equal(Object.isFrozen(db), true);
    assert.throws(() => db.doc('synthetic/station').firestore.settings({ host: 'remote.invalid:443', ssl: true }));
    assert.throws(() => Object.defineProperty(db, 'runTransaction', { value: () => {} }));
  } finally { await db.terminate(); }
});

test('Review R1: factory rejects environment transport overrides before SDK construction', () => {
  const prior = process.env.FIRESTORE_EMULATOR_HOST;
  try {
    process.env.FIRESTORE_EMULATOR_HOST = 'remote.invalid:443';
    assert.throws(() => createPrivacyDemoFirestore({ projectId: 'demo-hudhud-privacy-test', emulatorHost: '127.0.0.1:8180' }), { code: 'conflicting-emulator-transport' });
  } finally { if (prior === undefined) delete process.env.FIRESTORE_EMULATOR_HOST; else process.env.FIRESTORE_EMULATOR_HOST = prior; }
});

for (const event of ['after-backup', 'before-checkpoint']) {
  test(`Review R3: directory permission drift at ${event} aborts before target mutation`, async () => {
    const f = await fixture();
    try {
      f.db.seed(at('HudHudDev', 'stations', 'station'), { owner: 'Synthetic' }); const input = await f.prepare();
      await assert.rejects(applyPrivacy({ ...input, fault: async phase => {
        if (phase === event) await chmod(f.directory, 0o777);
      } }), { code: 'unsafe-backup-directory' });
      assert.equal(f.db.snapshot(at('HudHudDev', 'stations', 'station')).data().owner, 'Synthetic');
      assert.equal(f.db.writes.filter(path => !path.includes('/privacyMigrationJobs/')).length, 0);
    } finally { await f.close(); }
  });
}
