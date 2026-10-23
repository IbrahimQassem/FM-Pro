import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export async function recordEditorialAuditLog(tx, firestore, {
  root,
  targetKind,
  targetId,
  targetTitle,
  action,
  actorUid,
  actorEmail,
  summary = '',
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
  const { root, kind, id, content } = data ?? {};
  if (!['HudHudDev', 'HudHudOfficial'].includes(root)) {
    throw new HttpsError('invalid-argument', 'Unknown environment.');
  }
  if (!['stations', 'programs', 'episodes', 'locations'].includes(kind)) {
    throw new HttpsError('invalid-argument', 'Invalid content kind.');
  }
  if (typeof id !== 'string' || !id || id.includes('/')) {
    throw new HttpsError('invalid-argument', 'Invalid document ID.');
  }
  if (!content || typeof content !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing content payload.');
  }

  const isSuperAdmin =
    callerRole === 'super_admin' ||
    (callerClaims?.admin === true &&
      callerRole !== 'station_admin' &&
      callerRole !== 'moderator');

  if (['stations', 'locations'].includes(kind) && !isSuperAdmin) {
    throw new HttpsError('permission-denied', 'Super admin privileges are required.');
  }

  if (['programs', 'episodes'].includes(kind)) {
    const stationId = content.stationId;
    const canManageStation =
      isSuperAdmin ||
      callerClaims?.allStations === true ||
      (Array.isArray(callerClaims?.assignedStations) &&
        (callerClaims.assignedStations.includes(stationId) ||
          callerClaims.assignedStations.includes('*')));
    if (!canManageStation) {
      throw new HttpsError('permission-denied', 'Not authorized to manage this station.');
    }
  }

  const actorName =
    callerClaims?.name ||
    callerClaims?.displayName ||
    (callerEmail ? callerEmail.split('@')[0] : callerUid);

  const docRef = firestore.doc(`${root}/${kind}/${kind}/${id}`);
  let action = 'create';

  await firestore.runTransaction(async tx => {
    const current = await tx.get(docRef);
    action = current.exists ? 'update' : 'create';

    const auditFields = {};
    if (action === 'create') {
      auditFields.createdBy = callerUid;
      auditFields.createdByName = actorName;
      auditFields.createdAt = FieldValue.serverTimestamp();
      auditFields.updatedBy = callerUid;
      auditFields.updatedByName = actorName;
      auditFields.updatedAt = FieldValue.serverTimestamp();
    } else {
      const existing = current.data() || {};
      if (existing.createdBy) auditFields.createdBy = existing.createdBy;
      if (existing.createdByName) auditFields.createdByName = existing.createdByName;
      if (existing.createdAt) auditFields.createdAt = existing.createdAt;
      auditFields.updatedBy = callerUid;
      auditFields.updatedByName = actorName;
      auditFields.updatedAt = FieldValue.serverTimestamp();
    }

    const finalData = {
      ...content,
      ...auditFields,
    };

    tx.set(docRef, finalData, { merge: action === 'update' });

    await recordEditorialAuditLog(tx, firestore, {
      root,
      targetKind: kind,
      targetId: id,
      targetTitle: content.name || content.title || content.cityNameAr || id,
      action,
      actorUid: callerUid,
      actorEmail: callerEmail,
      summary: `${action} ${kind} ${id}`,
    });
  });

  return { success: true, id, action };
}
