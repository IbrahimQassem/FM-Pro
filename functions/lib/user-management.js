import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';

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
    emailVerified: true,
  });

  // Ensure canonical listener profile is active in Firestore
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
      isActive: true,
      disabledReason: null,
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
