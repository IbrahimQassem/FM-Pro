import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtemp, chmod, rm, readFile, writeFile, lstat, rename, mkdir, symlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import * as migration from '../migrate_program_notification_dates.mjs';
import { parseProgramDateMigrationArgs } from '../migrate_program_notification_dates.mjs';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { Timestamp, FieldValue } = require('firebase-admin/firestore');
const H = tuple => createHash('sha256').update(JSON.stringify(tuple)).digest('hex');
const copy = value => value instanceof Timestamp ? new Timestamp(value.seconds, value.nanoseconds) : Array.isArray(value) ? value.map(copy) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)])) : value;
const baseArgs = () => ['--project', 'demo-hudhud-program-dates', '--root', 'HudHudDev', '--program', 'program',
  '--from', '2026-10-19', '--to', '2026-11-18', '--cutover-at', '2026-10-19T07:00:00.000Z'];

test('new tool imports without SDK construction, credential lookup or CLI execution', () => {
  const file = new URL('../migrate_program_notification_dates.mjs', import.meta.url).href;
  const modulePath = require.resolve('firebase-admin/firestore');
  const script = `import { createRequire } from 'node:module'; const require=createRequire(${JSON.stringify(new URL('../../functions/package.json', import.meta.url).href)});
    const actual=require(${JSON.stringify(modulePath)}); require.cache[${JSON.stringify(modulePath)}].exports={...actual,Firestore:class{constructor(){throw new Error('Unexpected SDK construction');}}};
    await import(${JSON.stringify(file)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, '');
});
test('new CLI defaults to read-only preview with explicit scope and bounded date range', () => {
  const options = parseProgramDateMigrationArgs(baseArgs()); assert.equal(options.mode, 'preview'); assert.equal(options.maxItems, 25);
  assert.equal(parseProgramDateMigrationArgs([...baseArgs(), '--dry-run', '--max-items', '1']).maxItems, 1);
});
for (const [name, args] of [
  ['missing scope', []], ['unknown root', [...baseArgs(), '--root', 'Other']], ['duplicate scope', [...baseArgs(), '--program', 'other']],
  ['unknown flag', [...baseArgs(), '--isolated', 'true']], ['contradictory modes', [...baseArgs(), '--apply', '--restore']],
  ['too many items', [...baseArgs(), '--max-items', '26']], ['fractional budget', [...baseArgs(), '--max-items', '1.5']],
  ['invalid cursor', [...baseArgs(), '--cursor', '2026-11-19']], ['unreviewed apply', [...baseArgs(), '--apply']],
  ['unreviewed restore', [...baseArgs(), '--restore']],
]) test(`new CLI rejects ${name}`, () => assert.throws(() => parseProgramDateMigrationArgs(args)));
for (const [flag, value] of [['--from', '2026-02-30'], ['--from', '0000-01-01'], ['--to', '10000-01-01'],
  ['--to', '2026-11-19'], ['--to', '2026-10-18'], ['--cutover-at', '2026-10-19T07:00:00Z'], ['--cutover-at', '2026-10-19T10:00:00.000+03:00']]) {
  test(`new CLI rejects noncanonical/unbounded ${flag} ${value}`, () => {
    const args = baseArgs(), at = args.indexOf(flag); args[at + 1] = value; assert.throws(() => parseProgramDateMigrationArgs(args));
  });
}

function storage(root = 'HudHudDev', offset = 0) {
  const records = new Map(), writes = [], reads = []; let tick = 0, queue = Promise.resolve();
  const time = () => new Timestamp(1800000000, ++tick);
  const put = (path, data, stamp = time()) => {
    const old = records.get(path), body = copy(data);
    records.set(path, { data: body, createTime: old?.createTime ?? stamp, updateTime: old && isDeepStrictEqual(old.data, body) ? old.updateTime : stamp });
  };
  const snapshot = ref => {
    const old = records.get(ref.path), body = old ? copy(old.data) : undefined;
    return { ref, id: ref.id, exists: !!old, createTime: old?.createTime, updateTime: old?.updateTime, data: () => copy(body), get: field => field.split('.').reduce((value, key) => value?.[key], body) };
  };
  const reference = path => ({ path, id: path.split('/').at(-1), get: async () => { reads.push(path); return snapshot(reference(path)); } });
  const transform = (value, stamp) => value instanceof Timestamp ? value : value?.isEqual?.(FieldValue.serverTimestamp()) ? Timestamp.fromMillis(stamp.toMillis()) :
    Array.isArray(value) ? value.map(item => transform(item, stamp)) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transform(item, stamp)])) : value;
  const raw = { projectId: 'demo-hudhud-program-dates', doc: reference, settings(config) {
    assert.equal(config.projectId, raw.projectId); assert.equal(config.host, '127.0.0.1:8180'); assert.equal(config.ssl, false);
  }, terminate: async () => {}, runTransaction(callback) {
    const task = queue.then(async () => {
      await raw.beforeTransaction?.(); const staged = [];
      const result = await callback({ get: async ref => { assert.equal(staged.length, 0, 'all reads before writes'); reads.push(ref.path); return snapshot(ref); },
        set: (ref, data) => staged.push(['set', ref, data]), create: (ref, data) => staged.push(['create', ref, data]), update: (ref, data) => staged.push(['update', ref, data]) });
      await raw.beforeCommit?.(staged);
      for (const [kind, ref] of staged) { if (kind === 'create') assert.equal(records.has(ref.path), false); if (kind === 'update') assert.equal(records.has(ref.path), true); }
      const stamp = time();
      for (const [kind, ref, data] of staged) { put(ref.path, transform(kind === 'update' ? { ...records.get(ref.path).data, ...data } : data, stamp), stamp); writes.push({ path: ref.path, kind }); }
      await raw.afterCommit?.(staged); return result;
    }); queue = task.catch(() => {}); return task;
  } };
  const sdkPath = require.resolve('firebase-admin/firestore'), actual = require(sdkPath), prior = require.cache[sdkPath].exports;
  let db;
  try { require.cache[sdkPath].exports = { ...actual, Firestore: class { constructor() { return raw; } } }; db = migration.createProgramDateDemoFirestore({ projectId: raw.projectId, emulatorHost: '127.0.0.1:8180' }); }
  finally { require.cache[sdkPath].exports = prior; }
  const programPath = `${root}/programs/programs/program`, stationPath = `${root}/stations/stations/station`;
  put(programPath, { stationId: 'station', title: 'Synthetic program', isActive: true, schedule: { weekdays: [1, 2, 3, 4, 5, 6, 7], startMinute: 1439, endMinute: 1440, utcOffsetMinutes: offset } });
  put(stationPath, { isActive: true, name: 'Synthetic station' });
  const options = { projectId: raw.projectId, root, programId: 'program', fromLocalDate: '2026-10-19', toLocalDate: '2026-10-19', cutoverAt: '2026-10-19T07:00:00.000Z' };
  const op = key => `${root}/notificationOperations/operations/${key}`;
  return { db, raw, records, writes, reads, put, options, programPath, stationPath, op, legacyKey: H(['program', options.fromLocalDate]), v2Key: H(['program-start-v2', 'program', options.fromLocalDate]) };
}
async function privateStore(callback) {
  const directory = await mkdtemp(join(tmpdir(), 'hudhud-program-date-backup-')); await chmod(directory, 0o700);
  const config = { directory, key: randomBytes(32), expiresAt: Date.now() + 86400000 };
  try { return await callback(await migration.ProgramDateBackupStore.open(config), config); }
  finally { await rm(directory, { recursive: true, force: true }); }
}
const preview = f => migration.previewProgramNotificationDates(f.options, f.db);

test('preview is deterministic, point-read-only and bounded to25 with exact date cursor exhaustion', async () => {
  const f = storage(); f.options.toLocalDate = '2026-11-18';
  const first = await preview(f); assert.equal(first.items.length, 25); assert.equal(first.nextCursor, '2026-11-13');
  assert.deepEqual(await preview(f), first); assert.equal(f.writes.length, 0);
  const last = await migration.previewProgramNotificationDates({ ...f.options, cursor: first.nextCursor }, f.db);
  assert.equal(last.items.length, 6); assert.equal(last.nextCursor, null); assert.equal(f.writes.length, 0);
  assert.equal(first.items[0].v2Key, f.v2Key); assert.deepEqual(first.items[0].legacyDates, ['2026-10-19', '2026-10-20']);
});
for (const root of ['HudHudDev', 'HudHudOfficial']) test(`${root}: preview preserves terminal legacy evidence and exact nanos without writes`, async () => {
  const f = storage(root); f.put(f.op(f.legacyKey), { status: 'sent' });
  const before = copy(f.records.get(f.op(f.legacyKey))), manifest = await preview(f);
  assert.equal(manifest.items[0].action, 'created-suppression'); assert.deepEqual(f.records.get(f.op(f.legacyKey)), before); assert.equal(f.writes.length, 0);
  assert.deepEqual(manifest.items[0].legacy[0].before.updateTime.v, [before.updateTime.seconds, before.updateTime.nanoseconds]);
});
test('preview holds historical absence instead of inferring unsent delivery', async () => {
  const f = storage(); f.options.cutoverAt = '2026-10-21T00:00:00.000Z';
  const result = await preview(f); assert.equal(result.items[0].decision, 'historical-uncertain'); assert.equal(result.items[0].action, 'blocked'); assert.equal(f.writes.length, 0);
});
test('manifest validation rejects rehashed caller projections, unknown schema fields and malformed codec nodes', async () => {
  const f = storage(), original = await preview(f);
  for (const mutate of [m => { m.afterProjection = { status: 'sent' }; }, m => { m.items[0].action = 'created-suppression'; },
    m => { m.program.data.extra = true; }, m => { m.program.data.v.push(['syntheticContent', { t: 'value', v: 'synthetic' }]); },
    m => { m.items[0].legacy[0].before = { exists: false, data: null }; }, m => { m.program.createTime.v[1] = 1000000000; }]) {
    const value = copy(original); mutate(value); assert.throws(() => migration.validateProgramDateManifest(value, f.options));
  }
  assert.equal(f.writes.length, 0);
});
test('purpose backup is private, durable, readback verified and immutable', async () => privateStore(async (store, config) => {
  const f = storage(), manifest = await preview(f); await store.put(manifest); assert.deepEqual(await store.get(manifest.manifestHash), manifest);
  const path = join(config.directory, `${manifest.manifestHash}.program-date-backup`);
  assert.equal((await lstat(path)).mode & 0o077, 0); assert.equal((await readFile(path, 'utf8')).includes('Synthetic program'), false);
  const cold = await migration.ProgramDateBackupStore.open(config); assert.deepEqual(await cold.get(manifest.manifestHash), manifest);
  await store.put(manifest); assert.equal((await readdir(config.directory)).length, 1);
}));
test('new backup capability rejects public clocks, foreign repositories, loose permissions and forgery', async () => privateStore(async (store, config) => {
  await assert.rejects(migration.ProgramDateBackupStore.open({ ...config, now: () => 0 }));
  await assert.rejects(migration.ProgramDateBackupStore.open({ ...config, expiresAt: Date.now() + 3599999 }));
  await chmod(config.directory, 0o755); await assert.rejects(migration.ProgramDateBackupStore.open(config)); await chmod(config.directory, 0o700);
  assert.throws(() => new migration.ProgramDateBackupStore({}, config));
  assert.equal(Object.isFrozen(store), true); assert.equal(Object.isFrozen(Object.getPrototypeOf(store)), true);
}));

const execution = (f, manifest, store, extra = {}) => migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'apply' }, f.db,
  { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker', ...extra });
const jobPath = (f, manifest) => f.op(`program_date_migration_${manifest.manifestHash}`);
const itemPath = (f, manifest, index = 0) => `${jobPath(f, manifest)}/items/${String(index).padStart(3, '0')}`;
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: demo apply creates native-owned unknown suppression; replay and held rollback never erase evidence`, async () => privateStore(async store => {
    const f = storage(root); f.put(f.op(f.legacyKey), { status: 'sent' });
    const originals = [f.programPath, f.stationPath, f.op(f.legacyKey)].map(path => copy(f.records.get(path)));
    const manifest = await preview(f); await store.put(manifest);
    const result = await execution(f, manifest, store); assert.equal(result.chunkCompleted, true); assert.equal(result.completed, true);
    const target = f.records.get(f.op(f.v2Key)), receipt = f.records.get(itemPath(f, manifest));
    assert.equal(target.data.status, 'unknown'); assert.equal(target.data.retryable, false); assert.equal(target.data.reason, 'legacy-compatibility-suppression');
    assert.equal(target.data.programCompatibility.manifestHash, manifest.manifestHash);
    assert.ok(target.createTime.isEqual(receipt.updateTime)); assert.ok(target.updateTime.isEqual(receipt.updateTime));
    assert.equal(receipt.data.targetChanged, true); assert.equal(receipt.data.targetCreateTime, null); assert.equal(receipt.data.targetUpdateTime, null);
    assert.equal(Object.hasOwn(receipt.data, 'committedAt'), false);
    const count = f.writes.length; const nativeBefore = copy(target);
    assert.equal((await execution(f, manifest, store)).applied, 0); assert.equal(f.writes.length, count);
    const held = await migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'restore' }, f.db,
      { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' });
    assert.equal(held.status, 'rollback-held'); assert.deepEqual(f.records.get(f.op(f.v2Key)), nativeBefore);
    assert.deepEqual([f.programPath, f.stationPath, f.op(f.legacyKey)].map(path => f.records.get(path)), originals);
    const after = f.writes.length;
    await migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'restore' }, f.db, { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' });
    assert.equal(f.writes.length, after);
    await assert.rejects(execution(f, manifest, store));
  }));
  test(`${root}: preserved terminal no-op retains observed native target version, not later receipt time`, async () => privateStore(async store => {
    const f = storage(root); f.put(f.op(f.v2Key), { status: 'sent', fingerprint: 'different-existing-binding' });
    const original = copy(f.records.get(f.op(f.v2Key))), manifest = await preview(f); await store.put(manifest);
    await execution(f, manifest, store);
    const receipt = f.records.get(itemPath(f, manifest));
    assert.equal(receipt.data.action, 'preserved-terminal'); assert.equal(receipt.data.targetChanged, false);
    assert.ok(receipt.data.targetUpdateTime.isEqual(original.updateTime)); assert.equal(receipt.updateTime.isEqual(original.updateTime), false);
    assert.deepEqual(f.records.get(f.op(f.v2Key)), original);
    await migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'restore' }, f.db, { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' });
    assert.deepEqual(f.records.get(f.op(f.v2Key)), original);
  }));
  test(`${root}: clear absence is a native no-op and conditional held rollback never creates a target`, async () => privateStore(async store => {
    const f = storage(root), manifest = await preview(f); await store.put(manifest); await execution(f, manifest, store);
    const receipt = f.records.get(itemPath(f, manifest));
    assert.equal(receipt.data.action, 'clear-noop'); assert.equal(receipt.data.targetChanged, false); assert.equal(receipt.data.targetCreateTime, null); assert.equal(receipt.data.targetUpdateTime, null);
    assert.equal(f.records.has(f.op(f.v2Key)), false);
    await migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'restore' }, f.db, { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' });
    assert.equal(f.records.has(f.op(f.v2Key)), false);
  }));
}
function sourceReceipt(status = 'pending') {
  const now = Date.now(), stamp = ms => Timestamp.fromMillis(ms);
  return { status, phase: 'claimed', lease: 'controlled-old-worker', attempts: 4, createdAt: stamp(now - 10000), updatedAt: stamp(now - 5000),
    leaseUntil: stamp(now - 1000), expiresAt: stamp(now + 3600000), cleanupAt: stamp(now + 86400000),
    ...(status === 'failed' ? { retryable: true, reason: 'messaging/server-unavailable', retryAt: stamp(now + 120000) } : {}) };
}
function currentScope(f) {
  const now = new Date(); f.options.fromLocalDate = now.toISOString().slice(0, 10); f.options.toLocalDate = f.options.fromLocalDate; f.options.cutoverAt = now.toISOString();
  f.legacyKey = H(['program', f.options.fromLocalDate]); f.v2Key = H(['program-start-v2', 'program', f.options.fromLocalDate]);
}
for (const status of ['pending', 'failed']) test(`reviewed ${status} carry preserves every original clock, attempts, backoff and V1 native identity`, async () => privateStore(async store => {
  const f = storage(); currentScope(f); const original = sourceReceipt(status); f.put(f.op(f.legacyKey), original);
  const sourceBefore = copy(f.records.get(f.op(f.legacyKey))), manifest = await preview(f); await store.put(manifest); await execution(f, manifest, store);
  const data = f.records.get(f.op(f.v2Key)).data;
  for (const key of Object.keys(original)) assert.deepEqual(data[key], original[key]);
  assert.equal(data.programCompatibility.decision, status === 'pending' ? 'carried-prepared' : 'carried-retryable');
  assert.ok(data.programCompatibility.legacySourceUpdateTime.isEqual(sourceBefore.updateTime));
  assert.deepEqual(f.records.get(f.op(f.legacyKey)), sourceBefore); assert.equal(data.attempts, 4);
}));
test('inherited expired state cannot gain a fresh24-hour lifetime or retry permission', async () => privateStore(async store => {
  const f = storage(); currentScope(f); const old = sourceReceipt(); old.expiresAt = Timestamp.fromMillis(Date.now() - 1); f.put(f.op(f.legacyKey), old);
  const manifest = await preview(f); assert.equal(manifest.items[0].action, 'carried-terminal-failed'); await store.put(manifest); await execution(f, manifest, store);
  const data = f.records.get(f.op(f.v2Key)).data; assert.equal(data.status, 'failed'); assert.equal(data.retryable, false); assert.equal(data.reason, 'expired');
  assert.deepEqual(data.createdAt, old.createdAt); assert.deepEqual(data.expiresAt, old.expiresAt); assert.equal(data.attempts, old.attempts);
}));
test('bounded partial apply resumes only after complete persisted prefix proof', async () => privateStore(async store => {
  const f = storage(); f.options.toLocalDate = '2026-10-20'; f.options.maxItems = 1;
  f.put(f.op(f.legacyKey), { status: 'sent' });
  const manifest = await preview(f); assert.equal(manifest.items.length, 1); assert.equal(manifest.nextCursor, '2026-10-20');
  await store.put(manifest); const result = await execution(f, manifest, store);
  assert.equal(result.chunkCompleted, true); assert.equal(result.completed, false); assert.equal(result.nextCursor, '2026-10-20');
  const second = await migration.previewProgramNotificationDates({ ...f.options, cursor: result.nextCursor }, f.db); assert.equal(second.nextCursor, null);
  // A separate max2 manifest proves max1 applies at most one occurrence transaction per invocation.
  const g = storage(); g.options.toLocalDate = '2026-10-20'; const whole = await preview(g); await store.put(whole); g.options.maxItems = 1;
  const first = await execution(g, whole, store); assert.equal(first.applied, 1); assert.equal(first.chunkCompleted, false);
  const next = await execution(g, whole, store); assert.equal(next.applied, 1); assert.equal(next.chunkCompleted, true);
  assert.equal(g.records.get(jobPath(g, whole)).data.nextIndex, 2);
}));
test('lost item ACK resumes immutable native receipts without repeating the target write', async () => privateStore(async store => {
  const f = storage(); f.put(f.op(f.legacyKey), { status: 'unknown' }); const manifest = await preview(f); await store.put(manifest); let fired = 0;
  f.raw.afterCommit = staged => { if (!fired && staged.some(([, ref]) => ref.path === itemPath(f, manifest))) { fired++; throw new Error('Synthetic lost ACK'); } };
  await assert.rejects(execution(f, manifest, store), /Synthetic lost ACK/); assert.equal(fired, 1);
  const target = copy(f.records.get(f.op(f.v2Key))), count = f.writes.length;
  const targetWrites = f.writes.filter(write => write.path === f.op(f.v2Key)).length;
  assert.equal((await execution(f, manifest, store)).chunkCompleted, true);
  assert.equal(f.writes.filter(write => write.path === f.op(f.v2Key)).length, targetWrites);
  assert.deepEqual(f.writes.slice(count), [{ path: jobPath(f, manifest), kind: 'update' }]);
  assert.deepEqual(f.records.get(f.op(f.v2Key)), target);
}));
for (const drift of ['target ABA', 'target recreation', 'receipt ABA']) test(`current native proof rejects ${drift} after a completed apply`, async () => privateStore(async store => {
  const f = storage(); f.put(f.op(f.legacyKey), { status: 'sent' }); const manifest = await preview(f); await store.put(manifest); await execution(f, manifest, store);
  const path = drift === 'receipt ABA' ? itemPath(f, manifest) : f.op(f.v2Key), old = copy(f.records.get(path).data);
  if (drift === 'target recreation') f.records.delete(path); else f.put(path, { ...old, temporary: true }); f.put(path, old);
  const count = f.writes.length; await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, count);
  await assert.rejects(migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'restore' }, f.db, { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' }));
  assert.equal(f.writes.length, count);
}));
for (const drift of ['program', 'station', 'legacy']) test(`source ${drift} native drift stops before lease or target writes`, async () => privateStore(async store => {
  const f = storage(); f.put(f.op(f.legacyKey), { status: 'sent' }); const manifest = await preview(f); await store.put(manifest);
  const path = drift === 'program' ? f.programPath : drift === 'station' ? f.stationPath : f.op(f.legacyKey), original = copy(f.records.get(path).data);
  f.put(path, { ...original, temporary: true }); f.put(path, original);
  await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, 0);
}));
test('backup custody loss after lease acquisition stops the next item and retains durable job', async () => privateStore(async (store, config) => {
  const f = storage(); f.put(f.op(f.legacyKey), { status: 'sent' }); const manifest = await preview(f); await store.put(manifest); let fired = 0;
  f.raw.beforeTransaction = async () => { if (!fired && f.records.has(jobPath(f, manifest))) { fired++; await chmod(config.directory, 0o755); } };
  await assert.rejects(execution(f, manifest, store)); assert.equal(fired, 1); assert.equal(f.records.has(jobPath(f, manifest)), true);
  assert.equal(f.records.has(f.op(f.v2Key)), false); assert.equal(f.records.get(jobPath(f, manifest)).data.nextIndex, 0); await chmod(config.directory, 0o700);
}));
test('production, foreign facade, public clock and forged backup capabilities are rejected before transactions', async () => privateStore(async store => {
  const f = storage(), manifest = await preview(f); await store.put(manifest);
  for (const config of [{ ...f.options, mode: 'apply', projectId: 'production-project' }, { ...f.options, mode: 'apply', now: () => 0 }, { ...f.options, mode: 'apply', isolated: true }]) {
    await assert.rejects(migration.executeProgramNotificationDateMigration(config, f.db, { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' }));
  }
  await assert.rejects(migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'apply' }, { ...f.db }, { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' }));
  await assert.rejects(execution(f, manifest, { get: async () => manifest }));
  await assert.rejects(execution(f, manifest, Object.create(migration.ProgramDateBackupStore.prototype)));
  await assert.rejects(execution(f, manifest, store, { now: () => 0 }));
  assert.throws(() => migration.createProgramDateDemoFirestore({ projectId: 'production-project', emulatorHost: '127.0.0.1:8180' }));
  assert.throws(() => migration.createProgramDateDemoFirestore({ projectId: f.options.projectId, emulatorHost: 'example.test:8180' }));
  assert.equal(f.writes.length, 0);
}));
test('a blocker anywhere in a reviewed chunk refuses all mutation without picking an arbitrary owner', async () => privateStore(async store => {
  const f = storage(); currentScope(f); const old = sourceReceipt();
  f.put(f.op(f.legacyKey), old); f.put(f.op(H(['program', new Date(Date.parse(`${f.options.fromLocalDate}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)])), old);
  const manifest = await preview(f); assert.equal(manifest.items[0].action, 'blocked'); await store.put(manifest);
  await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, 0);
}));

test('native no-op receipt recreation cannot be adopted as the original immutable proof', async () => privateStore(async store => {
  const f = storage(), manifest = await preview(f); await store.put(manifest); await execution(f, manifest, store);
  const path = itemPath(f, manifest), original = copy(f.records.get(path));
  assert.equal(original.data.targetChanged, false); assert.equal(f.records.has(f.op(f.v2Key)), false);
  f.records.delete(path); f.put(path, original.data);
  const recreated = f.records.get(path);
  assert.equal(recreated.createTime.isEqual(original.createTime), false); assert.ok(recreated.createTime.isEqual(recreated.updateTime));
  const count = f.writes.length;
  await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, count);
}));

async function pendingItem(f, manifest, store) {
  let fired = 0;
  f.raw.afterCommit = staged => {
    if (!fired && staged.some(([, ref]) => ref.path === itemPath(f, manifest))) { fired++; throw new Error('Synthetic item ACK loss before seal'); }
  };
  await assert.rejects(execution(f, manifest, store), /Synthetic item ACK loss before seal/); assert.equal(fired, 1);
  f.raw.afterCommit = undefined;
}
test('final occurrence stays applying with one native-anchored pending receipt until mandatory seal', async () => privateStore(async store => {
  const f = storage(), manifest = await preview(f); await store.put(manifest); await pendingItem(f, manifest, store);
  const job = f.records.get(jobPath(f, manifest)), receipt = f.records.get(itemPath(f, manifest));
  assert.equal(job.data.status, 'applying'); assert.equal(job.data.nextIndex, 1); assert.equal(job.data.pendingReceiptIndex, 0);
  assert.deepEqual(job.data.receiptVersions, []); assert.ok(job.updateTime.isEqual(receipt.createTime)); assert.ok(job.updateTime.isEqual(receipt.updateTime));
  const result = await execution(f, manifest, store); assert.equal(result.chunkCompleted, true);
  const sealed = f.records.get(jobPath(f, manifest)).data;
  assert.equal(sealed.status, 'completed'); assert.equal(sealed.pendingReceiptIndex, null); assert.equal(sealed.receiptVersions.length, 1);
  assert.ok(sealed.receiptVersions[0].isEqual(receipt.createTime)); assert.equal(f.records.has(f.op(f.v2Key)), false);
}));
test('expired pending ownership transfers only atomically with the verified native seal', async t => privateStore(async store => {
  const f = storage(), manifest = await preview(f); await store.put(manifest); await pendingItem(f, manifest, store);
  const original = copy(f.records.get(jobPath(f, manifest))), receipt = copy(f.records.get(itemPath(f, manifest))), before = f.writes.length;
  assert.equal(original.data.pendingReceiptIndex, 0);
  const actualNow = Date.now, future = actualNow() + 120001;
  const clock = t.mock.method(Date, 'now', () => future);
  try {
    const result = await execution(f, manifest, store, { owner: 'replacement-owner' }); assert.equal(result.chunkCompleted, true);
    const job = f.records.get(jobPath(f, manifest)).data;
    assert.equal(job.owner, 'replacement-owner'); assert.equal(job.generation, original.data.generation + 1); assert.equal(job.pendingReceiptIndex, null);
    assert.deepEqual(job.receiptVersions, [receipt.createTime]);
    assert.deepEqual(f.writes.slice(before), [{ path: jobPath(f, manifest), kind: 'update' }]);
  } finally { clock.mock.restore(); }
}));
test('a different live pending owner cannot rewrite the native anchor before sealing', async () => privateStore(async store => {
  const f = storage(), manifest = await preview(f); await store.put(manifest); await pendingItem(f, manifest, store);
  const job = copy(f.records.get(jobPath(f, manifest))), before = f.writes.length;
  assert.equal(job.data.pendingReceiptIndex, 0);
  await assert.rejects(execution(f, manifest, store, { owner: 'foreign-live-owner' }));
  assert.deepEqual(f.records.get(jobPath(f, manifest)), job); assert.equal(f.writes.length, before);
}));
test('post-seal lost ACK resumes literal prefix without appending or applying twice', async () => privateStore(async store => {
  const f = storage(), manifest = await preview(f); await store.put(manifest); let fired = 0;
  f.raw.afterCommit = staged => {
    if (!fired && staged.some(([, ref, data]) => ref.path === jobPath(f, manifest) && data.pendingReceiptIndex === null && data.receiptVersions?.length === 1)) {
      fired++; throw new Error('Synthetic seal ACK loss');
    }
  };
  await assert.rejects(execution(f, manifest, store), /Synthetic seal ACK loss/); assert.equal(fired, 1);
  const original = copy(f.records.get(jobPath(f, manifest))), receipt = copy(f.records.get(itemPath(f, manifest))), before = f.writes.length;
  assert.deepEqual(original.data.receiptVersions, [receipt.createTime]); assert.equal(original.data.pendingReceiptIndex, null);
  assert.equal((await execution(f, manifest, store)).chunkCompleted, true); assert.equal(f.writes.length, before);
  assert.deepEqual(f.records.get(itemPath(f, manifest)), receipt); assert.deepEqual(f.records.get(jobPath(f, manifest)), original);
}));
for (const drift of ['pending receipt recreation', 'pending job anchor ABA']) test(`${drift} refuses seal and retains the unverified prefix`, async () => privateStore(async store => {
  const f = storage(), manifest = await preview(f); await store.put(manifest); await pendingItem(f, manifest, store);
  const path = drift === 'pending receipt recreation' ? itemPath(f, manifest) : jobPath(f, manifest), original = copy(f.records.get(path).data);
  assert.equal(f.records.get(jobPath(f, manifest)).data.pendingReceiptIndex, 0);
  if (drift === 'pending receipt recreation') f.records.delete(path); else f.put(path, { ...original, temporary: true }); f.put(path, original);
  const count = f.writes.length; await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, count);
}));
test('partial rollback first seals its pending commit and preserves every literal receipt through held state', async () => privateStore(async store => {
  const f = storage(); f.options.toLocalDate = '2026-10-20'; const manifest = await preview(f); await store.put(manifest); await pendingItem(f, manifest, store);
  const receipt = copy(f.records.get(itemPath(f, manifest))); assert.equal(f.records.get(jobPath(f, manifest)).data.pendingReceiptIndex, 0);
  const result = await migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'restore' }, f.db,
    { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' });
  assert.equal(result.status, 'rollback-held'); const job = f.records.get(jobPath(f, manifest)).data;
  assert.equal(job.nextIndex, 1); assert.equal(job.pendingReceiptIndex, null); assert.deepEqual(job.receiptVersions, [receipt.createTime]);
  assert.deepEqual(f.records.get(itemPath(f, manifest)), receipt); assert.equal(f.records.has(itemPath(f, manifest, 1)), false);
  assert.equal(f.records.has(f.op(f.v2Key)), false);
}));
test('empty manifest initializes closed completed seal state and still requires verified backup', async () => privateStore(async store => {
  const f = storage(); const raw = f.records.get(f.programPath).data;
  f.put(f.programPath, { ...raw, schedule: { ...raw.schedule, weekdays: [2] } }); const manifest = await preview(f); assert.equal(manifest.items.length, 0);
  await store.put(manifest); await execution(f, manifest, store); const job = f.records.get(jobPath(f, manifest)).data;
  assert.equal(job.status, 'completed'); assert.deepEqual(job.receiptVersions, []); assert.equal(job.pendingReceiptIndex, null);
}));

for (const drift of ['prior target ABA', 'prior sealed receipt recreation']) test(`next item transaction refuses ${drift} before any new occurrence write`, async () => privateStore(async store => {
  const f = storage(); f.options.toLocalDate = '2026-10-20';
  f.put(f.op(f.legacyKey), { status: 'sent' }); f.put(f.op(H(['program', '2026-10-20'])), { status: 'sent' });
  const manifest = await preview(f); assert.equal(manifest.items.length, 2); await store.put(manifest);
  let armed = false, fired = 0;
  f.raw.afterCommit = staged => {
    const job = f.records.get(jobPath(f, manifest))?.data;
    if (!staged.length && job?.nextIndex === 1 && job.pendingReceiptIndex === null && job.receiptVersions.length === 1) armed = true;
  };
  f.raw.beforeTransaction = () => {
    if (armed && !fired) {
      fired++;
      const path = drift === 'prior target ABA' ? f.op(f.v2Key) : itemPath(f, manifest), original = copy(f.records.get(path).data);
      if (drift === 'prior sealed receipt recreation') f.records.delete(path); else f.put(path, { ...original, temporary: true });
      f.put(path, original);
    }
  };
  await assert.rejects(execution(f, manifest, store)); assert.equal(fired, 1, 'drift must occur after seal readback and before the next actual transaction');
  const secondTarget = f.op(H(['program-start-v2', 'program', '2026-10-20']));
  assert.equal(f.records.has(secondTarget), false, 'invalid prior prefix must stop the next target mutation in that same transaction');
  assert.equal(f.records.has(itemPath(f, manifest, 1)), false);
  assert.equal(f.records.get(jobPath(f, manifest)).data.nextIndex, 1);
}));

test('production CLI mutation is refused before SDK initialization and key/backup filesystem reads', () => {
  const file = new URL('../migrate_program_notification_dates.mjs', import.meta.url);
  const sdk = require.resolve('firebase-admin/firestore'), app = require.resolve('firebase-admin/app');
  const args = baseArgs(); args[1] = 'production-hudhud-project';
  args.push('--apply', '--manifest', 'a'.repeat(64), '--backup-dir', '/not-a-real-backup', '--key-file', '/not-a-real-key', '--expires-at', String(Date.now() + 86400000), '--owner', 'operator');
  const script = `import { createRequire, syncBuiltinESMExports } from 'node:module'; import { fileURLToPath } from 'node:url';
    const require=createRequire(${JSON.stringify(new URL('../../functions/package.json', import.meta.url).href)}); let sdkCalls=0,fsCalls=0;
    const actual=require(${JSON.stringify(sdk)}); require.cache[${JSON.stringify(sdk)}].exports={...actual,Firestore:class{constructor(){sdkCalls++;throw Error('Unexpected SDK');}},getFirestore(){sdkCalls++;throw Error('Unexpected SDK');}};
    const admin=require(${JSON.stringify(app)}); require.cache[${JSON.stringify(app)}].exports={...admin,initializeApp(){sdkCalls++;throw Error('Unexpected SDK');}};
    const fs=require('node:fs/promises'); fs.lstat=async()=>{fsCalls++;throw Error('Unexpected filesystem');}; fs.open=async()=>{fsCalls++;throw Error('Unexpected filesystem');}; syncBuiltinESMExports();
    process.argv=[process.execPath,fileURLToPath(${JSON.stringify(file.href)}),...${JSON.stringify(args)}];
    process.on('beforeExit',()=>{if(sdkCalls!==0||fsCalls!==0)process.exitCode=97;}); await import(${JSON.stringify(file.href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.match(result.stderr, /^Program date migration stopped: /);
  assert.equal(result.stderr.includes('Unexpected'), false);
});
test('all malformed native seal checkpoints fail closed without implicit legacy defaults', async () => privateStore(async store => {
  const f = storage(), manifest = await preview(f); await store.put(manifest); await execution(f, manifest, store);
  const path = jobPath(f, manifest), original = copy(f.records.get(path).data);
  const malformed = [data => { delete data.receiptVersions; }, data => { delete data.pendingReceiptIndex; },
    data => { data.receiptVersions = [null]; }, data => { data.receiptVersions = [{ seconds: 1800000000, nanoseconds: 1 }]; },
    data => { data.receiptVersions = []; }, data => { data.receiptVersions = Array(26).fill(new Timestamp(1800000000, 1)); },
    data => { data.pendingReceiptIndex = 0; }, data => { data.status = 'applying'; }, data => { data.pendingReceiptIndex = '0'; },
    data => { data.extra = { syntheticContent: 'not-supported' }; }];
  for (const mutate of malformed) {
    const data = copy(original); mutate(data); f.put(path, data); const before = f.writes.length;
    await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, before); f.put(path, original);
  }
  assert.equal((await execution(f, manifest, store)).chunkCompleted, true);
}));
test('conditional held rollback rejects an external edit of a genuine no-op target without restoring any old value', async () => privateStore(async store => {
  const f = storage(); f.put(f.op(f.v2Key), { status: 'unknown' }); const manifest = await preview(f); await store.put(manifest); await execution(f, manifest, store);
  const before = copy(f.records.get(f.op(f.v2Key)).data); f.put(f.op(f.v2Key), { ...before, reason: 'delivery-uncertain' });
  const count = f.writes.length;
  await assert.rejects(migration.executeProgramNotificationDateMigration({ ...f.options, mode: 'restore' }, f.db,
    { manifest, store, reviewedHash: manifest.manifestHash, owner: 'demo-worker' }));
  assert.equal(f.writes.length, count); assert.equal(f.records.get(f.op(f.v2Key)).data.reason, 'delivery-uncertain');
}));
test('missing or expired encrypted backup blocks even an empty manifest before initial lease writes', async t => privateStore(async (store, config) => {
  const f = storage(), raw = f.records.get(f.programPath).data;
  f.put(f.programPath, { ...raw, schedule: { ...raw.schedule, weekdays: [2] } }); const manifest = await preview(f); await store.put(manifest);
  const now = Date.now(), clock = t.mock.method(Date, 'now', () => now + 86400000);
  try { await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, 0); }
  finally { clock.mock.restore(); }
  await rm(join(config.directory, `${manifest.manifestHash}.program-date-backup`));
  await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, 0);
}));
test('authenticated backup tampering and directory replacement stop before database mutation', async () => privateStore(async (store, config) => {
  const f = storage(), manifest = await preview(f); await store.put(manifest);
  const path = join(config.directory, `${manifest.manifestHash}.program-date-backup`), body = await readFile(path, 'utf8');
  const envelope = JSON.parse(body); envelope.ciphertext = Buffer.from('synthetic corrupt ciphertext').toString('base64'); await writeFile(path, JSON.stringify(envelope));
  await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, 0); await writeFile(path, body);
  const old = `${config.directory}-moved`; await rename(config.directory, old); await mkdir(config.directory, { mode: 0o700 });
  try { await assert.rejects(execution(f, manifest, store)); assert.equal(f.writes.length, 0); }
  finally { await rm(config.directory, { recursive: true, force: true }); await rename(old, config.directory); }
}));
test('program wire-review-4 retains decreasing hash order paired with ascending legacy dates', async () => {
  const f = storage(); const data = f.records.get(f.programPath).data;
  const id = 'wire-review-4', path = `HudHudDev/programs/programs/${id}`; f.put(path, data);
  const manifest = await migration.previewProgramNotificationDates({ ...f.options, programId: id, fromLocalDate: '2026-10-26', toLocalDate: '2026-10-26' }, f.db);
  assert.deepEqual(manifest.items[0].legacyDates, ['2026-10-26', '2026-10-27']);
  assert.deepEqual(manifest.items[0].legacy.map(item => item.key), ['67b46c21aaa6afb1c10f7093da14ec8379939090627bfa43e9ac6925f65f5601', '43d1a107e43ba6820e0eb364baa1cce52a99cbd662ec52f8177cd8a526125588']);
});

test('CLI key custody remains separate from the encrypted backup directory before SDK initialization', async () => privateStore(async (_store, config) => {
  const keyFile = join(config.directory, 'synthetic-private-key'); await writeFile(keyFile, config.key, { mode: 0o600 });
  const file = new URL('../migrate_program_notification_dates.mjs', import.meta.url), sdk = require.resolve('firebase-admin/firestore'), app = require.resolve('firebase-admin/app');
  const args = [...baseArgs(), '--dry-run', '--backup-dir', config.directory, '--key-file', keyFile, '--expires-at', String(config.expiresAt)];
  const script = `import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
    const require=createRequire(${JSON.stringify(new URL('../../functions/package.json', import.meta.url).href)}); let sdkCalls=0;
    const actual=require(${JSON.stringify(sdk)}); require.cache[${JSON.stringify(sdk)}].exports={...actual,Firestore:class{constructor(){sdkCalls++;throw Error('Unexpected SDK');}},getFirestore(){sdkCalls++;throw Error('Unexpected SDK');}};
    const admin=require(${JSON.stringify(app)}); require.cache[${JSON.stringify(app)}].exports={...admin,initializeApp(){sdkCalls++;throw Error('Unexpected SDK');}};
    process.argv=[process.execPath,fileURLToPath(${JSON.stringify(file.href)}),...${JSON.stringify(args)}];
    process.on('beforeExit',()=>{if(sdkCalls!==0)process.exitCode=97;}); await import(${JSON.stringify(file.href)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.match(result.stderr, /^Program date migration stopped: /);
  assert.equal(result.stderr.includes('Unexpected'), false);
}));
