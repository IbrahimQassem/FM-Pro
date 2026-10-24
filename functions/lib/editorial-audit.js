import { randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

const editableFields = {
  stations: new Set(('name nameEn tagline description frequency streamUrl backupStreamUrl logoUrl thumbnailUrl websiteUrl facebookUrl instagramUrl youtubeUrl twitterUrl whatsapp owner address contactPerson contactPhone contactEmail streamType audioCodec bitrateKbps sampleRateHz transmitterPower transmitterLocation coverageArea rds isActive isFeatured isVerified isLive isNational priority countryCode countryNameAr cityCode cityNameAr locationType').split(' ')),
  programs: new Set(('title titleEn description coverUrl thumbnailUrl presenters categories schedule isActive isFeatured priority stationId').split(' ')),
  episodes: new Set(('title description coverUrl audioUrl durationSeconds presenter guest broadcastAt utcOffsetMinutes publishedAt isPublished isFeatured priority programId stationId').split(' ')),
  locations: new Set(('cityCode cityNameAr sortOrder priority isActive countryCode countryNameAr locationType').split(' ')),
};

function validId(value) {
  return typeof value === 'string' && value === value.trim() &&
    value.length > 0 && value.length <= 128 && !value.includes('/') &&
    value !== '.' && value !== '..';
}

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

  if (['stations', 'locations'].includes(kind) && !isSuperAdmin) {
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

  const actorName =
    callerClaims?.name ||
    callerClaims?.displayName ||
    (callerEmail ? callerEmail.split('@')[0] : callerUid);

  const docRef = firestore.doc(`${root}/${kind}/${kind}/${id}`);
  let action = 'create';

  await firestore.runTransaction(async tx => {
    const current = await tx.get(docRef);
    action = current.exists ? 'update' : 'create';
    const existing = current.exists ? current.data() : {};
    if (existing.adminDeletionToken) {
      throw new HttpsError('failed-precondition', 'Content deletion is in progress.');
    }
    if (['programs', 'episodes'].includes(kind)) {
      // Authorize the stored owner as well as the submitted destination. Admin
      // SDK writes bypass Rules, so trusting only the payload permits takeover.
      if (current.exists && (!validId(existing.stationId) || !canManageStation(existing.stationId))) {
        throw new HttpsError('permission-denied', 'Not authorized to manage the existing station.');
      }
      const station = await tx.get(firestore.doc(`${root}/stations/stations/${content.stationId}`));
      if (!station.exists || station.data()?.adminDeletionToken) {
        throw new HttpsError('failed-precondition', 'The parent station is unavailable.');
      }
      if (kind === 'episodes') {
        const program = await tx.get(firestore.doc(`${root}/programs/programs/${content.programId}`));
        if (!program.exists || program.data()?.adminDeletionToken || program.data()?.stationId !== content.stationId) {
          throw new HttpsError('failed-precondition', 'The program does not belong to this station.');
        }
      }
    }

    const auditFields = {};
    if (action === 'create') {
      auditFields.createdBy = callerUid;
      auditFields.createdByName = actorName;
      auditFields.createdAt = FieldValue.serverTimestamp();
      auditFields.updatedBy = callerUid;
      auditFields.updatedByName = actorName;
      auditFields.updatedAt = FieldValue.serverTimestamp();
    } else {
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
