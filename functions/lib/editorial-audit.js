import { publicStation, prepareStationPrivacy, validateStationPrivacyOptions } from './station-privacy.js';
import { administrativeActor } from './admin-content-authorization.js';
import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

import { editableFields, editableContent, validateAdminContent, validContentId as validId, initialContentStats } from './admin-content.js';
import { prepareContentRelations, prepareContentIdentity } from './admin-content-relations.js';

export async function recordEditorialAuditLog(tx, firestore, {
  root,
  targetKind,
  targetId,
  targetTitle,
  action,
  actorUid,
  actorEmail,
  summary = '',
  relatedTargets = [],
}) {
  const logId = randomUUID();
  const logRef = firestore.doc(`${root}/auditLogs/auditLogs/${logId}`);
  tx.set(logRef, {
    targetKind,
    targetId,
    targetTitle: targetTitle || targetId,
    action,
    actorUid,
    actorEmail: actorEmail || '',
    timestamp: FieldValue.serverTimestamp(),
    summary: summary || '',
    ...(relatedTargets.length ? { relatedTargets } : {}),
  });
  return logId;
}

export async function saveAdminContent({
  firestore,
  callerUid,
  callerEmail,
  callerRole,
  callerClaims,
  data,
}) {
  const { root, kind, id, content: input, expected, locationId, source } = data ?? {};
  let content = input;
  if (!['HudHudDev', 'HudHudOfficial'].includes(root)) {
    throw new HttpsError('invalid-argument', 'Unknown environment.');
  }
  if (!Object.hasOwn(editableFields, kind)) {
    throw new HttpsError('invalid-argument', 'Invalid content kind.');
  }
  if (!validId(id)) {
    throw new HttpsError('invalid-argument', 'Invalid document ID.');
  }
  if (!content || typeof content !== 'object' || Array.isArray(content) ||
      Object.keys(content).some(key => !editableFields[kind].has(key))) {
    throw new HttpsError('invalid-argument', 'Missing content payload.');
  }

  const actor = administrativeActor({ callerUid, callerEmail, callerRole, callerClaims });
  const { isSuperAdmin, canManageStation } = actor;

  if (['stations', 'locations', 'banners'].includes(kind) && !isSuperAdmin) {
    throw new HttpsError('permission-denied', 'Super admin privileges are required.');
  }

  if (['programs', 'episodes'].includes(kind)) {
    if (!validId(content.stationId) ||
        (kind === 'episodes' && !validId(content.programId))) {
      throw new HttpsError('invalid-argument', 'Invalid parent ID.');
    }
    if (!canManageStation(content.stationId)) {
      throw new HttpsError('permission-denied', 'Not authorized to manage this station.');
    }
  }

  if (!Object.hasOwn(data, 'expected') || (expected !== null &&
      (typeof expected !== 'object' || Array.isArray(expected))) ||
      (source !== undefined && source !== 'editor' && source !== 'import')) {
    throw new HttpsError('invalid-argument', 'An explicit edit precondition is required.');
  }
  validateStationPrivacyOptions(kind, data);
  content = validateAdminContent(kind, content);
  const actorName = actor.name;
  const docRef = firestore.doc(`${root}/${kind}/${kind}/${id}`);
  let action;

  await firestore.runTransaction(async tx => {
    const current = await tx.get(docRef);
    const existing = current.exists ? current.data() : null;
    if (existing?.adminDeletionToken) throw new HttpsError('failed-precondition', 'Content deletion is in progress.');
    if (existing && ['programs', 'episodes'].includes(kind) &&
        (!validId(existing.stationId) || !canManageStation(existing.stationId))) {
      throw new HttpsError('permission-denied', 'Not authorized to manage the existing station.');
    }
    const privateRef = kind === 'stations' ? firestore.doc(`${root}/stationPrivate/stations/${id}`) : null;
    const privateSnapshot = privateRef ? await tx.get(privateRef) : null;
    const privacy = privateRef ? prepareStationPrivacy(existing, privateSnapshot.exists ? privateSnapshot.data() : null, data) : null;
    const projection = value => editableContent(kind, kind === 'stations' ? publicStation(value) : value);
    const same = (first, second) => JSON.stringify(projection(first)) === JSON.stringify(projection(second));
    if (existing && same(existing, content) && (!privacy || (!privacy.changed && !privacy.scrub))) { action = 'unchanged'; return; }
    privacy?.checkPrecondition();
    if ((expected !== null && !existing) || (existing && (expected === null || !same(existing, expected)))) {
      throw new HttpsError('failed-precondition', 'The record changed. Reload it before saving.');
    }
    action = existing ? 'update' : 'create';
    if (kind === 'episodes') {
      const station = await tx.get(firestore.doc(`${root}/stations/stations/${content.stationId}`));
      if (!station.exists || station.data().adminDeletionToken) throw new HttpsError('failed-precondition', 'The parent station is unavailable.');
    }
    const actorFields = { updatedBy: callerUid, updatedByName: actorName, updatedAt: FieldValue.serverTimestamp() };
    const { writes, relatedTargets } = await prepareContentRelations(tx, firestore, { root, kind, id, current, content, locationId, actorFields });
    const identityWrites = await prepareContentIdentity(tx, firestore, { root, kind, id, content, existing });
    const stats = initialContentStats(kind);
    const payload = {
      ...(privacy ? publicStation(content) : content), ...actorFields,
      ...(!existing ? { createdBy: callerUid, createdByName: actorName, createdAt: FieldValue.serverTimestamp(),
        ...(stats ? { stats } : {}) } : {}),
    };
    for (const write of [...writes, ...identityWrites]) write();
    if (privacy?.needsWrite) tx.set(privateRef, privacy.document);
    tx.set(docRef, privacy ? { ...publicStation(existing), ...payload } : payload, { merge: privacy ? false : Boolean(existing) });
    await recordEditorialAuditLog(tx, firestore, { root, targetKind: kind, targetId: id,
      targetTitle: content.name || content.title || content.cityNameAr || id,
      action: source === 'import' ? 'import' : action,
      actorUid: callerUid, actorEmail: callerEmail,
      summary: `${action} ${kind}`, relatedTargets,
    });
  });
  return { success: true, id, action };
}
