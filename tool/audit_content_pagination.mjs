#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const paginationToolVersion = 'content-pagination-v1';
export const paginationLimits = Object.freeze({ records: 100, readPage: 50, transactionsPerBatch: 25, concurrency: 1 });
export const paginationRoots = Object.freeze(['HudHudDev', 'HudHudOfficial']);
export const paginationResources = Object.freeze(['programs', 'episodes']);
export const paginationFail = code => { const error = new Error(`Content pagination stopped: ${code}.`); error.name = 'ContentPaginationError'; error.code = code; throw error; };
const fail = paginationFail;
export const paginationHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const paginationId = value => typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value && !value.includes('/') && value !== '.' && value !== '..';
export const paginationSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function paginationScope({ projectId, root, resource }) {
  if (typeof projectId !== 'string' || !/^[a-z][a-z0-9-]{4,62}$/.test(projectId) || !paginationRoots.includes(root) || !paginationResources.includes(resource)) fail('invalid-scope');
}
export function paginationValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : { $number: String(value) };
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) fail('unsupported-value');
    return { $date: value.toISOString() };
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return value.map(paginationValue);
  if (!value || typeof value !== 'object') fail('unsupported-value');
  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === null) {
    return { $map: Object.fromEntries(Object.keys(value).sort().map(key => [key, paginationValue(value[key])])) };
  }
  if (value.constructor?.name === 'Timestamp' && Number.isSafeInteger(value.seconds) && Number.isInteger(value.nanoseconds)) {
    return { $timestamp: [value.seconds, value.nanoseconds] };
  }
  if (value.constructor?.name === 'GeoPoint' && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) return { $geo: [value.latitude, value.longitude] };
  if (typeof value.path === 'string' && value.firestore && value.parent) return { $reference: value.path };
  fail('unsupported-value');
}

