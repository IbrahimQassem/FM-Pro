import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { buildSeedPlan, validateSeed } from '../firebase_seed/seed_contract.mjs';
import { applyProgramEpisodeImportPlan } from '../import_programs_and_episodes.mjs';
import { applyDevelopmentSeedPlan } from '../firebase_seed/seed.mjs';
import { migrateCanonicalCommentStatuses } from '../firebase_seed/migrate_comment_status.mjs';
import { applyAdminPreviewPlan } from '../seed-admin-preview.mjs';

// Setup-only write recorder: no count/fence decisions or arithmetic are modeled.
function writeRecorder({ existing = [] } = {}) {
  const writes = [], records = new Set(existing); let commits = 0;
  const firestore = { doc: path => ({ path }), batch: () => {
    const pending = [];
    return {
      create: (ref, data) => pending.push({ kind: 'create', path: ref.path, data }),
      set: (ref, data, options) => pending.push({ kind: 'set', path: ref.path, data, options }),
      update: (ref, data) => pending.push({ kind: 'update', path: ref.path, data }),
      commit: async () => {
        if (pending.some(write => write.kind === 'create' && records.has(write.path))) throw new Error('Synthetic duplicate create.');
        commits++; writes.push(...pending); for (const write of pending) records.add(write.path);
      },
    };
  } };
  firestore.runTransaction = async callback => {
    const staged = [];
    const tx = { get: async ref => { assert.equal(staged.length, 0, 'All reads precede writes.'); return { ref, exists: records.has(ref.path), data: () => ({}), get: () => undefined }; } };
    for (const kind of ['create', 'set', 'update']) tx[kind] = (ref, data, options) => staged.push({ kind, path: ref.path, data, ...(kind === 'set' ? { options } : {}) });
    const result = await callback(tx);
    if (staged.some(write => write.kind === 'create' && records.has(write.path))) throw new Error('Synthetic duplicate create.');
    commits++; writes.push(...staged); for (const write of staged) records.add(write.path);
    return result;
  };
  return { firestore, writes, commits: () => commits };
}
for (const relative of ['import_programs_and_episodes.mjs', 'firebase_seed/seed.mjs', 'firebase_seed/migrate_comment_status.mjs', 'seed-admin-preview.mjs']) {
  test(`setup: importing ${relative} executes no CLI, SDK initialization or source-data access`, () => {
    const target = new URL(`../${relative}`, import.meta.url).href;
    const code = `
      import fs from 'node:fs'; import promises from 'node:fs/promises'; import Module from 'node:module';
      const originalLoad = Module._load;
      Module._load = function(name, ...args) { if (/firebase-admin|google-cloud\\/firestore/.test(name)) throw new Error('Unexpected SDK load.'); return originalLoad.call(this, name, ...args); };
      for (const [owner, key] of [[fs, 'readFileSync'], [promises, 'readFile']]) {
        const original = owner[key]; owner[key] = function(path, ...args) {
          if (/\\.xlsx|development_seed\\.json|\\.env|credential|secret/i.test(String(path))) throw new Error('Unexpected administrative data read.');
          return original.call(this, path, ...args);
        };
      }
      process.argv = ['node', '/synthetic/non-entry.mjs', '--apply', '--project', 'invalid-import-scope'];
      process.env.GCLOUD_PROJECT = 'invalid-import-scope'; process.env.FIRESTORE_EMULATOR_HOST = '';
      await import(${JSON.stringify(target)});
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr); assert.equal(result.stdout, ''); assert.equal(result.stderr, '');
  });
}
test('setup: extracted spreadsheet writer retains ordered merge batches and stations-only boundary', async () => {
  const f = writeRecorder(), input = { firestore: f.firestore, root: 'HudHudDev', stationsToCreate: new Map(), stationProgramsCount: new Map(),
    resolvedPrograms: [{ id: 'p', data: { title: 'Synthetic program' } }], resolvedEpisodes: [], log: () => {} };
  await applyProgramEpisodeImportPlan(input);
  assert.deepEqual(f.writes, [{ kind: 'set', path: 'HudHudDev/programs/programs/p', data: input.resolvedPrograms[0].data, options: { merge: true } }]);
  assert.equal(f.commits(), 1);
  const stations = writeRecorder();
  await applyProgramEpisodeImportPlan({ ...input, firestore: stations.firestore, stationsOnly: true, stationsToCreate: new Map([['s', { name: 'Synthetic', stats: { programsCount: 9 } }]]) });
  assert.equal(stations.writes.length, 1); assert.equal(stations.writes[0].path, 'HudHudDev/stations/stations/s');
  assert.equal(stations.writes[0].data.stats.programsCount, 0);
});
test('setup: extracted development seed preserves create-only all-or-nothing behavior', async () => {
  const entries = [{ path: 'HudHudDev/programs/programs/a', data: { title: 'Synthetic' } }, { path: 'HudHudDev/programs/programs/b', data: { title: 'Synthetic' } }];
  const conflict = writeRecorder({ existing: [entries[1].path] });
  await assert.rejects(applyDevelopmentSeedPlan({ firestore: conflict.firestore, entries, stationCountUpdates: [] }), /duplicate create/);
  assert.equal(conflict.commits(), 0); assert.deepEqual(conflict.writes, []);
  const f = writeRecorder(); await applyDevelopmentSeedPlan({ firestore: f.firestore, entries, stationCountUpdates: [{ path: 'HudHudDev/stations/stations/s', count: 2 }] });
  assert.equal(f.commits(), 1); assert.deepEqual(f.writes.map(write => write.kind), ['create', 'create', 'update']);
  assert.deepEqual(f.writes[2].data, { 'stats.programsCount': 2 });
});
test('setup: extracted status migration retains dry-run and canonical Dev-only filtering', async () => {
  const db = producerStorage(), root = 'HudHudDev'; await acceptedEpisode(db, root);
  for (const target of [root, 'HudHudOfficial', 'Other']) db.seed(`${target}/episodes/episodes/e/comments/c`, {});
  const logs = [], before = db.writes.length;
  await migrateCanonicalCommentStatuses({ firestore: db, log: line => logs.push(line) });
  assert.equal(db.writes.length, before); assert.ok(logs.includes('Dry run only. Re-run with --apply to migrate.'));
  await migrateCanonicalCommentStatuses({ firestore: db, shouldApply: true, log: () => {} });
  const commentWrites = db.writes.slice(before).filter(write => write.path.includes('/comments/')).map(({ kind, path, data }) => ({ kind, path, data }));
  assert.deepEqual(commentWrites, [{ kind: 'update', path: 'HudHudDev/episodes/episodes/e/comments/c', data: { status: 'published' } }]);
  assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 1);
  assert.equal(db.snapshot('HudHudOfficial/episodes/episodes/e/comments/c').get('status'), undefined);
  assert.equal(db.snapshot('Other/episodes/episodes/e/comments/c').get('status'), undefined);
});
test('setup: extracted preview plan preserves one ordered atomic commit and exact unrelated payloads', async () => {
  const f = writeRecorder(), entries = [{ path: 'HudHudDev/banners/banners/a', data: { title: 'Synthetic', isActive: true } }];
  await applyAdminPreviewPlan({ firestore: f.firestore, entries });
  assert.equal(f.commits(), 1); assert.deepEqual(f.writes, [{ kind: 'set', ...entries[0], options: undefined }]);
});

// Real existing count helpers plus storage-only SDK batch compatibility; no ledger arithmetic is copied.
import { MemoryFirestore, FieldValue, Timestamp } from '../../functions/test/support/comment-count-fixture.js';
import { prepareNewEpisodeCountBaseline, reconcileCommentCount } from '../../functions/lib/comment-counts.js';
function producerStorage() {
  const db = new MemoryFirestore('demo-hudhud-producer-unit', { fineMetadata: true });
  db.batch = () => {
    const operations = [];
    const batch = {};
    for (const kind of ['create', 'set', 'update', 'delete']) batch[kind] = (ref, data, options) => { operations.push({ kind, ref, data, options }); return batch; };
    batch.commit = () => db.runTransaction(async tx => {
      const before = await Promise.all(operations.map(item => tx.get(item.ref)));
      for (let i = 0; i < operations.length; i++) {
        if (operations[i].kind === 'create' && before[i].exists) throw new Error('Synthetic duplicate create.');
        if (operations[i].kind === 'update' && !before[i].exists) throw new Error('Synthetic missing update target.');
      }
      const flattened = (value, prefix = '', output = {}) => {
        for (const [key, entry] of Object.entries(value)) {
          const field = prefix ? `${prefix}.${key}` : key;
          if (entry && Object.getPrototypeOf(entry) === Object.prototype && Object.keys(entry).length) flattened(entry, field, output);
          else output[field] = entry;
        }
        return output;
      };
      for (let i = 0; i < operations.length; i++) {
        const item = operations[i];
        if (item.kind === 'set' && item.options?.merge && before[i].exists) tx.update(item.ref, flattened(item.data));
        else tx[item.kind](item.ref, item.data, item.options);
      }
    });
    return batch;
  };
  return db;
}
const episodePath = root => `${root}/episodes/episodes/e`;
const commentPath = root => `${episodePath(root)}/comments/c`;
const baselinePath = root => `${root}/commentCountContributions/episodes/e`;
const producerFence = state => ({ version: 1, state, generation: 3, owner: 'count-owner', planHash: 'a'.repeat(64),
  leaseUntil: 0, writerProtocol: 1, activeFrom: new Timestamp(1700000000, 123000), baselineManifestHash: 'b'.repeat(64) });
const episodeData = count => ({ title: 'Synthetic', programId: 'p', stationId: 's', stats: { commentsCount: count, playsCount: 4 } });
async function invokeProducer(kind, db, root, data = episodeData(0)) {
  if (kind === 'import') return applyProgramEpisodeImportPlan({ firestore: db, root, stationsToCreate: new Map(), stationProgramsCount: new Map(), resolvedPrograms: [], resolvedEpisodes: [{ id: 'e', data }], FieldValue, log: () => {} });
  if (kind === 'preview') return applyAdminPreviewPlan({ firestore: db, entries: [{ path: episodePath(root), data }] });
  if (kind === 'seed') return applyDevelopmentSeedPlan({ firestore: db, entries: [{ path: episodePath(root), data }, { path: commentPath(root), data: { status: 'published' } }], stationCountUpdates: [] });
  return migrateCanonicalCommentStatuses({ firestore: db, shouldApply: true, log: () => {} });
}
async function acceptedEpisode(db, root) {
  db.seed(`${root}/commentCountContributions`, producerFence('active'));
  await db.runTransaction(async tx => {
    const baseline = await prepareNewEpisodeCountBaseline(tx, db, { root, episodeId: 'e', serverTimestamp: () => FieldValue.serverTimestamp() });
    tx.create(db.doc(episodePath(root)), episodeData(0)); for (const write of baseline.writes) write();
  });
}
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  for (const kind of ['import', 'preview']) {
    test(`R12: ${root} ${kind} preserves the existing authority-owned count`, async () => {
      const db = producerStorage(); db.seed(episodePath(root), episodeData(7));
      await invokeProducer(kind, db, root);
      assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 7, 'Existing count7 must survive administrative episode metadata writes.');
    });
    test(`R12: ${root} active ${kind} creates a legitimate native birth baseline`, async () => {
      const db = producerStorage(); db.seed(`${root}/commentCountContributions`, producerFence('active'));
      await invokeProducer(kind, db, root);
      const episode = db.snapshot(episodePath(root)), baseline = db.snapshot(baselinePath(root));
      assert.equal(baseline.exists, true, 'An active canonical birth requires an atomic accepted baseline, not a lazy-zero event fallback.');
      assert.equal(episode.get('stats.commentsCount'), 0); assert.equal(baseline.get('origin'), 'creation');
      assert.equal(baseline.updateTime.isEqual(episode.createTime), true);
      assert.equal(Object.hasOwn(baseline.data(), 'episodeCreateTime'), false);
      db.seed(commentPath(root), { status: 'published' });
      await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'c' });
      await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'c' });
      assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 1);
    });
  }
  for (const kind of ['import', 'preview', ...(root === 'HudHudDev' ? ['seed', 'status'] : [])]) {
    test(`R12: ${root} paused ${kind} refuses every actual episode/comment mutation`, async () => {
      const db = producerStorage();
      if (kind !== 'seed') { await acceptedEpisode(db, root); if (kind === 'status') db.seed(commentPath(root), { text: 'Synthetic' }); }
      db.seed(`${root}/commentCountContributions`, producerFence('paused'));
      const writes = db.writes.length, before = [...db.records];
      await assert.rejects(invokeProducer(kind, db, root), error => error?.code === 'failed-precondition' && error?.details?.reason === 'comment-count-maintenance',
        'Expired pause never licenses the existing administrative writer to mutate episode/comment state.');
      assert.equal(db.writes.length, writes); assert.deepEqual([...db.records], before);
    });
  }
}
test('R12: active status migration atomically publishes and counts through the authority once', async () => {
  const db = producerStorage(), root = 'HudHudDev'; await acceptedEpisode(db, root); db.seed(commentPath(root), { text: 'Synthetic' });
  await invokeProducer('status', db, root);
  assert.equal(db.snapshot(commentPath(root)).get('status'), 'published');
  assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 1, 'Status migration must not leave the accepted published contribution uncounted.');
  await invokeProducer('status', db, root); await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'c' });
  assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 1);
});
for (const state of ['absent', 'malformed']) test(`R12: ${state} baseline readiness refuses count-aware status migration atomically`, async () => {
  const db = producerStorage(), root = 'HudHudDev'; db.seed(episodePath(root), episodeData(0)); db.seed(commentPath(root), { text: 'Synthetic' });
  if (state === 'malformed') db.seed(`${root}/commentCountContributions`, { ...producerFence('active'), version: 99 });
  const before = [...db.records], writes = db.writes.length;
  await assert.rejects(invokeProducer('status', db, root), error => error?.code === 'failed-precondition',
    'Root absence is legacy normal operation, not a count-aware status baseline or permission to guess.');
  assert.equal(db.writes.length, writes); assert.deepEqual([...db.records], before);
});
test('R12 control: development seed duplicate is atomic and cannot overwrite an existing episode/count', async () => {
  const db = producerStorage(), root = 'HudHudDev'; db.seed(episodePath(root), episodeData(7));
  const before = [...db.records], writes = db.writes.length;
  await assert.rejects(applyDevelopmentSeedPlan({ firestore: db, entries: [{ path: 'HudHudDev/programs/programs/new', data: { title: 'Synthetic' } }, { path: episodePath(root), data: episodeData(0) }], stationCountUpdates: [] }), /duplicate create/);
  assert.equal(db.writes.length, writes); assert.deepEqual([...db.records], before);
});

test('R12: active full development seed creates zero/native birth and canonical comments before authority convergence', async () => {
  const db = producerStorage(), root = 'HudHudDev'; db.seed(`${root}/commentCountContributions`, producerFence('active'));
  await invokeProducer('seed', db, root);
  const episode = db.snapshot(episodePath(root)), baseline = db.snapshot(baselinePath(root)), comment = db.snapshot(commentPath(root));
  assert.equal(episode.get('stats.commentsCount'), 0, 'Seed must not pre-count or fabricate native contribution versions.');
  assert.equal(baseline.exists, true, 'Active full seed requires the real same-commit native birth baseline.');
  assert.equal(baseline.updateTime.isEqual(episode.createTime), true); assert.equal(comment.createTime.isEqual(episode.createTime), true);
  assert.equal(db.snapshot(`${baselinePath(root)}/contributions/c`).exists, false);
  await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'c' });
  await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'c' });
  assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 1);
});
test('R12: active comment-only seed plan refuses an unaccepted existing episode before comment creation', async () => {
  const db = producerStorage(), root = 'HudHudDev'; db.seed(`${root}/commentCountContributions`, producerFence('active')); db.seed(episodePath(root), episodeData(7));
  const before = [...db.records], writes = db.writes.length;
  await assert.rejects(applyDevelopmentSeedPlan({ firestore: db, entries: [{ path: commentPath(root), data: { status: 'published' } }], stationCountUpdates: [] }),
    error => error?.code === 'failed-precondition', 'An active root alone cannot authorize engagement writes against an unaccepted episode.');
  assert.equal(db.writes.length, writes); assert.deepEqual([...db.records], before);
});
test('R12 control: accepted comment-only seed plan preserves the counter and fresh authority work converges once', async () => {
  const db = producerStorage(), root = 'HudHudDev'; await acceptedEpisode(db, root);
  db.seed(`${episodePath(root)}/comments/old`, { status: 'published' }); await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'old' });
  assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 1);
  await applyDevelopmentSeedPlan({ firestore: db, entries: [{ path: commentPath(root), data: { status: 'published' } }], stationCountUpdates: [] });
  assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 1, 'Engagement writes do not reset or pre-increment the authority-owned count.');
  await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'c' });
  await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'c' });
  assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 2);
});
test('R12: count pause before seed commit refuses the entire staged create-only batch', async () => {
  const db = producerStorage(), root = 'HudHudDev'; db.seed(`${root}/commentCountContributions`, producerFence('active'));
  const transaction = db.runTransaction.bind(db);
  db.runTransaction = callback => { db.seed(`${root}/commentCountContributions`, producerFence('paused')); return transaction(callback); };
  const writes = db.writes.length;
  await assert.rejects(invokeProducer('seed', db, root), error => error?.code === 'failed-precondition',
    'An earlier active observation cannot license a seed commit that begins under pause.');
  assert.equal(db.writes.length, writes); assert.equal(db.snapshot(episodePath(root)).exists, false); assert.equal(db.snapshot(commentPath(root)).exists, false);
});

test('R12 guard: status validation exhausts bounded pages and rejects a late invalid value before every write', async () => {
  const db = producerStorage(), root = 'HudHudDev'; await acceptedEpisode(db, root);
  for (let i = 0; i < 106; i++) db.seed(`${episodePath(root)}/comments/c${String(i).padStart(3, '0')}`, i === 105 ? { status: 'invalid-status' } : {});
  const writes = db.writes.length;
  await assert.rejects(invokeProducer('status', db, root), /1 comments have invalid status values/);
  assert.equal(db.writes.length, writes); assert.equal(db.snapshot(`${episodePath(root)}/comments/c000`).get('status'), undefined);
  const pages = db.reads.filter(read => read.group === 'comments');
  assert.ok(pages.length >= 5); assert.ok(pages.every(read => read.size <= 25));
});
test('R12 guard: more than100 valid statuses migrate through bounded pages and real authority exactly once', async () => {
  const db = producerStorage(), root = 'HudHudDev'; await acceptedEpisode(db, root);
  for (let i = 0; i < 106; i++) db.seed(`${episodePath(root)}/comments/c${String(i).padStart(3, '0')}`, {});
  await invokeProducer('status', db, root); assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 106);
  const writes = db.writes.length; await invokeProducer('status', db, root); assert.equal(db.writes.length, writes);
  assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 106);
  assert.ok(db.reads.filter(read => read.group === 'comments').every(read => read.size <= 25));
});
test('R12 guard: status migration reads current terminal decision instead of overwriting it after validation', async () => {
  const db = producerStorage(), root = 'HudHudDev'; await acceptedEpisode(db, root); db.seed(commentPath(root), {});
  const transaction = db.runTransaction.bind(db); let changed = false;
  db.runTransaction = callback => { if (!changed) { changed = true; db.seed(commentPath(root), { status: 'removed' }); } return transaction(callback); };
  await invokeProducer('status', db, root);
  assert.equal(db.snapshot(commentPath(root)).get('status'), 'removed'); assert.equal(db.snapshot(episodePath(root)).get('stats.commentsCount'), 0);
});
test('R12 guard: active seed counts added native baseline writes before its atomic capacity limit', async () => {
  const db = producerStorage(), root = 'HudHudDev'; db.seed(`${root}/commentCountContributions`, producerFence('active'));
  const entries = Array.from({ length: 251 }, (_, i) => ({ path: `${root}/episodes/episodes/e${String(i).padStart(3, '0')}`, data: episodeData(0) }));
  await assert.rejects(applyDevelopmentSeedPlan({ firestore: db, entries, stationCountUpdates: [] }), error => error?.code === 'invalid-argument');
  assert.equal(db.writes.length, 0); assert.equal(db.snapshot(entries[0].path).exists, false);
});
test('R12 guard: active import chunks include native baseline writes within the transaction budget', async () => {
  const db = producerStorage(), root = 'HudHudOfficial'; db.seed(`${root}/commentCountContributions`, producerFence('active'));
  const sizes = []; db.afterCommit = async writes => sizes.push(writes.length);
  const episodes = Array.from({ length: 451 }, (_, i) => ({ id: `e${String(i).padStart(3, '0')}`, data: episodeData(0) }));
  await applyProgramEpisodeImportPlan({ firestore: db, root, stationsToCreate: new Map(), stationProgramsCount: new Map(), resolvedPrograms: [], resolvedEpisodes: episodes, FieldValue, log: () => {} });
  assert.deepEqual(sizes, [450, 450, 2]);
  assert.equal(db.snapshot(`${root}/commentCountContributions/episodes/e450`).exists, true);
});
test('R12 guard: expanded preview plan rejects capacity overflow without splitting its atomic commit', async () => {
  const db = producerStorage(), root = 'HudHudDev'; db.seed(`${root}/commentCountContributions`, producerFence('active'));
  const entries = Array.from({ length: 251 }, (_, i) => ({ path: `${root}/episodes/episodes/e${String(i).padStart(3, '0')}`, data: episodeData(0) }));
  await assert.rejects(applyAdminPreviewPlan({ firestore: db, entries }), error => error?.code === 'invalid-argument');
  assert.equal(db.writes.length, 0); assert.equal(db.snapshot(entries[0].path).exists, false);
});
test('R12 guard: development seed rejects foreign-root entries before any transaction write', async () => {
  const db = producerStorage(); await assert.rejects(applyDevelopmentSeedPlan({ firestore: db, entries: [{ path: 'HudHudOfficial/episodes/episodes/e', data: episodeData(0) }], stationCountUpdates: [] }), error => error?.code === 'invalid-argument');
  assert.equal(db.writes.length, 0);
});
for (const contentOnly of [false, true]) test(`R12 guard: actual ${contentOnly ? 'content' : 'full'} seed plan creates native zero births then real authority converges`, async () => {
  const seed = JSON.parse(await readFile(new URL('../firebase_seed/development_seed.json', import.meta.url), 'utf8')); validateSeed(seed);
  const plan = buildSeedPlan(seed, { contentOnly }), db = producerStorage(), root = 'HudHudDev'; db.seed(`${root}/commentCountContributions`, producerFence('active'));
  if (contentOnly) for (const station of seed.stations) db.seed(`${root}/stations/stations/${station.id}`, station.data);
  const commits = []; db.afterCommit = async writes => commits.push(writes.length);
  await applyDevelopmentSeedPlan({ firestore: db, ...plan });
  assert.equal(commits.length, 1); assert.equal(commits[0], plan.entries.length + plan.stationCountUpdates.length + seed.episodes.length);
  for (const episode of seed.episodes) {
    const path = `${root}/episodes/episodes/${episode.id}`, baseline = db.snapshot(`${root}/commentCountContributions/episodes/${episode.id}`);
    assert.equal(db.snapshot(path).get('stats.commentsCount'), 0); assert.equal(baseline.updateTime.isEqual(db.snapshot(path).createTime), true);
  }
  for (const comment of seed.comments) {
    await reconcileCommentCount({ firestore: db, root, episodeId: comment.data.episodeId, commentId: comment.id });
    await reconcileCommentCount({ firestore: db, root, episodeId: comment.data.episodeId, commentId: comment.id });
  }
  for (const episode of seed.episodes) assert.equal(db.snapshot(`${root}/episodes/episodes/${episode.id}`).get('stats.commentsCount'), seed.comments.filter(comment => comment.data.episodeId === episode.id && comment.data.status === 'published').length);
});
test('R12 guard: actual engagement-only CLI plan remains favorites/subscriptions and unrelated to count pause', async () => {
  const seed = JSON.parse(await readFile(new URL('../firebase_seed/development_seed.json', import.meta.url), 'utf8'));
  const plan = buildSeedPlan(seed, { engagementOnly: true }), db = producerStorage(); db.seed('HudHudDev/commentCountContributions', producerFence('paused'));
  assert.ok(plan.entries.length > 0); assert.ok(plan.entries.every(entry => /\/users\/users\/[^/]+\/(favorites|subscriptions)\/[^/]+$/.test(entry.path)));
  await applyDevelopmentSeedPlan({ firestore: db, ...plan }); assert.equal(db.writes.length, plan.entries.length);
});
