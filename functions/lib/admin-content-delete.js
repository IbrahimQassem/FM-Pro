import { assertCounterAdjustment } from './admin-content-relations.js';
import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { administrativeActor } from './admin-content-authorization.js';
import { contentIdentity, validContentId } from './admin-content.js';
import { recordEditorialAuditLog } from './editorial-audit.js';

const fail = (reason, message) => { throw new HttpsError('failed-precondition', message, { reason }); };
export function deletionSnapshot(value) {
  const normalize = item => {
    if (item && typeof item.toDate === 'function') return item.toDate().toISOString();
    if (item instanceof Date) return item.toISOString();
    if (item?.firestore && typeof item.path === 'string') return { referencePath: item.path };
    if (typeof item?.isEqual === 'function' && typeof item?.latitude === 'number' && typeof item?.longitude === 'number') return { latitude: item.latitude, longitude: item.longitude };
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).filter(key => key !== 'adminDeletionToken').sort().map(key => [key, normalize(item[key])]));
    return item;
  };
  return JSON.stringify(normalize(value));
}

export async function deleteAdminContent(args) {
  const { firestore: db, data } = args;
  const { root, kind, id, expected } = data ?? {};
  if (!['HudHudDev', 'HudHudOfficial'].includes(root) || !['stations', 'programs', 'episodes', 'banners'].includes(kind) ||
      !validContentId(id) || !expected || typeof expected !== 'object' || Array.isArray(expected)) {
    throw new HttpsError('invalid-argument', 'Invalid deletion target or snapshot.');
  }
  const actor = administrativeActor(args);
  if (['stations', 'banners'].includes(kind) && !actor.isSuperAdmin) throw new HttpsError('permission-denied', 'Super admin privileges are required.');
  const ref = db.doc(`${root}/${kind}/${kind}/${id}`);
  const authorize = current => {
    if (!actor.canManageStation(current.stationId) && ['programs', 'episodes'].includes(kind)) {
      throw new HttpsError('permission-denied', 'Not authorized to delete this station content.');
    }
    if (deletionSnapshot(current) !== deletionSnapshot(expected)) fail('stale-content', 'The record changed. Reload it before deleting.');
  };
  const token = randomUUID();
  let acquired = false;
  if (kind === 'episodes') {
    acquired = await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (!current.exists) return false;
      const value = current.data();
      authorize(value);
      if (!validContentId(value.programId)) fail('missing-parent', 'The parent relationship is invalid.');
      const program = await tx.get(db.doc(`${root}/programs/programs/${value.programId}`));
      if (!program.exists) fail('missing-parent', 'The related parent no longer exists.');
      if (!actor.canManageStation(program.data().stationId)) throw new HttpsError('permission-denied', 'Not authorized to manage the episode parent.');
      tx.update(ref, { adminDeletionToken: token });
      return true;
    });
    if (!acquired) return { success: true, id, action: 'unchanged' };
  }
  let action = 'unchanged';
  try {
    if (acquired) {
      // The committed fence makes Rules reject new comments before this query.
      const comments = await ref.collection('comments').limit(1).get();
      if (!comments.empty) fail('episode-has-comments', 'Unpublish episodes with comments instead of deleting them.');
    }
    await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (!current.exists) return;
      const value = current.data();
      authorize(value);
      if (acquired && value.adminDeletionToken !== token) fail('deletion-replaced', 'Another deletion attempt replaced this one.');
      if (kind === 'stations' || kind === 'programs') {
        const group = kind === 'stations' ? 'programs' : 'episodes';
        const field = kind === 'stations' ? 'stationId' : 'programId';
        const children = await tx.get(db.collection(`${root}/${group}/${group}`).where(field, '==', id).limit(1));
        const count = value.stats?.[kind === 'stations' ? 'programsCount' : 'episodesCount'];
        if (!children.empty || (count !== undefined && (!Number.isSafeInteger(count) || count !== 0))) {
          fail('content-has-children', 'Transfer or delete related content before deleting this record.');
        }
        if (kind === 'stations') {
          const episodes = await tx.get(db.collection(`${root}/episodes/episodes`).where('stationId', '==', id).limit(1));
          if (!episodes.empty) fail('content-has-children', 'Station episodes still reference this record.');
        }
      }
      let parent;
      let counter;
      if (kind === 'programs' || kind === 'episodes') {
        const relation = kind === 'programs' ? 'stationId' : 'programId';
        const group = kind === 'programs' ? 'stations' : 'programs';
        counter = kind === 'programs' ? 'programsCount' : 'episodesCount';
        if (!validContentId(value[relation])) fail('missing-parent', 'The parent relationship is invalid.');
        parent = await tx.get(db.doc(`${root}/${group}/${group}/${value[relation]}`));
        if (!parent.exists) fail('missing-parent', 'The related parent no longer exists.');
        if (kind === 'episodes' && !actor.canManageStation(parent.data().stationId)) {
          throw new HttpsError('permission-denied', 'Not authorized to manage the episode parent.');
        }
        const count = parent.get(`stats.${counter}`);
        assertCounterAdjustment(count, -1);
      }
      const identity = contentIdentity(kind, value);
      const identityRef = identity ? db.doc(`${root}/importKeys/importKeys/${identity}`) : null;
      const reservation = identityRef ? await tx.get(identityRef) : null;
      if (parent) tx.update(parent.ref, { [`stats.${counter}`]: FieldValue.increment(-1) });
      if (reservation?.exists && reservation.data().targetId === id) tx.delete(identityRef);
      tx.delete(ref);
      await recordEditorialAuditLog(tx, db, { root, targetKind: kind, targetId: id,
        targetTitle: value.name || value.title || id, action: 'delete', actorUid: actor.uid, actorEmail: actor.email,
        summary: `delete ${kind}` });
      action = 'delete';
    });
  } finally {
    if (acquired) await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      if (current.exists && current.data().adminDeletionToken === token) tx.update(ref, { adminDeletionToken: FieldValue.delete() });
    });
  }
  return { success: true, id, action };
}