export function paginationImage(snapshot) {
  if (!snapshot.exists) return { exists: false, version: null, data: null };
  const time = snapshot.updateTime;
  if (!time || !Number.isSafeInteger(time.seconds) || !Number.isInteger(time.nanoseconds)) fail('missing-document-version');
  return { exists: true, version: `${time.seconds}:${time.nanoseconds}`, data: paginationValue(snapshot.data()) };
}
const string = value => typeof value === 'string' && value.trim().length > 0;
const timestamp = value => value && typeof value === 'object' && Array.isArray(value.$timestamp) && value.$timestamp.length === 2 && Number.isSafeInteger(value.$timestamp[0]) && Number.isInteger(value.$timestamp[1]) && value.$timestamp[1] >= 0 && value.$timestamp[1] < 1000000000;
export function paginationPlan(entry, resource) {
  if (!entry.before.source.exists) fail('source-missing');
  const data = entry.before.source.data.$map;
  if (!data || !entry.before.station || (resource === 'episodes' && !entry.before.program)) fail('invalid-manifest');
  const problems = [], fixes = {};
  for (const [key, valid] of [['title', string], ['stationId', paginationId], ['priority', Number.isSafeInteger], ['isFeatured', value => typeof value === 'boolean'],
    [resource === 'programs' ? 'isActive' : 'isPublished', value => typeof value === 'boolean'],
    ...(resource === 'episodes' ? [['programId', paginationId], ['broadcastAt', timestamp]] : [])]) {
    if (!Object.hasOwn(data, key)) {
      if (key === 'priority') fixes.priority = 0;
      else if (key === 'isFeatured') fixes.isFeatured = false;
      else problems.push(`missing-${key}`);
    } else if (!valid(data[key])) problems.push(`type-${key}`);
  }
  if (data.adminDeletionToken) problems.push('deletion-in-progress');
  const station = entry.before.station;
  if (!station.exists) problems.push('missing-station-parent');
  else {
    if (station.data.$map.adminDeletionToken) problems.push('parent-deletion-in-progress');
    if (typeof station.data.$map.isActive !== 'boolean') problems.push('type-station-parent-isActive');
  }
  if (resource === 'episodes') {
    const program = entry.before.program;
    if (!program.exists) problems.push('missing-program-parent');
    else {
      if (program.data.$map.stationId !== data.stationId) problems.push('foreign-program-parent');
      if (program.data.$map.adminDeletionToken) problems.push('parent-deletion-in-progress');
      if (typeof program.data.$map.isActive !== 'boolean') problems.push('type-program-parent-isActive');
    }
  }
  return { problems, fixes, status: problems.length ? 'unresolved' : Object.keys(fixes).length ? 'repairable' : 'ready' };
}
export function paginationPaths(root, resource, id, data) {
  return { source: `${root}/${resource}/${resource}/${id}`,
    station: paginationId(data.stationId) ? `${root}/stations/stations/${data.stationId}` : null,
    program: resource === 'episodes' && paginationId(data.programId) ? `${root}/programs/programs/${data.programId}` : null };
}
const absent = () => ({ exists: false, version: null, data: null });
export async function auditContentPagination({ firestore, projectId, root, resource, cursor = null, limit = paginationLimits.records }) {
  paginationScope({ projectId, root, resource });
  if (firestore.projectId !== projectId) fail('project-mismatch');
  if ((cursor !== null && !paginationId(cursor)) || !Number.isInteger(limit) || limit < 1 || limit > paginationLimits.records) fail('invalid-bound');
  const entries = [];
  let scanned = 0, last = cursor, exhausted = false;
  while (scanned < limit) {
    const count = Math.min(paginationLimits.readPage, limit - scanned);
    let query = firestore.collection(`${root}/${resource}/${resource}`).orderBy(firestore.paginationDocumentId ?? '__name__');
    if (last !== null) query = query.startAfter(last);
    const page = await query.limit(count).get();
    for (const snapshot of page.docs) {
      if (!paginationId(snapshot.id)) fail('invalid-document-id');
      scanned++; last = snapshot.id;
      const data = snapshot.data(), paths = paginationPaths(root, resource, snapshot.id, data);
      const entry = { id: snapshot.id, before: { source: paginationImage(snapshot),
        station: paths.station ? paginationImage(await firestore.doc(paths.station).get()) : absent(),
        program: resource === 'episodes' ? paths.program ? paginationImage(await firestore.doc(paths.program).get()) : absent() : null } };
      entries.push({ ...entry, ...paginationPlan(entry, resource) });
    }
    if (page.size < count) { exhausted = true; break; }
  }
  const manifest = { schemaVersion: 1, toolVersion: paginationToolVersion, projectId, root, resource, cursor,
    nextCursor: exhausted ? null : last, scanned, exhausted, entries };
  manifest.hash = paginationHash(manifest);
  return manifest;
}
export function verifyPaginationManifest(manifest, expectedHash) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) fail('invalid-manifest');
  paginationScope(manifest);
  const { hash, ...body } = manifest;
  if (!/^[a-f0-9]{64}$/.test(hash) || hash !== expectedHash || paginationHash(body) !== hash || manifest.schemaVersion !== 1 || manifest.toolVersion !== paginationToolVersion ||
      !Number.isInteger(manifest.scanned) || manifest.scanned < 0 || manifest.scanned > paginationLimits.records || !Array.isArray(manifest.entries) || manifest.entries.length !== manifest.scanned ||
      new Set(manifest.entries.map(entry => entry.id)).size !== manifest.entries.length || typeof manifest.exhausted !== 'boolean' ||
      (manifest.cursor !== null && !paginationId(manifest.cursor)) || (manifest.nextCursor !== null && !paginationId(manifest.nextCursor))) fail('invalid-manifest');
  for (const entry of manifest.entries) {
    if (!paginationId(entry.id)) fail('invalid-manifest');
    const plan = paginationPlan(entry, manifest.resource);
    if (!paginationSame(plan, { problems: entry.problems, fixes: entry.fixes, status: entry.status })) fail('invalid-manifest');
  }
  return manifest;
}

