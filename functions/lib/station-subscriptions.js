import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export const alertRoots = ['HudHudDev', 'HudHudOfficial'];
export const profilePath = (root, uid) => `${root}/users/users/${uid}`;
export const deviceOwnerPath = id => `notificationDeviceOwners/${id}`;
export const allowedSubscriptionRoles = ['listener', 'station_admin', 'super_admin'];

export function identifier(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/') && value !== '.' && value !== '..';
}

export function validateSubscriptionInput(data) {
  if (!alertRoots.includes(data?.root) || !identifier(data?.stationId) || typeof data?.isActive !== 'boolean' || typeof data?.notificationsEnabled !== 'boolean' || (!data.isActive && data.notificationsEnabled)) {
    throw new HttpsError('invalid-argument', 'Invalid station preference.');
  }
  return data;
}

export async function verifiedUser(request, auth) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const user = await auth.getUser(request.auth.uid);
  if (!user.emailVerified || user.disabled) throw new HttpsError('permission-denied', 'Verify an active account first.');
  return user;
}

export async function verifiedUid(request, auth) {
  const user = await verifiedUser(request, auth);
  return user.uid;
}

export async function prepareActiveSubscriptionProfile(tx, firestore, uid, root, authUser = null) {
  const profileRef = firestore.doc(profilePath(root, uid));
  const profile = await tx.get(profileRef);
  const jobs = await Promise.all(alertRoots.map(r => tx.get(firestore.doc(`${r}/accountDeletionRequests/requests/${uid}`))));
  if (jobs.some(job => job.exists)) {
    throw new HttpsError('failed-precondition', 'Account deletion is in progress.');
  }

  if (profile.exists) {
    if (profile.get('isActive') !== true) {
      throw new HttpsError('failed-precondition', 'An active listener profile is required.');
    }
    const role = profile.get('role');
    if (!allowedSubscriptionRoles.includes(role)) {
      throw new HttpsError('failed-precondition', 'Role is not authorized for subscriptions.');
    }
    return {
      profileRef,
      exists: true,
      role,
      applyWrite: () => {},
    };
  }

  const displayName = authUser?.displayName || 'المستمع';
  const newProfile = {
    displayName,
    username: '',
    avatarUrl: authUser?.photoURL || '',
    isActive: true,
    role: 'listener',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  return {
    profileRef,
    exists: false,
    role: 'listener',
    applyWrite: () => {
      tx.set(profileRef, newProfile);
    },
  };
}

export async function ensureActiveSubscriptionProfile(tx, firestore, uid, root, authUser = null) {
  const plan = await prepareActiveSubscriptionProfile(tx, firestore, uid, root, authUser);
  plan.applyWrite();
  return plan;
}

export async function setSubscription({ firestore, uid, data, authUser = null }) {
  const { root, stationId, isActive, notificationsEnabled } = validateSubscriptionInput(data);
  const collection = firestore.collection(`${profilePath(root, uid)}/subscriptions`);
  const canonical = collection.doc(`station_${stationId}`);
  await firestore.runTransaction(async tx => {
    // 1. ALL READS FIRST
    const profilePlan = await prepareActiveSubscriptionProfile(tx, firestore, uid, root, authUser);
    const station = await tx.get(firestore.doc(`${root}/stations/stations/${stationId}`));
    const saved = await tx.get(canonical);
    const matches = await tx.get(collection.where('targetType', '==', 'station').where('targetId', '==', stationId).limit(101));

    // 2. VALIDATION
    if (isActive && (!station.exists || station.get('isActive') !== true)) {
      throw new HttpsError('not-found', 'Station is unavailable.');
    }
    if (matches.size > 100) throw new HttpsError('resource-exhausted', 'This subscription needs support.');
    if (saved.exists && (saved.get('targetType') !== 'station' || saved.get('targetId') !== stationId)) {
      throw new HttpsError('failed-precondition', 'Subscription identity conflict.');
    }

    // 3. ALL WRITES AFTER READS
    profilePlan.applyWrite();
    const dates = matches.docs.map(doc => doc.get('createdAt')).filter(date => date instanceof Timestamp).sort((a,b) => a.toMillis() - b.toMillis());
    tx.set(canonical, {
      targetType: 'station',
      targetId: stationId,
      isActive,
      notificationsEnabled,
      createdAt: dates[0] ?? FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const doc of matches.docs) if (doc.id !== canonical.id) tx.delete(doc.ref);
  });
  return { updated: true };
}

export function deviceId(token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || /\s/.test(token)) throw new HttpsError('invalid-argument', 'Invalid device registration.');
  return createHash('sha256').update(token).digest('hex');
}

export async function registerDevice({ firestore, uid, data, authUser = null, now = Date.now() }) {
  const { root, token } = data ?? {};
  if (!alertRoots.includes(root)) throw new HttpsError('invalid-argument', 'Unknown environment.');
  const id = deviceId(token);
  await firestore.runTransaction(async tx => {
    // 1. ALL READS FIRST
    const profilePlan = await prepareActiveSubscriptionProfile(tx, firestore, uid, root, authUser);
    const ownerRef = firestore.doc(deviceOwnerPath(id));
    const previous = await tx.get(ownerRef);
    const ownDevices = await tx.get(firestore.collection(`${profilePath(root, uid)}/alertDevices`).limit(21));

    // 2. VALIDATION
    if (ownDevices.size >= 20 && !ownDevices.docs.some(doc => doc.id === id)) {
      throw new HttpsError('resource-exhausted', 'Too many registered devices.');
    }

    // 3. ALL WRITES
    profilePlan.applyWrite();
    if (previous.exists && alertRoots.includes(previous.get('root')) && identifier(previous.get('uid'))) {
      tx.delete(firestore.doc(`${profilePath(previous.get('root'), previous.get('uid'))}/alertDevices/${id}`));
    }
    tx.set(ownerRef, { uid, root, updatedAt: Timestamp.fromMillis(now) });
    tx.set(firestore.doc(`${profilePath(root, uid)}/alertDevices/${id}`), { token, updatedAt: Timestamp.fromMillis(now) });
  });
  return { registered: true };
}
export async function unregisterDevice({ firestore, uid, data }) {
  const id = deviceId(data?.token);
  await firestore.runTransaction(async tx => {
    const ownerRef = firestore.doc(deviceOwnerPath(id));
    const owner = await tx.get(ownerRef);
    if (owner.get('uid') !== uid || !alertRoots.includes(owner.get('root'))) return;
    tx.delete(firestore.doc(`${profilePath(owner.get('root'), uid)}/alertDevices/${id}`));
    tx.delete(ownerRef);
  });
  return { unregistered: true };
}
export async function removeAccountDevices(firestore, uid, root) {
  const devices = await firestore.collection(`${profilePath(root, uid)}/alertDevices`).get();
  for (const doc of devices.docs) await firestore.runTransaction(async tx => {
    const owner = await tx.get(firestore.doc(deviceOwnerPath(doc.id)));
    if (owner.get('uid') === uid && owner.get('root') === root) tx.delete(owner.ref);
    tx.delete(doc.ref);
  });
}

export async function removeDeviceIfCurrent(firestore, device, root, uid) {
  await firestore.runTransaction(async tx => {
    const current = await tx.get(device.ref);
    const owner = await tx.get(firestore.doc(deviceOwnerPath(device.id)));
    if (!current.exists || current.get('updatedAt')?.toMillis() !== device.get('updatedAt')?.toMillis()) return;
    tx.delete(current.ref);
    if (owner.get('uid') === uid && owner.get('root') === root) tx.delete(owner.ref);
  });
}
export async function collectStaleDevices(firestore, now = Date.now()) {
  const owners = await firestore.collection('notificationDeviceOwners').where('updatedAt', '<=', Timestamp.fromMillis(now - 30 * 24 * 3600000)).limit(100).get();
  for (const record of owners.docs) await firestore.runTransaction(async tx => {
    const owner = await tx.get(record.ref);
    if (!owner.exists || owner.get('updatedAt').toMillis() > now - 30 * 24 * 3600000) return;
    const { root, uid } = owner.data();
    if (alertRoots.includes(root) && identifier(uid)) tx.delete(firestore.doc(`${profilePath(root, uid)}/alertDevices/${owner.id}`));
    tx.delete(owner.ref);
  });
}
