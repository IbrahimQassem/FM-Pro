import {
  getDocsFromServer, limit, query, startAfter, where,
  type DocumentReference, type Firestore, type Query,
} from 'firebase/firestore';
import { resourceDefinitions, type ResourceKey } from './admin-resources.ts';
import { firestoreRoot } from './firestore-root.ts';
import type { FirestoreRoot } from './firestore-environment.ts';
import { resourceQuery } from './admin-query.ts';
import { resourceParentFilter, resourceStatusChoices, matchRecordSearch, isHealthyStream } from './resource-filters.ts';

export type ResourcePageRequestOptions = {
  root?: FirestoreRoot;
  statusField?: string;
  statusMatch?: string | boolean;
  parent?: string;
  reportType?: 'comment' | 'user' | '';
  cursor?: string;
  mode?: 'page' | 'scan' | 'count';
};
export type ResourceRecord = { id: string; path: string; data: Record<string, unknown>; reference: DocumentReference; relationLabel?: string };
export type ResourcePredicate = { term: string; feature: string; role: string; sort: string; evaluationTime: number };
const invalid = () => new Error('Invalid or expired resource query cursor. Restart the request.');
export function resourceQueryIdentity(resource: ResourceKey, options: ResourcePageRequestOptions = {}) {
  const root = options.root ?? firestoreRoot;
  if (!['HudHudDev', 'HudHudOfficial'].includes(root) || !Object.hasOwn(resourceDefinitions, resource)) throw invalid();
  if (options.statusField && !resourceStatusChoices(resource).some(choice =>
    choice.field === options.statusField && choice.match === options.statusMatch)) throw invalid();
  if (!options.statusField && options.statusMatch !== undefined) throw invalid();
  if (options.parent && (!resourceParentFilter(resource) || options.parent.length > 128 ||
      options.parent.includes('/') || Array.from(options.parent).some(character => character.charCodeAt(0) < 32))) throw invalid();
  if (options.reportType && (resource !== 'reports' || !['comment', 'user'].includes(options.reportType))) throw invalid();
  return JSON.stringify([1, root, resource, options.statusField ?? '', options.statusMatch ?? null,
    options.parent ?? '', options.reportType ?? '', 'id_asc']);
}
function validPath(path: string, resource: ResourceKey, options: ResourcePageRequestOptions) {
  const root = options.root ?? firestoreRoot;
  const parts = path.split('/');
  const definition = resourceDefinitions[resource];
  if (!path.startsWith(`${root}/`) || parts.some(part => !part || part === '.' || part === '..') ||
      parts.length % 2 || Array.from(path).some(character => character.charCodeAt(0) < 32) || path.length > 4096) throw invalid();
  if (definition.path) {
    if (parts.length !== 4 || parts.slice(0, -1).join('/') !== definition.path.replace(/^[^/]+/, root)) throw invalid();
  } else if (parts.length < 6 || parts.at(-2) !== definition.group ||
      path < `${root}/episodes` || path >= `${root}/users\uf8ff`) throw invalid();
}
export function resourceCursor(resource: ResourceKey, options: ResourcePageRequestOptions, path: string) {
  const identity = resourceQueryIdentity(resource, options);
  validPath(path, resource, options);
  return JSON.stringify({ version: 1, identity, afterPath: path });
}
export function readResourceCursor(cursor: string, resource: ResourceKey, options: ResourcePageRequestOptions = {}) {
  if (cursor.length > 8192) throw invalid();
  let value;
  try { value = JSON.parse(cursor); } catch { throw invalid(); }
  if (!value || Object.keys(value).sort().join(',') !== 'afterPath,identity,version' ||
      value.version !== 1 || value.identity !== resourceQueryIdentity(resource, options) ||
      typeof value.afterPath !== 'string') throw invalid();
  validPath(value.afterPath, resource, options);
  return value.afterPath as string;
}
export function resourcePageRequest(base: Query, resource: ResourceKey, options: ResourcePageRequestOptions = {}) {
  resourceQueryIdentity(resource, options);
  const { statusField, statusMatch, parent = '', reportType = '', cursor, mode = 'page' } = options;
  if (!['page', 'scan', 'count'].includes(mode)) throw invalid();
  const parentFilter = resourceParentFilter(resource);
  let after;
  if (cursor) {
    if (typeof cursor !== 'string') throw invalid();
    const path = readResourceCursor(cursor, resource, options);
    after = resourceDefinitions[resource].path ? path.split('/').at(-1)! : path;
  }
  if (mode === 'count' && after) throw invalid();
  return query(base,
    ...(statusField ? [where(statusField, '==', statusMatch)] : []),
    ...(reportType ? [where('targetType', '==', reportType)] : []),
    ...(parent && parentFilter ? [where(parentFilter.field, '==', parent)] : []),
    ...(after ? [startAfter(after)] : []),
    ...(mode === 'count' ? [] : [limit(mode === 'scan' ? 200 : 51)]));
}
export function consumeResourcePage<T>(documents: readonly T[]) {
  if (documents.length > 51) throw new Error('Resource page exceeds its read budget.');
  return { documents: documents.slice(0, 50), last: documents.slice(0, 50).at(-1), hasMore: documents.length > 50 };
}
export async function readResourceBatch(firestore: Firestore, resource: ResourceKey, options: ResourcePageRequestOptions = {}) {
  const snapshot = await getDocsFromServer(resourcePageRequest(resourceQuery(firestore, resource, options.root), resource,
    { ...options, mode: 'scan' }));
  const records: ResourceRecord[] = snapshot.docs.map(document => ({
    id: document.id, path: document.ref.path, data: document.data(), reference: document.ref,
  }));
  return { records, rawCount: snapshot.size, exhausted: snapshot.size < 200,
    cursor: snapshot.docs.length ? resourceCursor(resource, options, snapshot.docs.at(-1)!.ref.path) : undefined };
}
export function matchesResourcePredicate(record: Pick<ResourceRecord, 'id' | 'data' | 'relationLabel'>, resource: ResourceKey, predicate: ResourcePredicate) {
  if (!matchRecordSearch(record, predicate.term, resource)) return false;
  const data = record.data;
  if (resource === 'stations') {
    if (predicate.feature === 'healthy') return isHealthyStream(data, predicate.evaluationTime);
    if (predicate.feature === 'live') return data.isLive === true;
    if (predicate.feature === 'featured') return data.isFeatured === true;
    if (predicate.feature === 'verified') return data.isVerified === true;
    if (predicate.feature === 'stopped') return data.healthStatus === 'offline' ||
      (typeof data.consecutiveFailures === 'number' && data.consecutiveFailures >= 3) ||
      (data.isLive === false && Boolean(data.streamUrl));
  }
  if (resource === 'users' && predicate.role !== 'all') {
    const role = data.role;
    return predicate.role === 'listener' ? !role || !['super_admin', 'station_admin', 'moderator'].some(allowed => role === allowed) : role === predicate.role;
  }
  return true;
}
export type ResourceScan<T> = { identity: string; evaluationTime: number; examined: number; matched: number;
  rows: T[]; cursor?: string; exhausted: boolean };
