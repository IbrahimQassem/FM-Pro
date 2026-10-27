// Synthetic integration support. This file never authorizes a live cutover.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCommentCountDemoFirestore, CommentCountBackupStore,
  previewCommentCountReconciliation, bootstrapEmptyCommentCountRoot } from '../../tool/reconcile_comment_counts.mjs';
import { readCommentCountFence, requireActiveCommentCountFence } from '../../functions/lib/comment-count-maintenance.js';
import { prepareNewEpisodeCountBaseline, prepareCommentCountMutation, reconcileCommentCount } from '../../functions/lib/comment-counts.js';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { FieldValue } = require('firebase-admin/firestore');
const roots = ['HudHudDev', 'HudHudOfficial'];
const bootstrap = new Map();
export function demoCountContext(db) {
  const projectId = process.env.GCLOUD_PROJECT;
  assert.match(projectId ?? '', /^demo-[a-z0-9-]+$/, 'An explicit synthetic demo project is required');
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? '', /^(127\.0\.0\.1|localhost):[1-9]\d*$/, 'Loopback Firestore emulator required');
  if (db) assert.equal(db.projectId, projectId, 'Fixture SDK must use the emulator project');
  return { projectId, emulatorHost: process.env.FIRESTORE_EMULATOR_HOST };
}
export async function ensureDemoCountRoots() {
  const context = demoCountContext();
  if (!bootstrap.has(context.projectId)) bootstrap.set(context.projectId, (async () => {
    const firestore = createCommentCountDemoFirestore(context);
    try {
      for (const root of roots) {
        const current = await firestore.runTransaction(tx => readCommentCountFence(tx, firestore, root));
        if (current.mode === 'active') continue;
        assert.equal(current.mode, 'legacy', 'Fixture setup cannot bypass a paused or invalid root');
        const directory = await mkdtemp(join(tmpdir(), 'hudhud-count-fixture-'));
        try {
          const backupStore = await CommentCountBackupStore.open({ directory, key: randomBytes(32), expiresAt: Date.now() + 7 * 86400000 });
          const input = { firestore, ...context, root, backupStore, maxItems: 25, owner: 'synthetic-fixture-bootstrap' };
          const manifest = await previewCommentCountReconciliation(input);
          await backupStore.writeVerified(manifest);
          const result = await bootstrapEmptyCommentCountRoot({ ...input, manifest, expectedManifestHash: manifest.hash });
          assert.equal(result.status, 'active', 'Actual verified empty-inventory activation must finish');
          assert.equal((await firestore.runTransaction(tx => readCommentCountFence(tx, firestore, root))).mode, 'active');
        } finally { await rm(directory, { recursive: true, force: true }); }
      }
    } finally { await firestore.terminate(); }
  })());
  return bootstrap.get(context.projectId);
}

// Canonical native creation and its accepted empty baseline share one commit.
export async function seedCountedEpisodes(db, root, records) {
  demoCountContext(db); assert.ok(roots.includes(root)); await ensureDemoCountRoots();
  assert.ok(Array.isArray(records) && records.length <= 500, 'Fixture episode inventory must be bounded');
  for (let offset = 0; offset < records.length; offset += 25) {
    await db.runTransaction(async tx => {
      await requireActiveCommentCountFence(tx, db, root);
      const plans = [];
      for (const { id, data = {} } of records.slice(offset, offset + 25)) {
        const reference = db.doc(`${root}/episodes/episodes/${id}`), existing = await tx.get(reference);
        if (existing.exists) {
          const count = existing.get('stats.commentsCount');
          assert.ok(Number.isSafeInteger(count) && count >= 0, 'Existing fixture count must be canonical');
          plans.push({ reference, existing: true, data: { ...data, stats: { ...existing.get('stats'), ...data.stats, commentsCount: count } }, writes: [] });
        } else {
          const baseline = await prepareNewEpisodeCountBaseline(tx, db, { root, episodeId: id, serverTimestamp: () => FieldValue.serverTimestamp() });
          assert.equal(baseline.mode, 'active');
          plans.push({ reference, existing: false, data: { ...data, stats: { ...data.stats, commentsCount: 0 } }, writes: baseline.writes });
        }
      }
      for (const plan of plans) {
        if (plan.existing) tx.set(plan.reference, plan.data);
        else tx.create(plan.reference, plan.data);
        for (const write of plan.writes) write();
      }
    });
  }
}
export async function seedCountedEpisode(db, root, id, data = {}) {
  await seedCountedEpisodes(db, root, [{ id, data }]);
  return db.doc(`${root}/episodes/episodes/${id}`);
}
export async function syncFixtureComment(db, root, episodeId, commentId) {
  demoCountContext(db); return reconcileCommentCount({ firestore: db, root, episodeId, commentId });
}
export async function updateFixtureCommentAtomically(db, root, episodeId, commentId, changes) {
  demoCountContext(db);
  return db.runTransaction(async tx => {
    const plan = await prepareCommentCountMutation(tx, db, { root, episodeId, commentId, action: 'update', changes: () => changes, serverTimestamp: () => FieldValue.serverTimestamp() });
    for (const write of plan.writes) write();
  });
}
export async function deleteFixtureCommentAtomically(db, root, episodeId, commentId) {
  demoCountContext(db);
  return db.runTransaction(async tx => {
    const plan = await prepareCommentCountMutation(tx, db, { root, episodeId, commentId, action: 'delete', serverTimestamp: () => FieldValue.serverTimestamp() });
    for (const write of plan.writes) write();
  });
}
export async function waitForEpisodeCount(db, root, episodeId, expected, { timeoutMs = 15000, requireModeratedComment = '' } = {}) {
  demoCountContext(db); const deadline = Date.now() + timeoutMs; let actual;
  do {
    const episode = await db.doc(`${root}/episodes/episodes/${episodeId}`).get();
    actual = episode.get('stats.commentsCount');
    const moderated = !requireModeratedComment || Boolean((await db.doc(`${root}/episodes/episodes/${episodeId}/comments/${requireModeratedComment}`).get()).get('moderatedAt'));
    if (actual === expected && moderated) return episode;
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, 50));
  } while (true);
  assert.equal(actual, expected, 'Actual event worker must converge the canonical counter after the successful comment write');
  throw new Error('The real moderation event did not complete before the bounded deadline');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await ensureDemoCountRoots();
