import { HttpsError } from 'firebase-functions/v2/https';

const roles = new Set(['super_admin', 'station_admin', 'moderator']);
const roleOf = claims => claims?.role || (claims?.admin === true ? 'super_admin' : 'listener');
const denied = () => new HttpsError('permission-denied', 'Administrative statistics are unavailable.');

export async function getAdminUserCount({ request, auth, firestore, now = () => new Date() }) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const data = request.data;
  if (!data || Array.isArray(data) || typeof data !== 'object' ||
      Object.keys(data).length !== 1 || !Object.hasOwn(data, 'root') ||
      !['HudHudDev', 'HudHudOfficial'].includes(data.root)) {
    throw new HttpsError('invalid-argument', 'Select a supported data root.');
  }
  const token = request.auth.token;
  const role = roleOf(token);
  if (token?.admin !== true || !roles.has(role)) throw denied();
  let current;
  try { current = await auth.getUser(request.auth.uid); }
  catch (error) {
    if (error?.code === 'auth/user-not-found' || error?.code === 'auth/user-disabled') throw denied();
    throw new HttpsError('unavailable', 'Administrative statistics are unavailable.');
  }
  if (current.disabled || current.emailVerified !== true || current.customClaims?.admin !== true ||
      roleOf(current.customClaims) !== role) throw denied();
  const snapshot = await firestore.collection(`${data.root}/users/users`).count().get();
  const total = snapshot.data().count;
  if (!Number.isSafeInteger(total) || total < 0) throw new HttpsError('internal', 'Invalid aggregate response.');
  return { root: data.root, total, asOf: now().toISOString() };
}