export function advanceResourceScan<T>(state: ResourceScan<T>, identity: string,
  batch: { records: T[]; rawCount: number; cursor?: string; exhausted: boolean }, predicate: (record: T) => boolean): ResourceScan<T> {
  if (state.identity !== identity || state.exhausted || batch.rawCount > 200 || batch.rawCount < 0 ||
      batch.records.length > batch.rawCount || (!batch.exhausted && (!batch.cursor || batch.cursor === state.cursor))) throw invalid();
  const matching = batch.records.filter(predicate);
  return { ...state, examined: state.examined + batch.rawCount, matched: state.matched + matching.length,
    rows: [...state.rows, ...matching].slice(-100), cursor: batch.cursor ?? state.cursor, exhausted: batch.exhausted };
}

export type ResourceSnapshotPage<T> = {
  documents: T[]; cursor?: string; hasMore: boolean; cached: boolean; serverLoaded: boolean;
};
// Cache snapshots may display an initial cached page, but cannot authorize a
// server continuation or replace an already loaded server page.
export function resourceSnapshotPage<T extends { ref: { path: string } }>(
  documents: readonly T[], cached: boolean, resource: ResourceKey,
  options: ResourcePageRequestOptions = {}, previous?: ResourceSnapshotPage<T>,
): ResourceSnapshotPage<T> {
  const page = consumeResourcePage(documents);
  if (cached) return { documents: previous?.serverLoaded ? previous.documents : page.documents,
    cursor: undefined, hasMore: false, cached: true, serverLoaded: previous?.serverLoaded === true };
  return { documents: page.documents,
    cursor: page.last ? resourceCursor(resource, options, page.last.ref.path) : undefined,
    hasMore: page.hasMore, cached, serverLoaded: !cached };
}
export function resourcePageCanAdvance(state: { loading: boolean; hasMore: boolean; cursor?: string; cached: boolean }) {
  return !state.loading && !state.cached && state.hasMore && Boolean(state.cursor);
}
