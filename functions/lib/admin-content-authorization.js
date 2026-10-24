import { HttpsError } from 'firebase-functions/v2/https';
import { validContentId } from './admin-content.js';

export function administrativeActor({ callerUid, callerRole, callerClaims, callerEmail }, { allowModerator = false } = {}) {
  if (!validContentId(callerUid)) throw new HttpsError('unauthenticated', 'Authentication is required.');
  const isSuperAdmin = callerRole === 'super_admin' ||
    (callerClaims?.admin === true && callerRole !== 'station_admin' && callerRole !== 'moderator');
  const scoped = callerRole === 'station_admin' ||
    (allowModerator && callerRole === 'moderator' && callerClaims?.admin === true);
  if ((callerClaims?.role && callerClaims.role !== callerRole) || (!isSuperAdmin && !scoped)) {
    throw new HttpsError('permission-denied', 'Administrative privileges are required.');
  }
  return {
    uid: callerUid, email: typeof callerEmail === 'string' ? callerEmail : '', isSuperAdmin,
    name: [callerClaims?.name, callerClaims?.displayName].find(value => typeof value === 'string' && value.trim()) ||
      (typeof callerEmail === 'string' && callerEmail ? callerEmail.split('@')[0] : callerUid),
    canManageStation: stationId => isSuperAdmin || (scoped && validContentId(stationId) &&
      (callerClaims?.allStations === true || (Array.isArray(callerClaims?.assignedStations) &&
        (callerClaims.assignedStations.includes(stationId) || callerClaims.assignedStations.includes('*'))))),
  };
}
