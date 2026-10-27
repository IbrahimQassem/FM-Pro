import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MemoryFirestore, FieldValue, Timestamp } from './support/comment-count-fixture.js';
import { prepareNewEpisodeCountBaseline, prepareCommentCountMutation, reconcileCommentCount, resolveEpisodeCountBaseline, materializeEpisodeCountBaseline, materializeCommentCountContribution } from '../lib/comment-counts.js';
import { readCommentCountFence, nativeTimestamp } from '../lib/comment-count-maintenance.js';
const stamp = () => FieldValue.serverTimestamp();
async function fixture(root = 'HudHudDev', { fineMetadata = false } = {}) {
  const db = new MemoryFirestore('demo-hudhud-count-unit', { fineMetadata }), episode = `${root}/episodes/episodes/episode`, baseline = `${root}/commentCountContributions/episodes/episode`;
  const fence = { version: 1, writerProtocol: 1, state: 'active', generation: 7, owner: 'unit-owner', planHash: 'a'.repeat(64),
    leaseUntil: 0, activeFrom: stamp(), baselineManifestHash: 'b'.repeat(64) };
  db.seed(`${root}/commentCountContributions`, fence);
  const create = () => db.runTransaction(async tx => {
    const prepared = await prepareNewEpisodeCountBaseline(tx, db, { root, episodeId: 'episode', serverTimestamp: stamp });
    tx.create(db.doc(episode), { stationId: 'station', programId: 'program', stats: { commentsCount: 0, playsCount: 9 } });
    for (const write of prepared.writes) write();
  });
  await create();
  const comment = id => `${episode}/comments/${id}`, ledger = id => `${baseline}/contributions/${id}`;
  const sync = id => reconcileCommentCount({ firestore: db, root, episodeId: 'episode', commentId: id });
  const mutate = (id, action, changes) => db.runTransaction(async tx => {
    const result = await prepareCommentCountMutation(tx, db, { root, episodeId: 'episode', commentId: id, action, changes, serverTimestamp: stamp });
    for (const write of result.writes) write(); return result.delta;
  });
  return { db, root, episode, baseline, comment, ledger, sync, mutate, create };
}
for (const root of ['HudHudDev', 'HudHudOfficial']) {
  test(`${root}: native creation commit and opaque baseline generation bind canonical zero`, async () => {
    const f = await fixture(root), episode = f.db.snapshot(f.episode), baseline = f.db.snapshot(f.baseline);
    assert.equal(episode.createTime.isEqual(baseline.updateTime), true);
    assert.equal(baseline.data().generation.length > 0, true); assert.equal(episode.get('stats.commentsCount'), 0);
    assert.equal(baseline.data().state, 'active');
  });
  test(`${root}: duplicate/concurrent fresh-state creates count once and status/delete retain tombstones`, async () => {
    const f = await fixture(root); f.db.seed(f.comment('c'), { status: 'published', content: 'Synthetic' });
    await Promise.all([f.sync('c'), f.sync('c')]); assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 1);
    assert.equal(await f.mutate('c', 'update', { status: 'hidden' }), -1);
    await f.sync('c'); assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 0);
    assert.equal(await f.mutate('c', 'delete'), 0); await f.sync('c');
    assert.equal(f.db.snapshot(f.ledger('c')).get('contribution'), 0); assert.equal(f.db.snapshot(f.comment('c')).exists, false);
    assert.equal(f.db.snapshot(f.episode).get('stats.playsCount'), 9);
  });
  test(`${root}: reordered create/delete delivery sees fresh state and never double subtracts`, async () => {
    const f = await fixture(root); f.db.seed(f.comment('c'), { status: 'published' }); await f.sync('c');
    await f.mutate('c', 'delete'); await Promise.all([f.sync('c'), f.sync('c')]);
    assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 0);
  });
  test(`${root}: root lease generation changes do not invalidate accepted data generation`, async () => {
    const f = await fixture(root), before = f.db.snapshot(f.baseline).get('generation');
    f.db.seed(`${root}/commentCountContributions`, { ...f.db.snapshot(`${root}/commentCountContributions`).data(), generation: 100 });
    f.db.seed(f.comment('c'), { status: 'published' }); await f.sync('c');
    assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 1); assert.equal(f.db.snapshot(f.baseline).get('generation'), before);
  });
  test(`${root}: unknown commit acknowledgement resumes from atomic contribution without double addition`, async () => {
    const f = await fixture(root); f.db.seed(f.comment('c'), { status: 'published' });
    f.db.afterCommit = () => { f.db.afterCommit = null; throw new Error('Synthetic lost ACK'); };
    await assert.rejects(f.sync('c'), /lost ACK/); await f.sync('c');
    assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 1);
  });
  test(`${root}: negative result and missing baseline fail atomically rather than clamp or lazy zero`, async () => {
    const f = await fixture(root); f.db.seed(f.comment('c'), { status: 'published' }); await f.sync('c');
    f.db.seed(f.episode, { ...f.db.snapshot(f.episode).data(), stats: { commentsCount: 0 } });
    const before = f.db.writes.length;
    await assert.rejects(f.mutate('c', 'delete'), { code: 'failed-precondition' });
    assert.equal(f.db.snapshot(f.comment('c')).exists, true); assert.equal(f.db.writes.length, before);
    f.db.records.delete(f.baseline); await assert.rejects(f.sync('c'), { code: 'failed-precondition' });
  });
  test(`${root}: deleted/recreated parent never inherits an old contribution identity`, async () => {
    const f = await fixture(root); f.db.seed(f.comment('c'), { status: 'published' }); await f.sync('c');
    const before = f.db.snapshot(f.episode).createTime;
    await f.db.doc(f.comment('c')).delete(); await f.db.doc(f.episode).delete(); await f.create();
    assert.equal(f.db.snapshot(f.episode).createTime.isEqual(before), false);
    f.db.seed(f.comment('c'), { status: 'published' }); await f.sync('c');
    assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 1);
    assert.equal(f.db.snapshot(f.ledger('c')).data().episodeCreateTime.isEqual(f.db.snapshot(f.episode).createTime), true);
  });
  test(`${root}: missing parent is not recreated and orphan children refuse new empty identity`, async () => {
    const f = await fixture(root); f.db.seed(f.comment('c'), { status: 'published' });
    await f.db.doc(f.episode).delete(); assert.equal((await f.sync('c')).missing, true);
    assert.equal(f.db.snapshot(f.episode).exists, false); await assert.rejects(f.create());
  });
}
test('absent root remains legacy for normal guards but count-aware mutation retries without writes', async () => {
  const f = await fixture(); f.db.records.delete('HudHudDev/commentCountContributions');
  assert.equal((await f.db.runTransaction(tx => readCommentCountFence(tx, f.db, f.root))).mode, 'legacy');
  const before = f.db.writes.length;
  await assert.rejects(f.sync('c'), error => error.retryable && error.details.reason === 'comment-count-maintenance');
  assert.equal(f.db.writes.length, before);
});
for (const change of [{ state: 'paused', leaseUntil: 0 }, { version: 99 }, { generation: 0 }, { owner: ' padded ' },
  { leaseUntil: '0' }, { activeFrom: { seconds: 1800000000, nanoseconds: 0 } }, { writerProtocol: 2 }]) {
  test(`unready fence ${JSON.stringify(change)} denies status and arithmetic atomically`, async () => {
    const f = await fixture(), path = 'HudHudDev/commentCountContributions';
    f.db.seed(path, { ...f.db.snapshot(path).data(), ...change }); f.db.seed(f.comment('c'), { status: 'published' });
    const before = f.db.writes.length; await assert.rejects(f.mutate('c', 'update', { status: 'hidden' }));
    assert.equal(f.db.snapshot(f.comment('c')).get('status'), 'published'); assert.equal(f.db.writes.length, before);
  });
}
test('native Timestamp structural validation preserves exact nanos and rejects maps/out-of-range components', () => {
  const value = new Timestamp(1800000000, 123456789); assert.equal(nativeTimestamp(value).nanoseconds, 123456789);
  assert.equal(nativeTimestamp({ seconds: value.seconds, nanoseconds: value.nanoseconds }), null);
});
test('authorized orphan comment deletion removes personal data without recreating a missing episode', async () => {
  const f = await fixture(); f.db.seed(f.comment('orphan'), { status: 'published', content: 'Synthetic personal comment' });
  await f.db.doc(f.episode).delete(); const before = f.db.writes.length;
  await f.mutate('orphan', 'delete');
  assert.equal(f.db.snapshot(f.comment('orphan')).exists, false, 'Authorized cleanup must not leave orphan comment data.');
  assert.equal(f.db.snapshot(f.episode).exists, false);
  assert.equal(f.db.writes.slice(before).some(write => write.path === f.episode), false);
});
test('count event entry ignores unknown roots without reaching storage', async () => {
  const { handleCommentCountWritten } = await import('../lib/comment-counts.js');
  const result = await handleCommentCountWritten({ root: 'UnrelatedRoot', episodeId: 'e', commentId: 'c',
    firestore: { runTransaction: () => assert.fail('Unknown root reached storage') } });
  assert.equal(result, null);
});

