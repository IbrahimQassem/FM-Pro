import { getAuth, getIdTokenResult } from 'firebase/auth';
import {
  collection,
  documentId,
  getDocsFromServer,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { FirestoreRoot } from './firestore-environment';

export const stationPrivateFields = Object.freeze([
  'owner', 'address', 'contactPerson', 'contactPhone', 'contactEmail',
  'streamType', 'audioCodec', 'bitrateKbps', 'sampleRateHz',
  'transmitterPower', 'transmitterLocation', 'coverageArea', 'rds',
] as const);
export type StationPrivateField = (typeof stationPrivateFields)[number];
export type StationPrivateState = Readonly<{
  revision: number | null;
  data: Readonly<Partial<Record<StationPrivateField, string>>>;
}>;
export type StationPrivacyOptions = {
  expectedPrivateRevision: number | null;
  deletePrivateFields?: readonly StationPrivateField[];
};
const privateKeys = new Set<string>(stationPrivateFields);
const validRevision = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
function privacyError(message: string): Error {
  const error = new Error(message);
  error.name = 'ContentError';
  return error;
}

export function publicStationData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !privateKeys.has(key)));
}

export function stationPrivacyRequestOptions(
  kind: string,
  content: Record<string, unknown>,
  options?: StationPrivacyOptions,
): Partial<StationPrivacyOptions> {
  const invalid = () => { throw privacyError('Reload station metadata before continuing.'); };
  if (kind !== 'stations') {
    if (options !== undefined) invalid();
    return {};
  }
  if (options === undefined) {
    if (stationPrivateFields.some(key => Object.hasOwn(content, key))) invalid();
    return {};
  }
  if (!options || typeof options !== 'object' || Array.isArray(options) ||
      Object.keys(options).some(key => key !== 'expectedPrivateRevision' && key !== 'deletePrivateFields') ||
      !Object.hasOwn(options, 'expectedPrivateRevision') ||
      (options.expectedPrivateRevision !== null && !validRevision(options.expectedPrivateRevision))) invalid();
  const deletions = options.deletePrivateFields;
  if (deletions !== undefined && (!Array.isArray(deletions) ||
      new Set(deletions).size !== deletions.length ||
      deletions.some(key => !privateKeys.has(key) || Object.hasOwn(content, key)))) invalid();
  return {
    expectedPrivateRevision: options.expectedPrivateRevision,
    ...(deletions !== undefined ? { deletePrivateFields: [...deletions] } : {}),
  };
}

export function parseStationPrivateDocument(data: Record<string, unknown> | undefined): StationPrivateState {
  if (data === undefined) return Object.freeze({ revision: null, data: Object.freeze({}) });
  if (!data || Array.isArray(data) || data.schemaVersion !== 1 || !validRevision(data.revision) ||
      Object.keys(data).some(key => key !== 'schemaVersion' && key !== 'revision' && !privateKeys.has(key))) {
    throw privacyError('Station metadata is invalid. Reload before continuing.');
  }
  const values: Partial<Record<StationPrivateField, string>> = {};
  for (const key of stationPrivateFields) {
    if (!Object.hasOwn(data, key)) continue;
    const value = data[key];
    if (typeof value !== 'string' || (key === 'contactEmail' && value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))) {
      throw privacyError('Station metadata is invalid. Reload before continuing.');
    }
    values[key] = value;
  }
  return Object.freeze({ revision: data.revision, data: Object.freeze(values) });
}

/** Each call is one visible/export page; never scan the private collection. */
export function stationPrivateReadPlan(root: FirestoreRoot, ids: readonly string[], claims: Record<string, unknown>) {
  const superAdmin = claims.role === 'super_admin' ||
    (claims.admin === true && claims.role !== 'station_admin' && claims.role !== 'moderator');
  if (!superAdmin) throw privacyError('Super admin privileges are required for station metadata.');
  if (!['HudHudDev', 'HudHudOfficial'].includes(root) || !Array.isArray(ids) || ids.length > 50 ||
      new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !id || id.trim() !== id ||
        id.length > 128 || id.includes('/') || id === '.' || id === '..')) {
    throw privacyError('Invalid station metadata page.');
  }
  const chunks: string[][] = [];
  for (let offset = 0; offset < ids.length; offset += 30) chunks.push(ids.slice(offset, offset + 30));
  return { path: `${root}/stationPrivate/stations`, chunks };
}

export async function loadStationPrivatePage(
  firestore: Firestore,
  root: FirestoreRoot,
  ids: readonly string[],
): Promise<Readonly<Record<string, StationPrivateState>>> {
  try {
    const auth = getAuth(firestore.app);
    const user = auth.currentUser;
    if (!user) throw privacyError('Sign in before reading station metadata.');
    const { claims } = await getIdTokenResult(user);
    const plan = stationPrivateReadPlan(root, ids, claims);
    const states: Record<string, StationPrivateState> = Object.fromEntries(
      ids.map(id => [id, parseStationPrivateDocument(undefined)]),
    );
    for (const chunk of plan.chunks) {
      const snapshots = await getDocsFromServer(query(
        collection(firestore, plan.path), where(documentId(), 'in', chunk),
      ));
      for (const snapshot of snapshots.docs) states[snapshot.id] = parseStationPrivateDocument(snapshot.data());
    }
    if (auth.currentUser !== user) throw privacyError('The session changed. Reload station metadata.');
    return Object.freeze(states);
  } catch (error) {
    if (error instanceof Error && error.name === 'ContentError') throw error;
    throw privacyError('Station metadata could not be loaded. Check access and reload before continuing.');
  }
}
