import { HttpsError } from 'firebase-functions/v2/https';

export const stationPrivateFields = Object.freeze('owner address contactPerson contactPhone contactEmail streamType audioCodec bitrateKbps sampleRateHz transmitterPower transmitterLocation coverageArea rds'.split(' '));
const keys = new Set(stationPrivateFields);
const invalid = () => { throw new HttpsError('invalid-argument', 'Invalid station privacy payload.'); };
const conflict = () => { throw new HttpsError('failed-precondition', 'Station metadata changed. Reload before continuing.'); };
export const publicStation = value => Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.has(key)));
function privateValues(value) {
  const result = {};
  for (const key of stationPrivateFields) {
    if (!Object.hasOwn(value || {}, key)) continue;
    if (typeof value[key] !== 'string') invalid();
    result[key] = value[key].trim();
    if (key === 'contactEmail' && result[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result[key])) invalid();
  }
  return result;
}
const equal = (a, b) => stationPrivateFields.every(key => Object.hasOwn(a, key) === Object.hasOwn(b, key) && a[key] === b[key]);
export function validateStationPrivacyOptions(kind, data) {
  const hasRevision = Object.hasOwn(data, 'expectedPrivateRevision');
  const hasDeletes = Object.hasOwn(data, 'deletePrivateFields');
  if (kind !== 'stations') {
    if (hasRevision || hasDeletes) invalid();
    return;
  }
  if (hasRevision && data.expectedPrivateRevision !== null &&
      (!Number.isSafeInteger(data.expectedPrivateRevision) || data.expectedPrivateRevision < 1)) invalid();
  if (hasDeletes && (!Array.isArray(data.deletePrivateFields) ||
      new Set(data.deletePrivateFields).size !== data.deletePrivateFields.length ||
      data.deletePrivateFields.some(key => !keys.has(key) || Object.hasOwn(data.content || {}, key)))) invalid();
  if (hasDeletes && data.deletePrivateFields.length && !hasRevision) invalid();
  privateValues(data.content);
}
export function resolveStationPrivacy(existing, privateDocument) {
  const legacy = privateValues(existing);
  if (!privateDocument) return { current: legacy, revision: null, scrub: Object.keys(legacy).length > 0 };
  if (privateDocument.schemaVersion !== 1 || !Number.isSafeInteger(privateDocument.revision) || privateDocument.revision < 1 ||
      Object.keys(privateDocument).some(key => !keys.has(key) && key !== 'schemaVersion' && key !== 'revision')) conflict();
  const current = privateValues(privateDocument);
  if (Object.keys(legacy).some(key => !Object.hasOwn(current, key) || legacy[key] !== current[key])) conflict();
  return { current, revision: privateDocument.revision, scrub: Object.keys(legacy).length > 0 };
}
export function prepareStationPrivacy(existing, privateDocument, data) {
  validateStationPrivacyOptions('stations', data);
  if (!existing && privateDocument) conflict();
  const state = resolveStationPrivacy(existing, privateDocument);
  const desired = { ...state.current, ...privateValues(data.content) };
  for (const key of data.deletePrivateFields || []) delete desired[key];
  const changed = !equal(state.current, desired);
  const needsWrite = changed || (!privateDocument && Object.keys(desired).length > 0);
  const checkPrecondition = () => {
    if ((Object.hasOwn(data, 'expectedPrivateRevision') && data.expectedPrivateRevision !== state.revision) ||
        (existing && changed && !Object.hasOwn(data, 'expectedPrivateRevision'))) conflict();
  };
  if (needsWrite && state.revision === Number.MAX_SAFE_INTEGER) conflict();
  return { ...state, changed, needsWrite, checkPrecondition,
    document: { ...desired, schemaVersion: 1, revision: state.revision === null ? 1 : state.revision + (changed ? 1 : 0) } };
}
export function assertStationPrivateDeletion(existing, privateDocument, data) {
  validateStationPrivacyOptions('stations', data);
  const state = resolveStationPrivacy(existing, privateDocument);
  if ((privateDocument && data.expectedPrivateRevision !== state.revision) ||
      (Object.hasOwn(data, 'expectedPrivateRevision') && data.expectedPrivateRevision !== state.revision)) conflict();
}
