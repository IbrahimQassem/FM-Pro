import { randomUUID } from 'node:crypto';
import { CommentCountMaintenanceError, countRoot, countId, countHash, nativeTimestamp,
  sameCreateTime, compareNativeTime, readCommentCountFence, requireActiveCommentCountFence } from './comment-count-maintenance.js';

const conflict = () => { throw new CommentCountMaintenanceError('Comment count baseline requires reconciliation.', 'failed-precondition', 'comment-count-baseline-conflict'); };
const paths = (root, episodeId, commentId) => {
  countRoot(root);
  if (!countId(episodeId) || (commentId !== undefined && !countId(commentId))) conflict();
  const episode = `${root}/episodes/episodes/${episodeId}`, baseline = `${root}/commentCountContributions/episodes/${episodeId}`;
  return { episode, baseline, comment: `${episode}/comments/${commentId}`, contribution: `${baseline}/contributions/${commentId}` };
};
export const statusContribution = data => data?.status === 'published' ? 1 : 0;
/** Resolve immutable birth receipt metadata or an explicit reconciled identity. */
export function resolveEpisodeCountBaseline(snapshot, episode, fence) {
  const value = snapshot.exists ? snapshot.data() : null;
  if (value?.version !== 1 || value.state !== 'active' || !countId(value.generation) ||
      !['creation', 'baseline'].includes(value.origin) || !countHash(value.baselineManifestHash) ||
      value.baselineManifestHash !== fence.baselineManifestHash) conflict();
  const identity = value.origin === 'creation' ? snapshot.updateTime : value.episodeCreateTime;
  if ((value.origin === 'creation' && Object.hasOwn(value, 'episodeCreateTime')) ||
      !sameCreateTime(identity, episode.createTime)) conflict();
  return { ...value, episodeCreateTime: identity };
}

/** Read-only conversion before a maintenance rewrite; never reuse new receipt metadata. */
export function materializeEpisodeCountBaseline(snapshot, episode, fence) {
  return { ...resolveEpisodeCountBaseline(snapshot, episode, fence), origin: 'baseline' };
}
function validContribution(value) {
  return value?.version === 1 && countId(value.generation) && [0, 1].includes(value.contribution) &&
    countHash(value.baselineManifestHash) && nativeTimestamp(value.episodeCreateTime) &&
    typeof value.commentMutation === 'boolean' && (value.commentVersion === null || nativeTimestamp(value.commentVersion));
}
function matchesCommentVersion(snapshot, value, currentVersion) {
  if (currentVersion === null) return value.commentVersion === null && !value.commentMutation;
  return sameCreateTime(value.commentVersion, currentVersion) ||
    (value.commentMutation && sameCreateTime(snapshot.updateTime, currentVersion));
}
export function materializeCommentCountContribution(snapshot, comment, episode, baseline) {
  const value = snapshot.exists ? snapshot.data() : null, current = comment.exists ? comment.data() : null;
  const version = comment.exists ? comment.updateTime : null;
  if (!validContribution(value) || !sameCreateTime(value.episodeCreateTime, episode.createTime) ||
      value.generation !== baseline.generation || value.baselineManifestHash !== baseline.baselineManifestHash ||
      value.contribution !== statusContribution(current) || !matchesCommentVersion(snapshot, value, version)) conflict();
  return { ...value, commentVersion: version, commentMutation: false };
}

/** All reads precede caller writes. A legacy root has no fabricated active baseline. */
export async function prepareNewEpisodeCountBaseline(tx, firestore, { root, episodeId }) {
  const target = paths(root, episodeId), state = await readCommentCountFence(tx, firestore, root);
  if (state.mode === 'legacy') return { mode: state.mode, writes: [] };
  const current = await tx.get(firestore.doc(target.episode));
  if (current.exists) conflict();
  const orphaned = await tx.get(firestore.collection(`${target.episode}/comments`).limit(1));
  if (!orphaned.empty) conflict();
  const baseline = { version: 1, state: 'active', origin: 'creation', generation: randomUUID(),
    baselineManifestHash: state.fence.baselineManifestHash };
  return { mode: state.mode, writes: [() => tx.set(firestore.doc(target.baseline), baseline)] };
}