test('native episode birth identity accepts finer metadata than millisecond server transform', async () => {
  const db = new MemoryFirestore('demo-hudhud-fine-identity', { fineMetadata: true }), root = 'HudHudDev';
  db.seed(`${root}/commentCountContributions`, { version: 1, writerProtocol: 1, state: 'active', generation: 1, owner: 'unit', planHash: 'a'.repeat(64),
    leaseUntil: 0, activeFrom: FieldValue.serverTimestamp(), baselineManifestHash: 'b'.repeat(64) });
  await db.runTransaction(async tx => {
    const prepared = await prepareNewEpisodeCountBaseline(tx, db, { root, episodeId: 'e', serverTimestamp: () => FieldValue.serverTimestamp() });
    tx.create(db.doc(`${root}/episodes/episodes/e`), { stats: { commentsCount: 0 } }); for (const write of prepared.writes) write();
  });
  db.seed(`${root}/episodes/episodes/e/comments/c`, { status: 'published' });
  const result = await reconcileCommentCount({ firestore: db, root, episodeId: 'e', commentId: 'c' }).then(value => ({ value }), error => ({ error }));
  assert.equal(result.error, undefined, 'A genuine same-transaction birth must bind exact native metadata, not assume REQUEST_TIME precision.');
  assert.equal(db.snapshot(`${root}/episodes/episodes/e`).get('stats.commentsCount'), 1);
});

