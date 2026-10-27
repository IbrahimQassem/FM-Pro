import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { adminPaginationQueryShapes, adminPaginationSortInventory, auditContentPagination, paginationHash, paginationRequiredIndexes, paginationQueryShapes, paginationSummary, paginationValue, parsePaginationOptions, verifyPaginationManifest } from '../audit_content_pagination.mjs';
import { backfillContentPagination, ContentPaginationBackupStore, createPaginationDemoFirestore, paginationJobPath, restoreContentPagination, verifyContentPagination } from '../backfill_content_pagination.mjs';
const DELETE = Symbol('delete');
class Timestamp { constructor(seconds, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  toMillis() { return this.seconds * 1000 + this.nanoseconds / 1000000; }
  isEqual(other) { return this.seconds === other?.seconds && this.nanoseconds === other?.nanoseconds; }
}
const clone = value => {
  if (value instanceof Timestamp) return new Timestamp(value.seconds, value.nanoseconds);
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
};
class MemoryFirestore {
  constructor(projectId = 'demo-hudhud-pagination-test') {
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

const at = (root, resource, id) => `${root}/${resource}/${resource}/${id}`;
function program(overrides = {}) { return { stationId: 'station', title: 'Synthetic', isActive: true, ...overrides }; }
function episode(overrides = {}) { return { stationId: 'station', programId: 'program', title: 'Synthetic', isPublished: true, broadcastAt: new Timestamp(1800000000, 123456789), ...overrides }; }
async function fixture(root = 'HudHudDev', resource = 'programs') {
  const directory = await mkdtemp(join(tmpdir(), 'hudhud-pagination-guard-')), key = randomBytes(32), clock = { value: 1800000000000 }, db = new MemoryFirestore();
  db.seed(at(root, 'stations', 'station'), { name: 'Synthetic station', isActive: true, stats: { programsCount: 1 } });
  if (resource === 'episodes') db.seed(at(root, 'programs', 'program'), program({ priority: 0, isFeatured: false }));
  const store = await ContentPaginationBackupStore.open({ directory, key, expiresAt: clock.value + 7 * 86400000, now: () => clock.value });
  const require = createRequire(new URL('../../functions/package.json', import.meta.url)), sdkPath = require.resolve('firebase-admin/firestore');
  const sdk = require(sdkPath), original = require.cache[sdkPath].exports;
  let transport;
  try { require.cache[sdkPath].exports = { ...sdk, Firestore: class { constructor() { return db; } } }; transport = createPaginationDemoFirestore({ projectId: db.projectId, emulatorHost: '127.0.0.1:8180' }); }
  finally { require.cache[sdkPath].exports = original; }
  const input = { firestore: transport, projectId: db.projectId, root, resource, emulatorHost: '127.0.0.1:8180', backupStore: store, now: () => clock.value, leaseMs: 1000, deleteValue: () => DELETE };
  return { db, store, input, directory, key, clock, close: () => rm(directory, { recursive: true, force: true }),
    prepare: async () => { const manifest = await auditContentPagination(input); await store.writeVerified(manifest); return { ...input, manifest, expectedManifestHash: manifest.hash }; } };
}

test('B10 new tools import without SDK side effects and default to explicit bounded audit', () => {
  assert.equal(parsePaginationOptions(['--project=demo-hudhud-pagination-test', '--root=HudHudDev', '--resource=programs']).mode, 'audit');
  for (const args of [[], ['--project=demo-hudhud-test','--root=bad','--resource=episodes'], ['--project=demo-hudhud-test','--root=HudHudDev','--resource=episodes','--limit=101']]) assert.throws(() => parsePaginationOptions(args));
  for (const module of ['audit_content_pagination.mjs', 'backfill_content_pagination.mjs']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(new URL('../'+module, import.meta.url).href)})`], { encoding: 'utf8' });
    assert.equal(result.status, 0); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
  }
});

test('B10 CLI rejects production apply/restore/verify before SDK or credentials', () => {
  for (const mode of ['--apply', '--restore', '--verify']) {
    const result = spawnSync(process.execPath, [new URL('../backfill_content_pagination.mjs', import.meta.url).pathname, '--project=synthetic-production', '--root=HudHudOfficial', '--resource=programs', mode], { encoding: 'utf8', env: { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180', GOOGLE_APPLICATION_CREDENTIALS: '/nonexistent/synthetic-no-read.json' } });
    assert.equal(result.status, 1); assert.equal(JSON.parse(result.stderr).reason, 'production-mutation-disabled'); assert.equal(result.stderr.includes('synthetic-no-read'), false);
  }
});

for (const root of ['HudHudDev', 'HudHudOfficial']) for (const resource of ['programs', 'episodes']) {
  test(`${root}/${resource}: audit classifies 103 records with stable bounded pages and no writes`, async () => {
    const f = await fixture(root, resource);
    try {
      for (let index = 0; index < 103; index++) f.db.seed(at(root, resource, String(index).padStart(3, '0')), resource === 'programs' ? program() : episode());
      const first = await auditContentPagination(f.input);
      // Episode fixture's canonical program parent is outside the episode query.
      assert.equal(first.scanned, 100); assert.equal(first.entries.length, 100); assert.deepEqual(f.db.pageSizes, [50, 50]);
      assert.equal(first.nextCursor, '099'); assert.equal(first.exhausted, false); assert.equal(f.db.writes.length, 0);
      assert.equal((await auditContentPagination(f.input)).hash, first.hash);
      const next = await auditContentPagination({ ...f.input, cursor: first.nextCursor }); assert.equal(next.scanned, 3); assert.equal(next.exhausted, true);
      assert.equal(paginationSummary(first).repairable, 100);
    } finally { await f.close(); }
  });
  test(`${root}/${resource}: only approved defaults change; encrypted backup, replay and narrow restore`, async () => {
    const f = await fixture(root, resource);
    try {
      const path = at(root, resource, 'target'), data = resource === 'programs' ? program({ stats: { totalPlays: 7 }, operational: new Timestamp(1800000000, 987654321) }) : episode({ stats: { commentsCount: 3 } });
      f.db.seed(path, data); const input = await f.prepare();
      assert.equal((await backfillContentPagination(input)).applied, 1);
      assert.deepEqual(f.db.snapshot(path).data(), { ...data, priority: 0, isFeatured: false });
      assert.equal((await verifyContentPagination(input)).verified, 1); assert.equal((await backfillContentPagination(input)).alreadyApplied, 1);
      const raw = await readFile(join(f.directory, `${input.manifest.hash}.pagination.aes`), 'utf8'); assert.equal(raw.includes('Synthetic'), false);
      assert.equal((await restoreContentPagination(input)).restored, 1); assert.deepEqual(f.db.snapshot(path).data(), data);
      await restoreContentPagination(input); assert.deepEqual(f.db.snapshot(path).data(), data);
      await assert.rejects(backfillContentPagination(input), { code: 'manifest-already-restored' });
      assert.equal(f.db.maxConcurrent, 1);
    } finally { await f.close(); }
  });
}

test('B10 missing/type chronology, visibility, title and parents stay unresolved, never invented', async () => {
  const f = await fixture('HudHudDev', 'episodes');
  try {
    const variants = [episode({ broadcastAt: undefined }), episode({ broadcastAt: new Date() }), episode({ isPublished: 'true' }), episode({ title: '' }), episode({ stationId: 'absent' }), episode({ programId: 'absent' }), episode({ priority: '0' }), episode({ isFeatured: null })];
    // Truly missing broadcastAt, rather than an unsupported undefined value.
    delete variants[0].broadcastAt;
    variants.forEach((data, index) => f.db.seed(at('HudHudDev', 'episodes', String(index)), data));
    const input = await f.prepare(); assert.equal(input.manifest.entries.every(entry => entry.status === 'unresolved'), true);
    const summary = paginationSummary(input.manifest); assert.equal(summary.unresolved, variants.length);
    assert.equal((await backfillContentPagination(input)).applied, 0);
    assert.equal(f.db.writes.some(path => path.includes('/episodes/episodes/')), false);
  } finally { await f.close(); }
});

test('B10 foreign program, deletion fences and malformed canonical parent IDs cannot repair', async () => {
  const f = await fixture('HudHudDev', 'episodes');
  try {
    f.db.seed(at('HudHudDev', 'programs', 'foreign'), program({ stationId: 'other' }));
    f.db.seed(at('HudHudDev', 'episodes', 'foreign'), episode({ programId: 'foreign' }));
    f.db.seed(at('HudHudDev', 'episodes', 'bad'), episode({ stationId: '../station' }));
    f.db.seed(at('HudHudDev', 'episodes', 'deleted'), episode({ adminDeletionToken: 'synthetic-fence' }));
    const input = await f.prepare(); assert.equal(input.manifest.entries.every(entry => entry.status === 'unresolved'), true);
    assert.equal((await backfillContentPagination(input)).unresolved, 3);
  } finally { await f.close(); }
});

for (const event of ['after-backup', 'before-item', 'before-checkpoint', 'after-commit-before-ack', 'after-checkpoint']) {
  test(`B10 ${event} crash resumes with one source update`, async () => {
    const f = await fixture();
    try {
      const path = at('HudHudDev', 'programs', 'target'); f.db.seed(path, program()); const input = await f.prepare();
      await assert.rejects(backfillContentPagination({ ...input, fault: phase => { if (phase === event) throw new Error('synthetic-crash'); } }));
      f.clock.value += 2000; await backfillContentPagination(input);
      assert.equal(f.db.writes.filter(item => item === path).length, 1); assert.equal((await verifyContentPagination(input)).verified, 1);
    } finally { await f.close(); }
  });
}

for (const mutation of ['edit', 'delete', 'parent-edit']) {
  test(`B10 concurrent ${mutation} fails closed without overwrite or resurrection`, async () => {
    const f = await fixture();
    try {
      const path = at('HudHudDev', 'programs', 'target'); f.db.seed(path, program()); const input = await f.prepare();
      if (mutation === 'edit') f.db.seed(path, program({ title: 'Concurrent' }));
      else if (mutation === 'delete') f.db.records.delete(path);
      else f.db.seed(at('HudHudDev', 'stations', 'station'), { isActive: true, name: 'Concurrent' });
      await assert.rejects(backfillContentPagination(input), { code: 'source-conflict' });
      assert.equal(f.db.writes.some(item => item === path), false);
      if (mutation === 'delete') assert.equal(f.db.snapshot(path).exists, false);
    } finally { await f.close(); }
  });
}

test('B10 restored defaults never restore a full source snapshot or overwrite concurrent postimages', async () => {
  const f = await fixture();
  try {
    const path = at('HudHudDev', 'programs', 'target'); f.db.seed(path, program({ owner: 'Legacy sensitive', email: 'synthetic@example.test' })); const input = await f.prepare();
    await backfillContentPagination(input);
    // A privacy cleanup after apply must not be reversed by restoring the backup.
    f.db.seed(path, program({ priority: 0, isFeatured: false }));
    await assert.rejects(restoreContentPagination(input), { code: 'postimage-conflict' });
    assert.equal(Object.hasOwn(f.db.snapshot(path).data(), 'owner'), false); assert.equal(Object.hasOwn(f.db.snapshot(path).data(), 'email'), false);
  } finally { await f.close(); }
});

for (const drift of ['corrupt', 'missing', 'permissions', 'replacement', 'expired']) {
  test(`B10 ${drift} backup cannot create even the initial job`, async () => {
    const f = await fixture(), moved = `${f.directory}-original`;
    try {
      f.db.seed(at('HudHudDev', 'programs', 'target'), program()); const input = await f.prepare();
      const path = join(f.directory, `${input.manifest.hash}.pagination.aes`);
      if (drift === 'corrupt') await writeFile(path, '{}');
      if (drift === 'missing') await rm(path);
      if (drift === 'permissions') await chmod(f.directory, 0o777);
      if (drift === 'replacement') { await rename(f.directory, moved); await mkdir(f.directory, { mode: 0o700 }); await writeFile(path, await readFile(join(moved, `${input.manifest.hash}.pagination.aes`)), { mode: 0o600 }); }
      if (drift === 'expired') f.clock.value += 7 * 86400000;
      await assert.rejects(backfillContentPagination(input)); assert.equal(f.db.writes.length, 0);
    } finally { await f.close(); await rm(moved, { recursive: true, force: true }); }
  });
}

for (const empty of [true, false]) test(`B10 expiry after backup read is rejected inside lease transaction (empty=${empty})`, async () => {
  const f = await fixture();
  try {
    if (!empty) f.db.seed(at('HudHudDev', 'programs', 'target'), program()); const input = await f.prepare();
    await assert.rejects(backfillContentPagination({ ...input, fault: event => { if (event === 'after-backup') f.clock.value += 7 * 86400000; } }));
    assert.equal(f.db.writes.length, 0);
  } finally { await f.close(); }
});

test('B10 unknown injected transport and forged scope/hash fail before any writes', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev', 'programs', 'target'), program()); const input = await f.prepare();
    const rogue = new MemoryFirestore(input.projectId); let transactions = 0; rogue.runTransaction = () => { transactions++; throw new Error('UNTRUSTED'); };
    for (const operation of [backfillContentPagination, restoreContentPagination]) await assert.rejects(operation({ ...input, firestore: rogue }), { code: 'untrusted-mutation-transport' });
    assert.equal(transactions, 0);
    for (const change of [{ expectedManifestHash: 'a'.repeat(64) }, { root: 'HudHudOfficial' }, { resource: 'episodes' }, { emulatorHost: 'remote.invalid:443' }]) await assert.rejects(backfillContentPagination({ ...input, ...change }));
    assert.equal(f.db.writes.length, 0);
  } finally { await f.close(); }
});

test('B10 real SDK factory freezes explicit loopback transport without a request', async () => {
  const db = createPaginationDemoFirestore({ projectId: 'demo-hudhud-pagination-test', emulatorHost: '127.0.0.1:8180' });
  try { assert.equal(Object.isFrozen(db), true); assert.throws(() => db.doc('synthetic/station').firestore.settings({ host: 'remote.invalid:443' })); }
  finally { await db.terminate(); }
});

test('B10 manifest hash binds approved defaults and nanosecond preimages', async () => {
  const f = await fixture('HudHudDev', 'episodes');
  try {
    f.db.seed(at('HudHudDev', 'episodes', 'target'), episode()); const input = await f.prepare();
    assert.deepEqual(input.manifest.entries[0].before.source.data.$map.broadcastAt, { $timestamp: [1800000000, 123456789] });
    const forged = structuredClone(input.manifest); forged.entries[0].fixes.broadcastAt = { $timestamp: [1800000001, 0] }; const { hash: _, ...body } = forged; forged.hash = paginationHash(body);
    assert.throws(() => verifyPaginationManifest(forged, forged.hash), { code: 'invalid-manifest' });
    assert.throws(() => paginationValue(new URL('https://synthetic.invalid')), { code: 'unsupported-value' });
  } finally { await f.close(); }
});

test('B10 declared public index tuples match C03 complete order and collection scope', () => {
  assert.equal(paginationQueryShapes.length, 3);
  assert.deepEqual(paginationQueryShapes[0].order, [['isFeatured','DESCENDING'],['priority','DESCENDING'],['title','ASCENDING'],['__name__','ASCENDING']]);
  assert.deepEqual(paginationQueryShapes[2].equal, ['stationId','programId','isPublished']);
});


test('B10 100 repairs stay serial, checkpoint every write and reject live lease takeover', async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 100; i++) f.db.seed(at('HudHudDev', 'programs', String(i).padStart(3,'0')), program());
    const input = await f.prepare(); let blocked = false;
    await backfillContentPagination({ ...input, owner: 'first', fault: async event => {
      if (event === 'before-item' && !blocked) { blocked = true; await assert.rejects(backfillContentPagination({ ...input, owner: 'first' }), { code: 'lease-busy' }); }
    } });
    assert.equal(f.db.maxConcurrent, 1); assert.equal(f.db.snapshot(paginationJobPath('HudHudDev', input.manifest.hash)).data().nextIndex, 100);
    assert.equal(f.db.writes.filter(path => path.includes('/programs/programs/')).length, 100);
  } finally { await f.close(); }
});

test('B10 restore resumes from atomic receipts after interruption without extra source writes', async () => {
  const f = await fixture();
  try {
    for (const id of ['a','b']) f.db.seed(at('HudHudDev', 'programs', id), program()); const input = await f.prepare(); await backfillContentPagination(input);
    await assert.rejects(restoreContentPagination({ ...input, fault: (event, index) => { if (event === 'after-restore-commit' && index === 0) throw new Error('synthetic-crash'); } }));
    await restoreContentPagination(input);
    for (const id of ['a','b']) { const path = at('HudHudDev', 'programs', id); assert.deepEqual(f.db.snapshot(path).data(), program()); assert.equal(f.db.writes.filter(item => item === path).length, 2); }
  } finally { await f.close(); }
});

test('B10 postimage ABA edits and deleted sources reject recovery without resurrection', async () => {
  for (const mode of ['aba', 'delete']) {
    const f = await fixture();
    try {
      const path = at('HudHudDev', 'programs', 'target'); f.db.seed(path, program()); const input = await f.prepare(); await backfillContentPagination(input);
      if (mode === 'aba') f.db.seed(path, f.db.snapshot(path).data()); else f.db.records.delete(path);
      await assert.rejects(restoreContentPagination(input), { code: 'postimage-conflict' });
      if (mode === 'delete') assert.equal(f.db.snapshot(path).exists, false);
    } finally { await f.close(); }
  }
});

for (const event of ['after-backup','before-checkpoint','before-restore-commit']) test(`B10 directory drift at ${event} blocks transaction commit`, async () => {
  const f = await fixture();
  try {
    const path = at('HudHudDev','programs','target'); f.db.seed(path, program()); const input = await f.prepare();
    if (event === 'before-restore-commit') await backfillContentPagination(input);
    const previous = f.db.writes.length;
    await assert.rejects((event === 'before-restore-commit' ? restoreContentPagination : backfillContentPagination)({ ...input, fault: async phase => { if (phase === event) await chmod(f.directory, 0o777); } }));
    assert.equal(f.db.writes.filter(item => item === path).length, event === 'before-restore-commit' ? 1 : 0);
    if (event === 'after-backup') assert.equal(f.db.writes.length, previous);
  } finally { await f.close(); }
});

test('B10 backup is immutable, purpose bound, encrypted and requires safe custody/retention', async () => {
  const f = await fixture();
  try {
    f.db.seed(at('HudHudDev','programs','target'), program()); const input = await f.prepare(), path = join(f.directory, `${input.manifest.hash}.pagination.aes`);
    const original = await readFile(path); await f.store.writeVerified(input.manifest); assert.deepEqual(await readFile(path), original);
    const wrong = await ContentPaginationBackupStore.open({ directory: f.directory, key: randomBytes(32), expiresAt: f.clock.value + 7 * 86400000, now: () => f.clock.value });
    await assert.rejects(wrong.readVerified(input.manifest.hash));
    for (const expiresAt of [f.clock.value, f.clock.value + 31 * 86400000]) await assert.rejects(ContentPaginationBackupStore.open({ directory: f.directory, key: f.key, expiresAt, now: () => f.clock.value }));
    await assert.rejects(ContentPaginationBackupStore.open({ directory: new URL('../../',import.meta.url).pathname, key: f.key, expiresAt: f.clock.value + 7 * 86400000, now: () => f.clock.value }));
  } finally { await f.close(); }
});

// I owns the emulator runtime. Normal guard runs register no skipped fixtures.
if (process.env.B10_DEMO_TEST === '1') {
  test('B10 actual demo SDK transactions, recovery, conflicts and private-job permissions', async t => {
    assert.equal(process.env.GCLOUD_PROJECT, 'demo-hudhud-pagination-test');
    assert.match(process.env.FIRESTORE_EMULATOR_HOST || '', /^127\.0\.0\.1:\d+$/);
    const { initializeTestEnvironment, assertFails } = await import('@firebase/rules-unit-testing');
    const sdk = await import('firebase/firestore');
    const require = createRequire(new URL('../../functions/package.json', import.meta.url));
    const { Timestamp: RealTimestamp, FieldValue } = require('firebase-admin/firestore');
    const projectId = 'demo-hudhud-pagination-test', host = process.env.FIRESTORE_EMULATOR_HOST;
    const environment = await initializeTestEnvironment({ projectId, firestore: { rules: await readFile(new URL('../../firestore.rules', import.meta.url),'utf8') } });
    const db = createPaginationDemoFirestore({ projectId, emulatorHost: host });
    try {
      for (const root of ['HudHudDev','HudHudOfficial']) for (const resource of ['programs','episodes']) await t.test(`${root}/${resource} real CAS and narrow recovery`, async () => {
        await environment.clearFirestore();
        await db.doc(at(root,'stations','station')).set({ name: 'Synthetic', isActive: true });
        if (resource === 'episodes') await db.doc(at(root,'programs','program')).set(program({ priority: 0, isFeatured: false }));
        const data = resource === 'programs' ? program({ stats: { totalPlays: 9 } }) : episode({ broadcastAt: new RealTimestamp(1800000000, 123456789), stats: { commentsCount: 3 } });
        const source = db.doc(at(root,resource,'target')); await source.set(data); const before = await source.get();
        const directory = await mkdtemp(join(tmpdir(),'hudhud-pagination-demo-'));
        const backupStore = await ContentPaginationBackupStore.open({ directory, key: randomBytes(32), expiresAt: Date.now() + 7 * 86400000 });
        const input = { firestore: db, projectId, root, resource, emulatorHost: host, backupStore, deleteValue: () => FieldValue.delete() };
        try {
          const manifest = await auditContentPagination(input); await backupStore.writeVerified(manifest);
          const prepared = { ...input, manifest, expectedManifestHash: manifest.hash };
          assert.equal((await backfillContentPagination(prepared)).applied, 1); assert.equal((await backfillContentPagination(prepared)).alreadyApplied, 1);
          assert.equal((await verifyContentPagination(prepared)).verified, 1);
          await restoreContentPagination(prepared); assert.deepEqual((await source.get()).data(), before.data());
          const changed = await auditContentPagination(input); await backupStore.writeVerified(changed);
          await source.update({ title: 'Concurrent edit' });
          await assert.rejects(backfillContentPagination({ ...input, manifest: changed, expectedManifestHash: changed.hash }), { code: 'source-conflict' });
          assert.equal((await source.get()).get('title'),'Concurrent edit'); assert.equal((await source.get()).get('priority'), undefined);
        } finally { await rm(directory,{recursive:true,force:true}); }
      });
      for (const root of ['HudHudDev','HudHudOfficial']) await t.test(`${root} all clients denied private jobs and receipts`, async () => {
        await environment.clearFirestore(); const path = paginationJobPath(root,'a'.repeat(64));
        await db.doc(path).set({schemaVersion:1}); await db.doc(`${path}/items/000`).set({index:0});
        const clients = [environment.unauthenticatedContext().firestore(), ...[{}, {admin:true,role:'station_admin',allStations:true},{admin:true,role:'moderator'},{admin:true},{role:'super_admin'}].map((claims,index)=>environment.authenticatedContext(`synthetic-role-${index}`,claims).firestore())];
        for (const client of clients) {
          await assertFails(sdk.getDoc(sdk.doc(client,path))); await assertFails(sdk.getDocs(sdk.collection(client,`${root}/contentPaginationMigrationJobs/jobs`)));
          await assertFails(sdk.setDoc(sdk.doc(client,paginationJobPath(root,'b'.repeat(64))),{schemaVersion:1}));
          await assertFails(sdk.updateDoc(sdk.doc(client,path),{schemaVersion:2})); await assertFails(sdk.deleteDoc(sdk.doc(client,path))); await assertFails(sdk.getDoc(sdk.doc(client,`${path}/items/000`)));
          await assertFails(sdk.getDocs(sdk.collection(client,`${path}/items`)));
          await assertFails(sdk.setDoc(sdk.doc(client,`${path}/items/001`),{index:1}));
          await assertFails(sdk.updateDoc(sdk.doc(client,`${path}/items/000`),{index:2}));
          await assertFails(sdk.deleteDoc(sdk.doc(client,`${path}/items/000`)));
        }
      });
    } finally { await db.terminate(); await environment.cleanup(); }
  });
}


test('B10 admin inventory uses exact finite server predicates and no global legacy sort indexes', () => {
  assert.equal(adminPaginationQueryShapes.length, 26);
  for (const shape of adminPaginationQueryShapes) {
    assert.deepEqual(shape.order, [['__name__','ASCENDING']]);
    assert.equal(shape.rootBounds !== null, shape.queryScope === 'COLLECTION_GROUP');
    assert.equal(shape.equal.some(field => ['role','isFeatured','isLive','healthStatus'].includes(field)), false);
  }
  assert.deepEqual(adminPaginationSortInventory.global, [['__name__','ASCENDING']]);
  assert.equal(paginationRequiredIndexes.length, 7);
  assert.equal(new Set(paginationRequiredIndexes.map(index => JSON.stringify(index))).size, 7);
});

const countMaintenanceFence = state => ({ version: 1, state, generation: 2, owner: 'count-maintenance-worker',
  planHash: 'c'.repeat(64), leaseUntil: 0, writerProtocol: 1,
  ...(state === 'active' ? { activeFrom: new Timestamp(1700000000, 123000), baselineManifestHash: 'd'.repeat(64) } : {}) });
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const mode of ['apply', 'restore']) test(`R12: ${root} paused root refuses episode pagination ${mode}`, async () => {
    const f = await fixture(root, 'episodes');
    try {
      f.db.seed(at(root, 'episodes', 'target'), episode({ stats: { commentsCount: 7 } })); const input = await f.prepare();
      if (mode === 'restore') await backfillContentPagination(input);
      f.db.seed(`${root}/commentCountContributions`, countMaintenanceFence('paused'));
      const before = [...f.db.records].map(([path, value]) => [path, clone(value)]), writes = f.db.writes.length;
      await assert.rejects(mode === 'apply' ? backfillContentPagination(input) : restoreContentPagination(input),
        error => error?.code === 'failed-precondition' && error?.details?.reason === 'comment-count-maintenance',
        'Paused count maintenance must refuse the existing episode pagination mutation path.');
      assert.equal(f.db.writes.length, writes); assert.deepEqual([...f.db.records], before);
    } finally { await f.close(); }
  });
  test(`R12: ${root} pause after pagination lease blocks episode item transaction`, async () => {
    const f = await fixture(root, 'episodes');
    try {
      const target = at(root, 'episodes', 'target'); f.db.seed(target, episode({ stats: { commentsCount: 7 } })); const input = await f.prepare();
      const before = f.db.snapshot(target).data(); let writesAfterLease;
      await assert.rejects(backfillContentPagination({ ...input, fault: event => {
        if (event === 'before-item') { f.db.seed(`${root}/commentCountContributions`, countMaintenanceFence('paused')); writesAfterLease = f.db.writes.length; }
      } }), error => error?.code === 'failed-precondition' && error?.details?.reason === 'comment-count-maintenance',
      'A pre-lease check alone cannot authorize episode repair after pause.');
      assert.equal(f.db.writes.length, writesAfterLease); assert.deepEqual(f.db.snapshot(target).data(), before);
    } finally { await f.close(); }
  });
  for (const state of ['absent', 'active']) test(`R12 control: ${root} ${state} fence preserves episode pagination apply/restore`, async () => {
    const f = await fixture(root, 'episodes');
    try {
      const target = at(root, 'episodes', 'target'), original = episode({ stats: { commentsCount: 7 } });
      f.db.seed(target, original); const input = await f.prepare();
      if (state === 'active') f.db.seed(`${root}/commentCountContributions`, countMaintenanceFence('active'));
      assert.equal((await backfillContentPagination(input)).applied, 1);
      assert.equal(f.db.snapshot(target).data().stats.commentsCount, 7);
      assert.equal((await restoreContentPagination(input)).restored, 1);
      assert.deepEqual(f.db.snapshot(target).data(), original);
    } finally { await f.close(); }
  });
}

for (const root of ['HudHudDev', 'HudHudOfficial']) test(`R12: ${root} pause after first pagination restore commit retains it and blocks later items/completion`, async () => {
  const f = await fixture(root, 'episodes');
  try {
    const first = at(root, 'episodes', 'a'), second = at(root, 'episodes', 'b');
    const firstData = episode({ stats: { commentsCount: 3 } }), secondData = episode({ stats: { commentsCount: 7 } });
    f.db.seed(first, firstData); f.db.seed(second, secondData); const input = await f.prepare();
    assert.equal((await backfillContentPagination(input)).applied, 2);
    const secondApplied = f.db.snapshot(second).data(), job = paginationJobPath(root, input.manifest.hash);
    let writesAfterFirst, completedItems = 0;
    await assert.rejects(restoreContentPagination({ ...input, fault: (event, index) => {
      if (event === 'after-restore-commit') {
        completedItems++;
        if (index === 0) { f.db.seed(`${root}/commentCountContributions`, countMaintenanceFence('paused')); writesAfterFirst = f.db.writes.length; }
      }
    } }), error => error?.code === 'failed-precondition' && error?.details?.reason === 'comment-count-maintenance',
    'Count pause after a committed inverse must block the next inverse and final completion transaction.');
    assert.equal(completedItems, 1); assert.equal(f.db.writes.length, writesAfterFirst);
    assert.deepEqual(f.db.snapshot(first).data(), firstData, 'The already committed first inverse is retained.');
    assert.deepEqual(f.db.snapshot(second).data(), secondApplied, 'The second episode remains in its applied state.');
    assert.equal(f.db.snapshot(`${job}/items/000`).data().state, 'restored');
    assert.equal(f.db.snapshot(`${job}/items/001`).data().state, 'applied');
    assert.equal(f.db.snapshot(job).data().status, 'completed', 'No restored completion stamp is written after pause.');
  } finally { await f.close(); }
});

for (const root of ['HudHudDev', 'HudHudOfficial']) test(`R12 control: ${root} episode count pause preserves unrelated program pagination repair/restore`, async () => {
  const f = await fixture(root, 'programs');
  try {
    const target = at(root, 'programs', 'target'), original = program({ stats: { episodesCount: 3 } });
    f.db.seed(target, original); const input = await f.prepare();
    f.db.seed(`${root}/commentCountContributions`, countMaintenanceFence('paused'));
    assert.equal((await backfillContentPagination(input)).applied, 1);
    assert.deepEqual(f.db.snapshot(target).data(), { ...original, priority: 0, isFeatured: false });
    assert.equal((await restoreContentPagination(input)).restored, 1);
    assert.deepEqual(f.db.snapshot(target).data(), original);
  } finally { await f.close(); }
});
