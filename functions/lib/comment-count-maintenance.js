// Dependency-free wire/fence checks shared by Functions and standalone seed tools.
const roots = ['HudHudDev', 'HudHudOfficial'];
export const countRoot = root => {
  if (!roots.includes(root)) throw new CommentCountMaintenanceError('Unknown count root.', 'invalid-argument');
  return root;
};
export const countId = value => typeof value === 'string' && value.length > 0 && value.length <= 128 &&
  value === value.trim() && !value.includes('/') && value !== '.' && value !== '..';
export class CommentCountMaintenanceError extends Error {
  constructor(message = 'Comment count maintenance or baseline is not ready.', code = 'failed-precondition', reason = 'comment-count-maintenance') {
    super(message); this.name = 'CommentCountMaintenanceError'; this.code = code;
    this.details = { reason }; this.retryable = true;
  }
}
export function nativeTimestamp(value) {
  if (!value || typeof value.toMillis !== 'function' || typeof value.isEqual !== 'function' ||
      !Number.isInteger(value.seconds) || value.seconds < -62135596800 || value.seconds > 253402300799 ||
      !Number.isInteger(value.nanoseconds) || value.nanoseconds < 0 || value.nanoseconds > 999999999) return null;
  return { seconds: value.seconds, nanoseconds: value.nanoseconds };
}
export function sameCreateTime(first, second) {
  const a = nativeTimestamp(first), b = nativeTimestamp(second);
  return Boolean(a && b && a.seconds === b.seconds && a.nanoseconds === b.nanoseconds);
}
export function compareNativeTime(first, second) {
  const a = nativeTimestamp(first), b = nativeTimestamp(second);
  if (!a || !b) throw new CommentCountMaintenanceError();
  return a.seconds - b.seconds || a.nanoseconds - b.nanoseconds;
}
export const countHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export function validateCommentCountFence(data) {
  if (!data || data.version !== 1 || data.writerProtocol !== 1 || !['paused', 'active'].includes(data.state) ||
      !Number.isSafeInteger(data.generation) || data.generation < 1 || typeof data.owner !== 'string' ||
      data.owner.length < 1 || data.owner.length > 128 || data.owner !== data.owner.trim() || data.owner.includes('/') || !countHash(data.planHash) ||
      !Number.isSafeInteger(data.leaseUntil) || data.leaseUntil < 0 ||
      (data.state === 'active' && (!nativeTimestamp(data.activeFrom) || !countHash(data.baselineManifestHash))))
    throw new CommentCountMaintenanceError();
  return data;
}
export async function readCommentCountFence(tx, firestore, root) {
  countRoot(root);
  const snapshot = await tx.get(firestore.doc(`${root}/commentCountContributions`));
  if (!snapshot.exists) return { mode: 'legacy', fence: null };
  const fence = validateCommentCountFence(snapshot.data());
  if (fence.state !== 'active') throw new CommentCountMaintenanceError();
  return { mode: 'active', fence };
}
export async function requireActiveCommentCountFence(tx, firestore, root) {
  const result = await readCommentCountFence(tx, firestore, root);
  if (result.mode !== 'active') throw new CommentCountMaintenanceError();
  return result.fence;
}