test('genuine no-op comment writes retain their version and use observed-before receipt fast path', async () => {
  const f = await fixture('HudHudDev', { fineMetadata: true });
  f.db.seed(f.comment('c'), { status: 'published', moderatedAt: stamp() }); await f.sync('c');
  const before = f.db.snapshot(f.comment('c')).updateTime;
  await f.mutate('c', 'update', { status: 'published', moderatedAt: stamp() });
  const current = f.db.snapshot(f.comment('c')), row = f.db.snapshot(f.ledger('c'));
  assert.equal(current.updateTime.isEqual(before), true); assert.equal(row.get('commentMutation'), true);
  assert.equal(row.get('commentVersion').isEqual(before), true); assert.equal(row.updateTime.isEqual(before), false);
  const writes = f.db.writes.length; await f.sync('c'); assert.equal(f.db.writes.length, writes);
  assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 1);
});
test('native mutation receipt resolves newer exact comment commit while retaining literal preimage version', async () => {
  const f = await fixture('HudHudDev', { fineMetadata: true }); f.db.seed(f.comment('c'), { status: 'published' }); await f.sync('c');
  const before = f.db.snapshot(f.comment('c')).updateTime;
  await f.mutate('c', 'update', { status: 'hidden', moderatedAt: stamp() });
  const row = f.db.snapshot(f.ledger('c')), comment = f.db.snapshot(f.comment('c'));
  assert.equal(row.get('commentVersion').isEqual(before), true); assert.equal(row.updateTime.isEqual(comment.updateTime), true);
  assert.equal(row.get('commentMutation'), true);
  const writes = f.db.writes.length; await f.sync('c'); assert.equal(f.db.writes.length, writes);
  assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 0);
});
test('legitimate newer status and deletion versions recompute fresh delta instead of rejecting old receipt mismatch', async () => {
  const f = await fixture('HudHudOfficial', { fineMetadata: true }); f.db.seed(f.comment('c'), { status: 'published' }); await f.sync('c');
  await f.mutate('c', 'update', { status: 'hidden' });
  await f.db.doc(f.comment('c')).update({ status: 'published' }); await f.sync('c');
  assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 1);
  assert.equal(f.db.snapshot(f.ledger('c')).get('commentMutation'), false);
  await f.db.doc(f.comment('c')).delete(); await f.sync('c');
  assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 0);
  assert.equal(f.db.snapshot(f.ledger('c')).get('commentVersion'), null);
});
test('creation receipt rewrites fail closed and verified conversion persists explicit native baseline identity', async () => {
  const f = await fixture('HudHudDev', { fineMetadata: true }), episode = f.db.snapshot(f.episode), original = f.db.snapshot(f.baseline);
  const fence = f.db.snapshot('HudHudDev/commentCountContributions').data();
  const materialized = materializeEpisodeCountBaseline(original, episode, fence);
  assert.equal(materialized.origin, 'baseline'); assert.equal(materialized.episodeCreateTime.isEqual(episode.createTime), true);
  await f.db.doc(f.baseline).set({ ...original.data(), restoreWrite: true });
  assert.throws(() => materializeEpisodeCountBaseline(f.db.snapshot(f.baseline), episode, fence));
  f.db.seed(f.comment('c'), { status: 'published' }); await assert.rejects(f.sync('c'));
  // Simulated reviewed conversion uses the identity verified BEFORE the rewrite.
  await f.db.doc(f.baseline).set(materialized); await f.sync('c');
  assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 1);
  assert.equal(f.db.snapshot(f.baseline).updateTime.isEqual(episode.createTime), false);
});
test('mutation receipt recovery converts original snapshot before rewriting and refuses reinterpretation of restore metadata', async () => {
  const f = await fixture('HudHudDev', { fineMetadata: true }); f.db.seed(f.comment('c'), { status: 'published' }); await f.sync('c');
  await f.mutate('c', 'update', { status: 'hidden' });
  const episode = f.db.snapshot(f.episode), comment = f.db.snapshot(f.comment('c')), original = f.db.snapshot(f.ledger('c'));
  const baseline = resolveEpisodeCountBaseline(f.db.snapshot(f.baseline), episode, f.db.snapshot('HudHudDev/commentCountContributions').data());
  const explicit = materializeCommentCountContribution(original, comment, episode, baseline);
  assert.equal(explicit.commentMutation, false); assert.equal(explicit.commentVersion.isEqual(comment.updateTime), true);
  await f.db.doc(f.ledger('c')).set({ ...original.data(), restoreWrite: true });
  assert.throws(() => materializeCommentCountContribution(f.db.snapshot(f.ledger('c')), comment, episode, baseline));
  await f.db.doc(f.ledger('c')).set(explicit); const writes = f.db.writes.length; await f.sync('c');
  assert.equal(f.db.writes.length, writes); assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 0);
  await f.db.doc(f.comment('c')).update({ status: 'published' });
  assert.throws(() => materializeCommentCountContribution(original, f.db.snapshot(f.comment('c')), episode, baseline));
  await f.sync('c'); assert.equal(f.db.snapshot(f.episode).get('stats.commentsCount'), 1);
});