/** Single arithmetic owner for sync, moderation, review and account-comment removal. */
export async function prepareCommentCountMutation(tx, firestore, {
  root, episodeId, commentId, action = 'sync', changes,
}) {
  const target = paths(root, episodeId, commentId);
  if (!['sync', 'update', 'delete'].includes(action)) conflict();
  const fence = await requireActiveCommentCountFence(tx, firestore, root);
  const [episode, baselineSnapshot, comment, priorSnapshot] = await Promise.all([
    tx.get(firestore.doc(target.episode)), tx.get(firestore.doc(target.baseline)),
    tx.get(firestore.doc(target.comment)), tx.get(firestore.doc(target.contribution)),
  ]);
  if (!episode.exists) return { writes: action === 'delete' && comment.exists ? [() => tx.delete(comment.ref)] : [], missing: true, delta: 0 };
  if (episode.data().adminDeletionToken) throw new CommentCountMaintenanceError();
  const baseline = resolveEpisodeCountBaseline(baselineSnapshot, episode, fence);
  const current = comment.exists ? comment.data() : null;
  const patch = action === 'update' && current ? (typeof changes === 'function' ? changes(current) : changes) : null;
  if (patch !== null && (typeof patch !== 'object' || Array.isArray(patch))) conflict();
  const after = action === 'delete' ? null : current ? { ...current, ...(patch ?? {}) } : null;
  let prior = priorSnapshot.exists ? priorSnapshot.data() : null;
  if (prior) {
    if (!validContribution(prior)) conflict();
    if (!sameCreateTime(prior.episodeCreateTime, episode.createTime)) {
      // Only a proven atomic new-episode zero baseline can discard old identity.
      if (baseline.origin !== 'creation' || compareNativeTime(prior.episodeCreateTime, episode.createTime) >= 0) conflict();
      prior = null;
    } else if (prior.generation !== baseline.generation || prior.baselineManifestHash !== baseline.baselineManifestHash) conflict();
  }
  if (!prior && current) {
    if (!nativeTimestamp(comment.createTime)) conflict();
    const cutoff = baseline.origin === 'creation' ? episode.createTime : fence.activeFrom;
    if (compareNativeTime(comment.createTime, cutoff) < (baseline.origin === 'creation' ? 0 : 1)) conflict();
  }
  const desired = statusContribution(after), before = prior?.contribution ?? 0, delta = desired - before;
  const count = episode.get('stats.commentsCount');
  if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(count + delta) || count + delta < 0) conflict();
  const version = after ? comment.updateTime : null;
  if (after && !nativeTimestamp(version)) conflict();
  // Mismatched versions are NOT admission failures for legitimate newer state.
  const unchanged = prior && prior.contribution === desired && matchesCommentVersion(priorSnapshot, prior, version);
  const writes = [];
  if (action === 'delete' && comment.exists) writes.push(() => tx.delete(comment.ref));
  else if (patch) writes.push(() => tx.update(comment.ref, patch));
  if (delta) writes.push(() => tx.update(episode.ref, { 'stats.commentsCount': count + delta }));
  if (!unchanged || patch) {
    const contribution = { version: 1, generation: baseline.generation, baselineManifestHash: baseline.baselineManifestHash,
      episodeCreateTime: baseline.episodeCreateTime, contribution: desired, commentVersion: version, commentMutation: Boolean(patch) };
    writes.push(() => tx.set(firestore.doc(target.contribution), contribution));
  }
  return { writes, delta, current, after, missing: false };
}
export async function reconcileCommentCount({ firestore, root, episodeId, commentId }) {
  return firestore.runTransaction(async tx => {
    const result = await prepareCommentCountMutation(tx, firestore, { root, episodeId, commentId });
    for (const write of result.writes) write();
    return { delta: result.delta, missing: result.missing };
  });
}
export async function handleCommentCountWritten(input) {
  if (!['HudHudDev', 'HudHudOfficial'].includes(input.root)) return null;
  return reconcileCommentCount(input);
}

/** Bounded private cleanup only after parent absence is checked in the same tx. */
export async function cleanupDeletedEpisodeContributions({ firestore, root, episodeId, limit = 25 }) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) conflict();
  const target = paths(root, episodeId);
  return firestore.runTransaction(async tx => {
    await readCommentCountFence(tx, firestore, root);
    const [episode, baseline, rows] = await Promise.all([tx.get(firestore.doc(target.episode)), tx.get(firestore.doc(target.baseline)),
      tx.get(firestore.collection(`${target.baseline}/contributions`).orderBy('__name__').limit(limit))]);
    if (episode.exists) return { deleted: 0, complete: false };
    for (const row of rows.docs) tx.delete(row.ref);
    if (rows.size < limit && baseline.exists) tx.delete(baseline.ref);
    return { deleted: rows.size, complete: rows.size < limit };
  });
}
