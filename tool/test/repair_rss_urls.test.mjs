import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, writeFile, chmod, symlink, rm, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRssFeed } from '../../functions/lib/rss-ingestion.js';
import { contentIdentity } from '../../functions/lib/admin-content.js';
import { RssRepairBackupStore, createRssDemoFirestore, parseRssRepairArgs, previewRssRepairs, executeRssRepair, validateRssRepairManifest } from '../repair_rss_urls.mjs';
const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { Timestamp } = require('firebase-admin/firestore');
const clone = value => value instanceof Timestamp ? value : Array.isArray(value) ? value.map(clone) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;
const scope = root => ({ projectId: 'demo-hudhud-rss-repair', root, programId: 'program' });
const feed = (count = 1) => parseRssFeed(`<rss>${Array.from({ length: count }, (_, index) => `<item><guid>guid-${index}</guid><enclosure url="https://cdn.example.com/${index}.mp3?a=1&amp;b=2"/></item>`).join('')}</rss>`);

function fakeDb(root, count = 1) {
  const records = new Map(), writes = [], pages = []; let revision = 1000, queue = Promise.resolve();
  const put = (path, data, stamp = Timestamp.fromMillis(revision++)) => records.set(path, { data: clone(data), version: stamp, created: records.get(path)?.created ?? stamp });
  put(`${root}/programs/programs/program`, { stationId: 'station', isActive: true, stats: { episodesCount: count } });
  for (let index = 0; index < count; index++) put(`${root}/episodes/episodes/e-${String(index).padStart(3, '0')}`, {
    programId: 'program', stationId: 'station', audioUrl: `https://cdn.example.com/${index}.mp3?a=1&amp;b=2`,
    externalId: `guid-${index}`, title: 'Synthetic episode', isPublished: false, stats: { commentsCount: 7, playsCount: 9 },
  });
  const snapshot = ref => {
    const entry = records.get(ref.path);
    return { ref, id: ref.id, exists: !!entry, updateTime: entry?.version, createTime: entry?.created, data: () => entry ? clone(entry.data) : undefined,
      get: field => field.split('.').reduce((value, key) => value?.[key], entry?.data) };
  };
  const reference = path => ({ path, id: path.split('/').at(-1), get: async () => snapshot(reference(path)) });
  const query = (path, conditions = [], cursor = '', size = 10000) => ({ _query: true,
    where: (field, op, value) => { assert.equal(op, '=='); return query(path, [...conditions, [field, value]], cursor, size); },
    orderBy: () => query(path, conditions, cursor, size), startAfter: value => query(path, conditions, typeof value === 'string' ? value : value.id, size),
    limit: value => query(path, conditions, cursor, value),
    get: async () => {
      pages.push(size);
      const docs = [...records.keys()].filter(key => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1)
        .map(key => snapshot(reference(key))).filter(doc => doc.id > cursor && conditions.every(([field, value]) => doc.get(field) === value))
        .sort((a, b) => a.id.localeCompare(b.id)).slice(0, size);
      return { docs, size: docs.length, empty: !docs.length };
    },
  });
  const raw = { projectId: 'demo-hudhud-rss-repair', settings() {}, terminate() {}, doc: reference, collection: path => query(path),
    runTransaction(callback) {
      const operation = queue.then(async () => {
        await raw.beforeTransaction?.();
        const staged = [];
        const tx = { get: async target => { assert.equal(staged.length, 0, 'All reads precede writes.'); return target._query ? target.get() : snapshot(target); },
          set: (ref, data) => staged.push(['set', ref, data]), create: (ref, data) => { assert.equal(records.has(ref.path), false); staged.push(['set', ref, data]); }, update: (ref, data) => staged.push(['update', ref, data]) };
        const result = await callback(tx);
        const stamp = Timestamp.fromMillis(revision++);
        for (const [kind, ref, data] of staged) {
          if (kind === 'update') assert.ok(records.has(ref.path));
          put(ref.path, kind === 'set' ? data : { ...records.get(ref.path).data, ...data }, stamp);
          writes.push({ path: ref.path, kind, data });
        }
        return result;
      }); queue = operation.catch(() => {}); return operation;
    } };
  const sdkPath = require.resolve('firebase-admin/firestore'), actual = require(sdkPath), prior = require.cache[sdkPath].exports;
  let db; try {
    require.cache[sdkPath].exports = { ...actual, Firestore: class { constructor() { return raw; } } };
    db = createRssDemoFirestore({ projectId: raw.projectId, emulatorHost: '127.0.0.1:8180' });
  } finally { require.cache[sdkPath].exports = prior; }
  return { db, raw, records, writes, pages, put, episode: `${root}/episodes/episodes/e-000`, program: `${root}/programs/programs/program` };
}
async function withStore(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'hudhud-rss-backup-')); await chmod(directory, 0o700);
  const config = { directory, key: Buffer.alloc(32, 7), expiresAt: Date.now() + 86400000 };
  try { return await callback(await RssRepairBackupStore.open(config), config); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('RSS repair CLI has no implicit scope, defaults preview, and enforces reviewed bounds/options', () => {
  const args = ['--project', 'demo-hudhud-rss-repair', '--root', 'HudHudDev', '--program', 'program', '--backup-dir', '/tmp/private-backup', '--key-file', '/tmp/private-key', '--expires-at', String(Date.now() + 86400000)];
  assert.equal(parseRssRepairArgs(args).mode, 'preview');
  for (const invalid of [[], args.slice(2), [...args, '--apply'], [...args, '--max-items', '26'], [...args, '--max-records', '101'], [...args, '--dry-run', '--restore'], [...args, '--root', 'Other'], [...args, '--cursor', '../bad']]) assert.throws(() => parseRssRepairArgs(invalid));
});

test('RSS preview is deterministic, bounded, read-only and cursor-resumable', async () => {
  const fixture = fakeDb('HudHudDev', 105), options = scope('HudHudDev'), items = feed(105);
  const first = await previewRssRepairs(options, fixture.db, items);
  assert.equal(first.read, 100); assert.equal(first.items.length, 100); assert.equal(first.hasMore, true);
  assert.ok(fixture.pages.every(limit => limit <= 50)); assert.equal(fixture.writes.length, 0);
  assert.deepEqual(await previewRssRepairs(options, fixture.db, items), first);
  const last = await previewRssRepairs({ ...options, cursor: first.cursor }, fixture.db, items);
  assert.equal(last.read, 5); assert.equal(last.hasMore, false);
  assert.deepEqual(validateRssRepairManifest(first, options), first);
  assert.throws(() => validateRssRepairManifest({ ...first, items: [] }, options));
  assert.throws(() => validateRssRepairManifest(first, { ...options, root: 'HudHudOfficial' }));
});

test('RSS repair requires positive feed provenance and does not double-decode valid stored URL literals', async () => {
  const fixture = fakeDb('HudHudDev'), options = scope('HudHudDev');
  const correctlyDecoded = parseRssFeed('<rss><item><guid>guid-0</guid><enclosure url="https://cdn.example.com/0.mp3?a=1&amp;amp;b=2"/></item></rss>');
  assert.equal(correctlyDecoded[0].audioUrl, fixture.records.get(fixture.episode).data.audioUrl);
  assert.equal((await previewRssRepairs(options, fixture.db, correctlyDecoded)).items.length, 0);
});

for (const root of ['HudHudDev', 'HudHudOfficial']) test(`${root}: apply and safe restore preserve IDs, counters, publication, parent and aliases`, async () => withStore(async store => {
  const fixture = fakeDb(root), options = scope(root), original = clone(fixture.records.get(fixture.episode).data), parent = clone(fixture.records.get(fixture.program).data);
  const manifest = await previewRssRepairs(options, fixture.db, feed());
  await store.put(manifest);
  const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' };
  assert.equal((await executeRssRepair(options, fixture.db, context)).completed, true);
  assert.deepEqual(fixture.records.get(fixture.episode).data, { ...original, audioUrl: feed()[0].audioUrl });
  assert.deepEqual(fixture.records.get(fixture.program).data, parent);
  assert.equal((await executeRssRepair(options, fixture.db, context)).changed, 0);
  assert.equal((await executeRssRepair({ ...options, mode: 'restore' }, fixture.db, context)).completed, true);
  assert.deepEqual(fixture.records.get(fixture.episode).data, original);
  assert.deepEqual(fixture.records.get(fixture.program).data, parent);
  for (const audioUrl of [original.audioUrl, feed()[0].audioUrl]) {
    const key = contentIdentity('episodes', { programId: options.programId, audioUrl });
    assert.equal(fixture.records.get(`${root}/importKeys/importKeys/${key}`).data.targetId, 'e-000');
  }
  await assert.rejects(executeRssRepair(options, fixture.db, context));
}));

test('failed or untrusted backup and unsupported production/remote scopes cause zero database mutations', async () => {
  const fixture = fakeDb('HudHudDev'), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, fixture.db, feed());
  let backups = 0;
  const context = { manifest, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', store: { put: async () => { backups++; throw new Error('Backup unavailable'); } } };
  await assert.rejects(executeRssRepair(options, fixture.db, context)); assert.equal(backups, 0); assert.equal(fixture.writes.length, 0);
  await assert.rejects(executeRssRepair(options, fixture.db, { ...context, emulatorHost: 'remote.example:8180' })); assert.equal(backups, 0);
  const realDb = { ...fixture.db, projectId: 'real-project' };
  await assert.rejects(executeRssRepair({ ...options, projectId: 'real-project' }, realDb, context)); assert.equal(backups, 0);
  assert.equal(fixture.writes.length, 0);
});

test('source drift, parent drift and deleted records cannot be overwritten or resurrected', async () => withStore(async store => {
  for (const kind of ['source', 'parent', 'deleted']) {
    const fixture = fakeDb('HudHudDev'), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, fixture.db, feed());
  await store.put(manifest);
    if (kind === 'source') fixture.put(fixture.episode, { ...fixture.records.get(fixture.episode).data, title: 'Concurrent edit' });
    if (kind === 'parent') fixture.put(fixture.program, { ...fixture.records.get(fixture.program).data, title: 'Concurrent parent edit' });
    if (kind === 'deleted') fixture.records.delete(fixture.episode);
    await assert.rejects(executeRssRepair(options, fixture.db, { manifest, store, reviewedHash: manifest.runId, emulatorHost: 'localhost:8180', owner: 'worker' }));
    assert.equal(fixture.writes.some(write => write.path === fixture.episode), false);
    if (kind === 'deleted') assert.equal(fixture.records.has(fixture.episode), false);
  }
}));

