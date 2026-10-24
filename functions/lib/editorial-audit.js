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

  const isSuperAdmin =
    callerRole === 'super_admin' ||
    (callerClaims?.admin === true &&
      callerRole !== 'station_admin' &&
      callerRole !== 'moderator');

  if (!validId(callerUid)) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  if ((callerClaims?.role && callerClaims.role !== callerRole) ||
      (!isSuperAdmin && callerRole !== 'station_admin')) {
    throw new HttpsError('permission-denied', 'Administrative privileges are required.');
  }
  const canManageStation = stationId => isSuperAdmin || (
    callerRole === 'station_admin' && (
      callerClaims?.allStations === true ||
      (Array.isArray(callerClaims?.assignedStations) &&
        (callerClaims.assignedStations.includes(stationId) ||
          callerClaims.assignedStations.includes('*')))
    )
  );

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
  content = validateAdminContent(kind, content);
  const actorName = [callerClaims?.name, callerClaims?.displayName].find(value => typeof value === 'string' && value.trim()) ||
    (typeof callerEmail === 'string' && callerEmail ? callerEmail.split('@')[0] : callerUid);
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
    const same = (first, second) => JSON.stringify(editableContent(kind, first)) === JSON.stringify(editableContent(kind, second));
    if (existing && same(existing, content)) { action = 'unchanged'; return; }
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
      ...content, ...actorFields,
      ...(!existing ? { createdBy: callerUid, createdByName: actorName, createdAt: FieldValue.serverTimestamp(),
        ...(stats ? { stats } : {}) } : {}),
    };
    for (const write of [...writes, ...identityWrites]) write();
    tx.set(docRef, payload, { merge: Boolean(existing) });
    await recordEditorialAuditLog(tx, firestore, { root, targetKind: kind, targetId: id,
      targetTitle: content.name || content.title || content.cityNameAr || id,
      action: source === 'import' ? 'import' : action,
      actorUid: callerUid, actorEmail: callerEmail,
      summary: `${action} ${kind}`, relatedTargets,
    });
  });
  return { success: true, id, action };
}