// Public C03 shapes. Equality filters precede the complete ordering tuple.
export const paginationQueryShapes = Object.freeze([
  { resource: 'programs', equal: ['stationId', 'isActive'], order: [['isFeatured', 'DESCENDING'], ['priority', 'DESCENDING'], ['title', 'ASCENDING'], ['__name__', 'ASCENDING']] },
  { resource: 'episodes', equal: ['stationId', 'isPublished'], order: [['broadcastAt', 'DESCENDING'], ['priority', 'DESCENDING'], ['__name__', 'ASCENDING']] },
  { resource: 'episodes', equal: ['stationId', 'programId', 'isPublished'], order: [['broadcastAt', 'DESCENDING'], ['priority', 'DESCENDING'], ['__name__', 'ASCENDING']] },
]);
// Approved WA/C03 whitelist. Server/global order is ID ASC only; historical
// alternate controls remain explicitly current-page predicates/sorts.
export const adminPaginationSortInventory = Object.freeze({
  global: [['__name__', 'ASCENDING']],
  currentPageOnly: ['oldest', 'name_asc', 'name_desc', 'city_asc', 'priority_asc', 'priority_desc', 'plays_desc', 'subscribers_desc', 'programs_desc'],
  scanAndExport: [['__name__', 'ASCENDING']],
  note: 'newest preserves historical ID order and must not claim chronology; field fallback/Arabic collation are page semantics',
});
export const adminPaginationQueryShapes = Object.freeze([
  ...['locations', 'stations', 'banners', 'users'].flatMap(resource => [[], ['isActive']].map(equal => ({ resource, collectionGroup: resource, queryScope: 'COLLECTION', equal }))),
  { resource: 'notifications', collectionGroup: 'notifications', queryScope: 'COLLECTION', equal: [] },
  ...[[], ['isActive'], ['stationId'], ['stationId', 'isActive']].map(equal => ({ resource: 'programs', collectionGroup: 'programs', queryScope: 'COLLECTION', equal })),
  ...[[], ['isPublished'], ['programId'], ['programId', 'isPublished']].map(equal => ({ resource: 'episodes', collectionGroup: 'episodes', queryScope: 'COLLECTION', equal })),
  ...[[], ['status']].map(equal => ({ resource: 'comments', collectionGroup: 'comments', queryScope: 'COLLECTION_GROUP', equal })),
  ...[[], ['status'], ['targetType'], ['targetType', 'status']].map(equal => ({ resource: 'reports', collectionGroup: 'moderationReports', queryScope: 'COLLECTION_GROUP', equal })),
  { resource: 'favorites', collectionGroup: 'favorites', queryScope: 'COLLECTION_GROUP', equal: [] },
  ...[[], ['isActive']].map(equal => ({ resource: 'subscriptions', collectionGroup: 'subscriptions', queryScope: 'COLLECTION_GROUP', equal })),
].map(shape => ({ ...shape, order: [['__name__', 'ASCENDING']],
  rootBounds: shape.queryScope === 'COLLECTION_GROUP' ? { lower: '{root}/episodes', upperExclusive: '{root}/users\\uf8ff' } : null })));
// The four new group composites ensure the exact filtered/ID-ordered shapes
// without changing automatic collection indexes through field exemptions.
export const paginationRequiredIndexes = Object.freeze([
  ...paginationQueryShapes.map(shape => ({ collectionGroup: shape.resource, queryScope: 'COLLECTION', fields: [
    ...shape.equal.map(fieldPath => ({ fieldPath, order: 'ASCENDING' })), ...shape.order.map(([fieldPath, order]) => ({ fieldPath, order }))] })),
  ...[['comments', 'status'], ['moderationReports', 'status'], ['moderationReports', 'targetType'], ['subscriptions', 'isActive']]
    .map(([collectionGroup, fieldPath]) => ({ collectionGroup, queryScope: 'COLLECTION_GROUP', fields: [{ fieldPath, order: 'ASCENDING' }, { fieldPath: '__name__', order: 'ASCENDING' }] })),
]);
export function parsePaginationOptions(argv) {
  const result = { mode: 'audit', limit: paginationLimits.records, cursor: null }, seen = new Set();
  const fields = new Set(['project', 'root', 'resource', 'cursor', 'limit', 'backup-dir', 'key-file', 'expires-at', 'manifest-hash']);
  for (const argument of argv) {
    if (['--apply', '--restore', '--verify'].includes(argument)) {
      if (result.mode !== 'audit') fail('conflicting-mode'); result.mode = argument.slice(2); continue;
    }
    if (argument === '--dry-run') continue;
    const match = /^--([^=]+)=(.+)$/.exec(argument);
    if (!match || !fields.has(match[1]) || seen.has(match[1])) fail('invalid-option');
    seen.add(match[1]); result[match[1]] = match[1] === 'limit' ? Number(match[2]) : match[2];
  }
  result.projectId = result.project; paginationScope(result);
  if (!Number.isInteger(result.limit) || result.limit < 1 || result.limit > paginationLimits.records || (result.cursor !== null && !paginationId(result.cursor))) fail('invalid-bound');
  if (argv.includes('--dry-run') && result.mode !== 'audit') fail('conflicting-mode');
  return result;
}
export function paginationSummary(manifest) {
  const counts = { scanned: manifest.scanned, ready: 0, repairable: 0, unresolved: 0, exhausted: manifest.exhausted, problems: {} };
  for (const entry of manifest.entries) {
    counts[entry.status]++;
    for (const problem of entry.problems) counts.problems[problem] = (counts.problems[problem] ?? 0) + 1;
  }
  return counts;
}
async function main() {
  const options = parsePaginationOptions(process.argv.slice(2));
  if (options.mode !== 'audit') fail('audit-read-only');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const { Firestore, FieldPath } = require('firebase-admin/firestore');
  const firestore = new Firestore({ projectId: options.projectId }); firestore.paginationDocumentId = FieldPath.documentId();
  console.log(JSON.stringify(paginationSummary(await auditContentPagination({ ...options, firestore }))));
  await firestore.terminate();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(JSON.stringify({ status: 'stopped', reason: error.name === 'ContentPaginationError' ? error.code : 'environment-or-execution-failure' })); process.exitCode = 1; });
}