test('distinct legacy/canonical owners conflict without URL mutation or alias takeover', async () => withStore(async store => {
  const fixture = fakeDb('HudHudDev'), options = scope('HudHudDev');
  fixture.put('HudHudDev/episodes/episodes/other', { ...fixture.records.get(fixture.episode).data, audioUrl: feed()[0].audioUrl, externalId: 'other-guid' });
  const manifest = await previewRssRepairs(options, fixture.db, feed());
  await store.put(manifest);
  await assert.rejects(executeRssRepair(options, fixture.db, { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' }));
  assert.equal(fixture.writes.some(write => write.path.includes('/episodes/episodes/')), false);
}));

test('commit-before-ack failure resumes from the atomic checkpoint without duplicate effects', async () => withStore(async store => {
  const fixture = fakeDb('HudHudDev', 2), options = { ...scope('HudHudDev'), maxItems: 1 }, manifest = await previewRssRepairs(options, fixture.db, feed(2));
  await store.put(manifest);
  const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' };
  await assert.rejects(executeRssRepair(options, fixture.db, { ...context, afterCommit: async () => { throw new Error('Synthetic lost acknowledgement'); } }));
  const resumed = await executeRssRepair(options, fixture.db, context);
  assert.equal(resumed.changed, 1); assert.equal(resumed.completed, true);
  assert.equal(fixture.writes.filter(write => write.path.includes('/episodes/episodes/')).length, 2);
}));

test('active lease excludes another worker; expired lease resumes with a fresh generation', async () => withStore(async store => {
  const fixture = fakeDb('HudHudDev', 2), options = { ...scope('HudHudDev'), maxItems: 1 }, manifest = await previewRssRepairs(options, fixture.db, feed(2));
  await store.put(manifest);
  const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', now: () => 1000, owner: 'first' };
  assert.equal((await executeRssRepair(options, fixture.db, context)).completed, false);
  await assert.rejects(executeRssRepair(options, fixture.db, { ...context, owner: 'second' }));
  assert.equal((await executeRssRepair(options, fixture.db, { ...context, owner: 'second', now: () => 122000 })).completed, true);
}));

test('safe restore rejects a concurrent post-apply edit instead of resetting newer content', async () => withStore(async store => {
  const fixture = fakeDb('HudHudDev'), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, fixture.db, feed());
  await store.put(manifest);
  const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' };
  await executeRssRepair(options, fixture.db, context);
  fixture.put(fixture.episode, { ...fixture.records.get(fixture.episode).data, stats: { commentsCount: 99 } });
  await assert.rejects(executeRssRepair({ ...options, mode: 'restore' }, fixture.db, context));
  assert.equal(fixture.records.get(fixture.episode).data.stats.commentsCount, 99);
}));

test('malformed reviewed postimages and incomplete reservation preimages cause no episode mutation', async () => withStore(async store => {
  for (const kind of ['postimage', 'reservations']) {
    const fixture = fakeDb('HudHudDev'), options = scope('HudHudDev');
    const preview = await previewRssRepairs(options, fixture.db, feed());
    const { runId: ignored, ...body } = JSON.parse(JSON.stringify(preview));
    assert.ok(ignored);
    if (kind === 'postimage') body.items[0].afterFingerprint = '0'.repeat(64);
    else body.items[0].reservations = [];
    const manifest = { ...body, runId: createHash('sha256').update(JSON.stringify(body)).digest('hex') };
  await store.put(manifest);
    await assert.rejects(executeRssRepair(options, fixture.db, { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' }));
    assert.equal(fixture.writes.some(write => write.path === fixture.episode), false);
  }
}));

test('unknown checkpoint schema and corrupt cursors cannot be resumed as successful work', async () => withStore(async store => {
  for (const kind of ['schema', 'cursor']) {
    const fixture = fakeDb('HudHudDev'), options = scope('HudHudDev');
    const manifest = await previewRssRepairs(options, fixture.db, feed());
  await store.put(manifest);
    fixture.put(`HudHudDev/rssUrlRepairs/runs/${manifest.runId}`, { version: kind === 'schema' ? 99 : 1,
      runId: manifest.runId, status: 'applying', owner: 'worker', generation: 1, leaseUntil: Date.now() + 120000,
      next: kind === 'cursor' ? 999 : 0, restored: 0 });
    await assert.rejects(executeRssRepair(options, fixture.db, { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' }));
    assert.equal(fixture.writes.some(write => write.path === fixture.episode), false);
  }
}));

test('encrypted immutable backups reject plaintext leakage, tampering, wrong keys and unsafe permissions', async () => withStore(async (store, config) => {
  const fixture = fakeDb('HudHudDev'), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, fixture.db, feed());
  await store.put(manifest);
  await store.put(manifest); assert.deepEqual(await store.get(manifest.runId), manifest);
  const file = join(config.directory, `${manifest.runId}.rss-backup`), bytes = await readFile(file, 'utf8');
  assert.equal(bytes.includes('cdn.example.com'), false); assert.equal(bytes.includes('e-000'), false);
  await store.put(manifest); assert.equal(await readFile(file, 'utf8'), bytes);
  await assert.rejects(async () => (await RssRepairBackupStore.open({ ...config, key: Buffer.alloc(32, 8) })).get(manifest.runId));
  await chmod(file, 0o644); await assert.rejects(store.get(manifest.runId)); await chmod(file, 0o600);
  const envelope = JSON.parse(bytes); envelope.ciphertext = Buffer.from('tampered').toString('base64');
  await writeFile(file, JSON.stringify(envelope), { mode: 0o600 }); await assert.rejects(store.get(manifest.runId));
}));

test('backup directories inside repository/.boss and symlinks cannot authorize mutation', async () => withStore(async (store, config) => {
  const fixture = fakeDb('HudHudDev'), manifest = await previewRssRepairs(scope('HudHudDev'), fixture.db, feed());
  await store.put(manifest);
  const inside = join(config.directory, '..inside');
  await assert.rejects(async () => (await RssRepairBackupStore.open({ ...config, directory: inside, repositoryRoot: config.directory })).put(manifest));
  const link = join(config.directory, 'link'); await symlink(config.directory, link);
  await assert.rejects(async () => (await RssRepairBackupStore.open({ ...config, directory: link })).put(manifest));
  const boss = join(config.directory, '.boss', 'backup');
  await assert.rejects(async () => (await RssRepairBackupStore.open({ ...config, directory: boss })).put(manifest));
  assert.ok((await readdir(config.directory)).length >= 1);
}));


test('REVIEW: untrusted transport and memory backup must refuse every mutation', async () => {
  const f = fakeDb('HudHudDev'), options = scope('HudHudDev');
  const manifest = await previewRssRepairs(options, f.db, feed());
  const store = { put: async () => manifest.runId, get: async () => manifest };
  await assert.rejects(executeRssRepair(options, f.db, { manifest, reviewedHash: manifest.runId, store, emulatorHost: '127.0.0.1:8180', owner: 'reviewer' }));
  assert.equal(f.writes.length, 0);
});
test('REVIEW: backup expiry between items must stop later database mutations', async () => withStore(async (_, config) => {
  let clock = Date.now(); const store = await RssRepairBackupStore.open({ ...config, now: () => clock });
  const f = fakeDb('HudHudDev', 2), options = scope('HudHudDev');
  const manifest = await previewRssRepairs(options, f.db, feed(2));
  await store.put(manifest);
  await assert.rejects(executeRssRepair(options, f.db, { manifest, reviewedHash: manifest.runId, store,
    emulatorHost: '127.0.0.1:8180', owner: 'reviewer', afterCommit: async index => { if (index === 0) clock = config.expiresAt + 1; } }));
  assert.equal(f.writes.filter(write => write.path.includes('/episodes/episodes/')).length, 1);
}));
for (const replace of [false, true]) test(`REVIEW: ${replace ? 'delete/recreate' : 'ABA same-content'} newer source refuses rollback`, async () => withStore(async store => {
  const f = fakeDb('HudHudDev'), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, f.db, feed());
  await store.put(manifest);
  const context = { manifest, reviewedHash: manifest.runId, store, emulatorHost: '127.0.0.1:8180', owner: 'reviewer' };
  await executeRssRepair(options, f.db, context);
  const value = clone(f.records.get(f.episode).data); if (replace) f.records.delete(f.episode); f.put(f.episode, value);
  await assert.rejects(executeRssRepair({ ...options, mode: 'restore' }, f.db, context));
  assert.equal(f.records.get(f.episode).data.audioUrl, manifest.items[0].afterUrl);
}));


test('REVIEW: only the owned frozen SDK facade and private immutable backup capability authorize writes', async () => withStore(async store => {
  const f = fakeDb('HudHudDev'), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, f.db, feed());
  await store.put(manifest);
  const context = { manifest, reviewedHash: manifest.runId, store, emulatorHost: '127.0.0.1:8180', owner: 'worker' };
  for (const db of [f.raw, { ...f.db }]) await assert.rejects(executeRssRepair(options, db, context));
  for (const fake of [{ put: async () => {}, get: async () => manifest }, Object.create(RssRepairBackupStore.prototype)])
    await assert.rejects(executeRssRepair(options, f.db, { ...context, store: fake }));
  assert.equal(Object.isFrozen(f.db), true); assert.equal(Object.isFrozen(store), true);
  assert.throws(() => { store.expiresAt = Date.now() + 99999999; });
  assert.throws(() => { store.get = async () => manifest; });
  assert.throws(() => { f.db.runTransaction = f.raw.runTransaction; });
  assert.equal(f.writes.length, 0);
}));
for (const empty of [false, true]) for (const drift of ['missing', 'corrupt', 'expired', 'permissions', 'replacement']) {
  test(`REVIEW: ${empty ? 'empty' : 'nonempty'} initial lease rejects ${drift} backup before every database write`, async () => withStore(async (_, config) => {
    let clock = Date.now(); const store = await RssRepairBackupStore.open({ ...config, now: () => clock });
    const f = fakeDb('HudHudDev', empty ? 0 : 1), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, f.db, feed());
  await store.put(manifest);
    const file = join(config.directory, `${manifest.runId}.rss-backup`), moved = `${config.directory}-moved`; let fired = false;
    f.raw.beforeTransaction = async () => {
      if (fired) return; fired = true;
      if (drift === 'missing') await rm(file);
      if (drift === 'corrupt') await writeFile(file, '{}');
      if (drift === 'expired') clock = config.expiresAt + 1;
      if (drift === 'permissions') await chmod(config.directory, 0o755);
      if (drift === 'replacement') {
        await rename(config.directory, moved); await mkdir(config.directory, { mode: 0o700 });
        await writeFile(file, await readFile(join(moved, `${manifest.runId}.rss-backup`)), { mode: 0o600 });
      }
    };
    try {
      await assert.rejects(executeRssRepair(options, f.db, { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' }));
      assert.equal(f.writes.length, 0);
    } finally { await rm(moved, { recursive: true, force: true }); }
  }));
}
for (const drift of ['missing', 'corrupt', 'permissions', 'replacement']) test(`REVIEW: ${drift} backup between item commits blocks later writes and restore`, async () => withStore(async (store, config) => {
  const f = fakeDb('HudHudDev', 2), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, f.db, feed(2));
  await store.put(manifest);
  const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' };
  const file = join(config.directory, `${manifest.runId}.rss-backup`), moved = `${config.directory}-moved`;
  try {
    await assert.rejects(executeRssRepair(options, f.db, { ...context, afterCommit: async index => {
      if (index !== 0) return;
      if (drift === 'missing') await rm(file);
      if (drift === 'corrupt') await writeFile(file, '{}');
      if (drift === 'permissions') await chmod(file, 0o644);
      if (drift === 'replacement') { await rename(config.directory, moved); await mkdir(config.directory, { mode: 0o700 });
        await writeFile(file, await readFile(join(moved, `${manifest.runId}.rss-backup`)), { mode: 0o600 }); }
    } }));
    assert.equal(f.writes.filter(write => write.path.includes('/episodes/episodes/')).length, 1);
    // Missing immutable backups cannot be recreated by executor resume/restore.
    await assert.rejects(executeRssRepair({ ...options, mode: 'restore' }, f.db, context));
    assert.equal(f.writes.filter(write => write.path.includes('/episodes/episodes/')).length, 1);
  } finally { await rm(moved, { recursive: true, force: true }); }
}));
test('REVIEW: completed and lost-ack replay reject ABA before changing job ownership', async () => withStore(async store => {
  for (const lostAck of [false, true]) {
    const f = fakeDb('HudHudDev'), options = scope('HudHudDev'), manifest = await previewRssRepairs(options, f.db, feed());
  await store.put(manifest);
    const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'worker' };
    if (lostAck) await assert.rejects(executeRssRepair(options, f.db, { ...context, afterCommit: async () => { throw new Error('Synthetic lost ACK'); } }));
    else await executeRssRepair(options, f.db, context);
    const writes = f.writes.length; f.put(f.episode, clone(f.records.get(f.episode).data));
    await assert.rejects(executeRssRepair(options, f.db, context)); assert.equal(f.writes.length, writes);
  }
}));

const countFence = state => ({ version: 1, state, generation: 3, owner: 'count-maintenance-worker',
  planHash: 'a'.repeat(64), leaseUntil: 0, writerProtocol: 1,
  ...(state === 'active' ? { activeFrom: Timestamp.fromMillis(500), baselineManifestHash: 'b'.repeat(64) } : {}) });
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const mode of ['apply', 'restore']) {
    test(`R12: ${root} paused root refuses RSS ${mode} before any mutation`, async () => withStore(async store => {
      const f = fakeDb(root), options = scope(root), manifest = await previewRssRepairs(options, f.db, feed());
      await store.put(manifest);
      const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'rss-worker' };
      if (mode === 'restore') await executeRssRepair(options, f.db, context);
      f.put(`${root}/commentCountContributions`, countFence('paused'));
      const before = [...f.records].map(([path, value]) => [path, clone(value)]), writes = f.writes.length;
      await assert.rejects(executeRssRepair({ ...options, mode }, f.db, context),
        error => error?.code === 'failed-precondition' && error?.details?.reason === 'comment-count-maintenance',
        'Paused count maintenance must refuse the existing RSS mutation path.');
      assert.equal(f.writes.length, writes, 'Refusal must precede job, alias, episode and receipt writes.');
      assert.deepEqual([...f.records], before);
    }));
    test(`R12: ${root} pause after RSS ${mode} lease blocks the actual item transaction`, async () => withStore(async store => {
      const f = fakeDb(root), options = scope(root), manifest = await previewRssRepairs(options, f.db, feed());
      await store.put(manifest);
      const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'rss-worker' };
      if (mode === 'restore') await executeRssRepair(options, f.db, context);
      const beforeEpisode = clone(f.records.get(f.episode)), beforeAliases = [...f.records].filter(([path]) => path.startsWith(`${root}/importKeys/`));
      let transactions = 0, writesAfterLease;
      f.raw.beforeTransaction = async () => {
        if (++transactions === 2) { f.put(`${root}/commentCountContributions`, countFence('paused')); writesAfterLease = f.writes.length; }
      };
      await assert.rejects(executeRssRepair({ ...options, mode }, f.db, context),
        error => error?.code === 'failed-precondition' && error?.details?.reason === 'comment-count-maintenance',
        'A pre-lease check alone cannot authorize the item after count maintenance pauses.');
      assert.equal(transactions, 2); assert.equal(f.writes.length, writesAfterLease);
      assert.deepEqual(f.records.get(f.episode), beforeEpisode);
      assert.deepEqual([...f.records].filter(([path]) => path.startsWith(`${root}/importKeys/`)), beforeAliases);
    }));
  }
  for (const state of ['absent', 'active']) test(`R12 control: ${root} ${state} fence preserves RSS apply and restore`, async () => withStore(async store => {
    const f = fakeDb(root), options = scope(root), manifest = await previewRssRepairs(options, f.db, feed());
    await store.put(manifest);
    if (state === 'active') f.put(`${root}/commentCountContributions`, countFence('active'));
    const context = { manifest, store, reviewedHash: manifest.runId, emulatorHost: '127.0.0.1:8180', owner: 'rss-worker' };
    const original = f.records.get(f.episode).data.audioUrl;
    assert.equal((await executeRssRepair(options, f.db, context)).completed, true);
    assert.notEqual(f.records.get(f.episode).data.audioUrl, original);
    assert.equal(f.records.get(f.episode).data.stats.commentsCount, 7);
    assert.equal((await executeRssRepair({ ...options, mode: 'restore' }, f.db, context)).completed, true);
    assert.equal(f.records.get(f.episode).data.audioUrl, original);
    assert.equal(f.records.get(f.episode).data.stats.commentsCount, 7);
  }));
}
