import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { claimDelivery, startDelivery, finishDelivery, notificationFailure } from './notification-delivery.js';

export function assertSuperAdminCaller(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }
  const token = request.auth?.token;
  const isSuperAdmin =
    token?.role === 'super_admin' ||
    (token?.admin === true &&
      token?.role !== 'station_admin' &&
      token?.role !== 'moderator');
  if (!isSuperAdmin) {
    throw new HttpsError('permission-denied', 'Super admin privileges are required.');
  }
  return uid;
}

export async function setUserPassword({
  auth,
  firestore,
  targetUid,
  newPassword,
  root,
}) {
  if (typeof targetUid !== 'string' || !targetUid.trim()) {
    throw new HttpsError('invalid-argument', 'A target user ID is required.');
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new HttpsError(
      'invalid-argument',
      'Password must be at least 8 characters long.',
    );
  }

  const trimmedUid = targetUid.trim();
  const user = await auth.getUser(trimmedUid);
  await auth.updateUser(trimmedUid, {
    password: newPassword,
  });

  // Ensure canonical listener profile in Firestore preserves verification and account status (IR-03)
  const profileRef = firestore.doc(`${root}/users/users/${trimmedUid}`);
  const profile = await profileRef.get();
  if (!profile.exists) {
    await profileRef.set({
      displayName: user.displayName || user.email?.split('@')[0] || 'Listener',
      email: user.email || '',
      username: '',
      avatarUrl: user.photoURL || '',
      isActive: !user.disabled,
      role: 'listener',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await profileRef.update({
      ...(user.email ? { email: user.email } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return { success: true, uid: trimmedUid };
}

export async function toggleUserDisabled({
  auth,
  firestore,
  callerUid,
  targetUid,
  disabled,
  reason,
  root,
}) {
  if (typeof targetUid !== 'string' || !targetUid.trim()) {
    throw new HttpsError('invalid-argument', 'A target user ID is required.');
  }
  const trimmedUid = targetUid.trim();
  if (trimmedUid === callerUid) {
    throw new HttpsError(
      'failed-precondition',
      'Administrators cannot disable their own account.',
    );
  }

  const isDisabled = Boolean(disabled);
  await auth.updateUser(trimmedUid, { disabled: isDisabled });

  if (isDisabled) {
    await auth.revokeRefreshTokens(trimmedUid);
  }

  const profileRef = firestore.doc(`${root}/users/users/${trimmedUid}`);
  await profileRef.set(
    {
      isActive: !isDisabled,
      disabledReason: isDisabled ? (reason || 'Disabled by administrator') : null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { success: true, uid: trimmedUid, disabled: isDisabled };
}

export async function assignStationAccess({
  auth,
  firestore,
  callerUid,
  targetUid,
  role = 'station_admin',
  allStations = false,
  stationIds = [],
  root,
}) {
  if (typeof targetUid !== 'string' || !targetUid.trim()) {
    throw new HttpsError('invalid-argument', 'A target user ID is required.');
  }
  const validRoles = ['super_admin', 'station_admin', 'moderator', 'listener'];
  if (!validRoles.includes(role)) {
    throw new HttpsError(
      'invalid-argument',
      `Invalid role. Must be one of: ${validRoles.join(', ')}`,
    );
  }

  const trimmedUid = targetUid.trim();
  const user = await auth.getUser(trimmedUid);
  const existingClaims = user.customClaims || {};

  const isAll = Boolean(allStations);
  const sanitizedStations = Array.isArray(stationIds)
    ? stationIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
    : [];

  const isAdmin = role === 'super_admin' || role === 'station_admin';
  const newClaims = {
    ...existingClaims,
    admin: isAdmin,
    role,
    allStations: isAll,
    assignedStations: isAll ? ['*'] : sanitizedStations,
  };

  await auth.setCustomUserClaims(trimmedUid, newClaims);

  const profileRef = firestore.doc(`${root}/users/users/${trimmedUid}`);
  await profileRef.set(
    {
      role,
      allStations: isAll,
      assignedStationIds: isAll ? [] : sanitizedStations,
      assignedBy: callerUid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return {
    success: true,
    uid: trimmedUid,
    role,
    allStations: isAll,
    assignedStations: sanitizedStations,
  };
}

export async function migrateLegacyUsers({
  firestore,
  callerUid,
  sourcePath = 'HudHudFmGooglePlay/Users/Users',
  targetRoot = 'HudHudOfficial',
  overwrite = false,
  force = false,
}) {
  const migrationRef = firestore.doc(`${targetRoot}/system/migrations/migration_legacy_users`);
  const migrationDoc = await migrationRef.get();

  if (migrationDoc.exists && migrationDoc.data()?.status === 'completed' && !force) {
    const data = migrationDoc.data();
    return {
      success: true,
      alreadyExecuted: true,
      totalSource: data.totalSource ?? 0,
      migratedCount: data.migratedCount ?? 0,
      skippedCount: data.skippedCount ?? 0,
      completedAt: data.completedAt ?? null,
      message: 'Migration has already been executed. Use force: true to re-run.',
    };
  }

  let sourceRef = firestore.collection(sourcePath);
  let snapshot = await sourceRef.get();

  // If initial path has 0 docs, try alternative casing if source was HudHudFmGooglePlay/Users/Users
  if (snapshot.empty && sourcePath === 'HudHudFmGooglePlay/Users/Users') {
    const altRef = firestore.collection('HudHudFmGooglePlay/users/users');
    const altSnap = await altRef.get();
    if (!altSnap.empty) {
      sourceRef = altRef;
      snapshot = altSnap;
    }
  }

  if (snapshot.empty) {
    return {
      success: true,
      totalSource: 0,
      migratedCount: 0,
      skippedCount: 0,
      message: 'No legacy users found in source collection.',
    };
  }

  let migratedCount = 0;
  let skippedCount = 0;
  const batches = [];
  let currentBatch = firestore.batch();
  let opCount = 0;

  for (const doc of snapshot.docs) {
    const uid = doc.id;
    const legacy = doc.data() || {};
    const targetRef = firestore.doc(`${targetRoot}/users/users/${uid}`);

    let targetExists = false;
    let targetData = {};
    if (typeof targetRef.get === 'function') {
      const targetSnap = await targetRef.get();
      targetExists = targetSnap.exists;
      targetData = targetExists ? (targetSnap.data() || {}) : {};
    }

    if (targetExists && !overwrite) {
      // If target exists, only backfill missing fields without overwriting active data
      const backfill = {};
      if (!targetData.email && legacy.email) {
        backfill.email = String(legacy.email).trim().toLowerCase();
      }
      if (!targetData.displayName && (legacy.displayName || legacy.name || legacy.username)) {
        backfill.displayName = legacy.displayName || legacy.name || legacy.username;
      }
      if (Object.keys(backfill).length > 0) {
        backfill.updatedAt = FieldValue.serverTimestamp();
        currentBatch.update(targetRef, backfill);
        opCount++;
        migratedCount++;
      } else {
        skippedCount++;
      }
    } else {
      const email = legacy.email ? String(legacy.email).trim().toLowerCase() : '';
      const displayName = legacy.displayName ||
        legacy.name ||
        legacy.username ||
        legacy.userName ||
        (email ? email.split('@')[0] : 'Listener');

      currentBatch.set(targetRef, {
        displayName,
        email,
        username: legacy.username || legacy.userName || '',
        avatarUrl: legacy.avatarUrl || legacy.photoUrl || legacy.photoURL || legacy.image || '',
        isActive: legacy.isActive !== false && legacy.disabled !== true,
        role: legacy.role || 'listener',
        createdAt: legacy.createdAt || legacy.timestamp || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        migratedFrom: sourceRef.path || sourcePath,
        migratedAt: FieldValue.serverTimestamp(),
      });
      opCount++;
      migratedCount++;
    }

    if (opCount >= 400) {
      batches.push(currentBatch.commit());
      currentBatch = firestore.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    batches.push(currentBatch.commit());
  }

  await Promise.all(batches);

  // Mark migration as completed for one-time protection
  await migrationRef.set({
    completedAt: FieldValue.serverTimestamp(),
    completedBy: callerUid || 'system',
    sourcePath: sourceRef.path || sourcePath,
    targetRoot,
    totalSource: snapshot.size,
    migratedCount,
    skippedCount,
    status: 'completed',
  });

  return {
    success: true,
    totalSource: snapshot.size,
    migratedCount,
    skippedCount,
    message: `Migration completed: ${migratedCount} migrated, ${skippedCount} skipped out of ${snapshot.size} records.`,
  };
}

export async function broadcastNotification({
  messaging,
  firestore,
  callerUid,
  callerEmail,
  root,
  data,
}) {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const body = typeof data?.body === 'string' ? data.body.trim() : '';
  const imageUrl =
    typeof data?.imageUrl === 'string' && data.imageUrl.trim().startsWith('https://')
      ? data.imageUrl.trim()
      : null;
  const rawTargetType = typeof data?.targetType === 'string' ? data.targetType.trim() : 'general';
  if (!['general', 'station', 'episode', 'url'].includes(rawTargetType)) {
    throw new HttpsError('invalid-argument', 'نوع الهدف غير صالح.');
  }
  const targetType = rawTargetType;
  const targetId = typeof data?.targetId === 'string' ? data.targetId.trim() : '';
  const targetLabel =
    typeof data?.targetLabel === 'string' ? data.targetLabel.trim() : '';

  if (!title) {
    throw new HttpsError('invalid-argument', 'عنوان الإشعار مطلوب.');
  }
  if (title.length > 100) {
    throw new HttpsError('invalid-argument', 'يجب ألا يتجاوز عنوان الإشعار 100 حرف.');
  }
  if (!body) {
    throw new HttpsError('invalid-argument', 'نص الإشعار مطلوب.');
  }
  if (body.length > 250) {
    throw new HttpsError('invalid-argument', 'يجب ألا يتجاوز نص الإشعار 250 حرفاً.');
  }

  const operationId = data?.operationId;
  if (!['HudHudDev', 'HudHudOfficial'].includes(root) || typeof operationId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(operationId)) {
    throw new HttpsError('invalid-argument', 'بيئة الإرسال أو معرّف المحاولة غير صالح.');
  }
  if (!callerUid) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const notificationId = `notif_${digest([callerUid, operationId])}`;
  const topic = root === 'HudHudDev' ? 'hudhuddev_hudhud_fm_announcements' : 'hudhud_fm_announcements';
  const reference = firestore.doc(`${root}/notificationOperations/operations/broadcast_${digest([callerUid, operationId])}`);
  const fingerprint = digest([title, body, imageUrl, targetType, targetId, targetLabel]);
  let lease;
  try { lease = await claimDelivery({ firestore, reference, fingerprint }); }
  catch (error) {
    if (error.code === 'delivery/payload-conflict') throw new HttpsError('failed-precondition', 'تغير محتوى المحاولة. أعد فتح محرر الإشعار لمحاولة جديدة.');
    throw new HttpsError('internal', 'تعذر تأكيد حالة محاولة الإرسال. احتفظ بالمحاولة وأعد التحقق.');
  }
  const recordRef = firestore.doc(`${root}/notifications/notifications/${notificationId}`);
  const synchronizeHistory = () => firestore.runTransaction(async tx => {
    const receipt = (await tx.get(reference)).data();
    if (!receipt || receipt.fingerprint !== fingerprint) throw new HttpsError('failed-precondition', 'تعذر تأكيد سجل الإرسال.');
    tx.set(recordRef, { id: notificationId, title, body, targetType, targetId, targetLabel, topic,
      sentAt: receipt.updatedAt, createdAt: receipt.createdAt, sentBy: callerEmail || callerUid,
      status: receipt.status, retryable: receipt.retryable === true, messageId: receipt.messageId || '',
      ...(imageUrl ? { imageUrl } : {}) });
    return { success: receipt.status === 'sent', status: receipt.status, retryable: receipt.retryable === true,
      notificationId, messageId: receipt.messageId || '', title, body, topic };
  });
  if (!lease) return synchronizeHistory();
  try { await synchronizeHistory(); }
  catch {
    await finishDelivery({ firestore, reference, lease, status: 'failed', retryable: true, reason: 'preparation-failed' });
    throw new HttpsError('internal', 'لم يبدأ الإرسال؛ تعذر تسجيل المحاولة. أعد المحاولة بالبيانات نفسها.');
  }

  let episodeData = null;
  if (targetType === 'episode' && targetId) {
    try {
      const epRef = firestore.doc(`${root}/episodes/episodes/${targetId}`);
      if (typeof epRef?.get === 'function') {
        const epDoc = await epRef.get();
        if (epDoc?.exists && typeof epDoc.data === 'function') {
          episodeData = epDoc.data();
        }
      }
    } catch (_) {
      // Fall back safely to announcement payload
    }
  }

  const isEpisodeAlert =
    targetType === 'episode' &&
    Boolean(episodeData?.stationId && episodeData?.programId);

  const fcmPayload = {
    topic,
    notification: {
      title,
      body,
      ...(imageUrl ? { imageUrl } : {}),
    },
    data: {
      version: '1',
      type: isEpisodeAlert
        ? 'episode'
        : targetType === 'episode'
          ? 'announcement'
          : targetType,
      root: root || 'HudHudOfficial',
      targetId,
      stationId: isEpisodeAlert
        ? String(episodeData.stationId)
        : targetType === 'station'
          ? targetId
          : '',
      programId: isEpisodeAlert ? String(episodeData.programId) : '',
      episodeId: targetType === 'episode' ? targetId : '',
      eventId: isEpisodeAlert
        ? `${root || 'HudHudOfficial'}:${targetId}`
        : '',
      url: targetType === 'url' ? targetId : '',
      notificationId,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'announcements',
        sound: 'default',
        tag: notificationId,
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          ...(imageUrl ? { 'mutable-content': 1 } : {}),
        },
      },
      ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
    },
  };

  if (!await startDelivery({ firestore, reference, lease })) return synchronizeHistory();
  let outcome;
  try {
    const messageId = await messaging.send(fcmPayload);
    outcome = typeof messageId === 'string' && messageId ? { status: 'sent', messageId } : notificationFailure(null);
  } catch (error) { outcome = notificationFailure(error); }
  try {
    await finishDelivery({ firestore, reference, lease, ...outcome });
    return await synchronizeHistory();
  } catch {
    // Keep the sending lease/known receipt. Retrying this intent cannot start a second send.
    throw new HttpsError('internal', 'تعذر تأكيد نتيجة الإرسال. راجع السجل أو أعد التحقق بالمحاولة نفسها دون إنشاء إشعار جديد.');
  }
}
