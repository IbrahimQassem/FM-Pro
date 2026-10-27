import { collection, doc, documentId, getDocFromServer, getDocsFromCache, getDocsFromServer, limit, orderBy, query, startAfter, Timestamp, Bytes, GeoPoint, DocumentReference, VectorValue, vector, where, type Firestore, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { getPublicFirestore } from './firebase-client';
import { firestoreRoot } from './firestore-environment';
import { episodeFromSnapshot, programFromSnapshot, validId, type Program, type Episode } from './discovery';

const pageSize = 50;
const orders = { programs: 'active:featured-desc:priority-desc:title-asc:id-asc', episodes: 'published:date-desc:priority-desc:id-asc' } as const;
type SpecialNumber = 'NaN' | 'Infinity' | '-Infinity' | '-0';
type SortValue = null | boolean | number | string
  | Readonly<{ kind: 'number'; value: SpecialNumber }>
  | Readonly<{ kind: 'timestamp'; seconds: number; nanoseconds: number }>
  | Readonly<{ kind: 'bytes'; base64: string }>
  | Readonly<{ kind: 'reference'; projectId: string; database: string; path: string }>
  | Readonly<{ kind: 'geo'; latitude: number; longitude: number }>
  | Readonly<{ kind: 'vector'; values: readonly (number | SpecialNumber)[] }>
  | Readonly<{ kind: 'array'; items: readonly SortValue[] }>
  | Readonly<{ kind: 'map'; entries: readonly (readonly [string, SortValue])[] }>;
export type ContentCursor = Readonly<{ version: 1; root: string; resource: 'programs' | 'episodes'; stationId: string; programId: string | null; order: string; after: readonly SortValue[] }>;
export type ContentPage<T> = { items: T[]; nextCursor: ContentCursor | null; offline: boolean; rawReadCount: number; invalidCount: number };
export type StationContent = { programs: Program[]; episodes: Episode[]; offline: boolean; programsPage: ContentPage<Program>; episodesPage: ContentPage<Episode>; selectedProgram: Program | null; selectedEpisode: Episode | null };
export type ContentSelection = { programId?: string | null; episodeId?: string | null };
const unavailable = () => new Error('Unavailable content');
const emptyPage = <T,>(offline = false): ContentPage<T> => ({ items: [], nextCursor: null, offline, rawReadCount: 0, invalidCount: 0 });
// These are raw Firestore ordering values, not application mapper values. A
// malformed application field still has to advance the consumed raw cursor.
// Explicit native tags prevent a plain {seconds,nanoseconds} map becoming time.
const cursorByteLimit = 8 * 1024 * 1024;
type CursorBudget = { nodes: number; text: number };
function budget(value: unknown, usage: CursorBudget, depth: number) {
  if (++usage.nodes > 1048576 || depth > 20) throw unavailable();
  if (typeof value === 'string') usage.text += value.length;
  if (usage.text > cursorByteLimit) throw unavailable();
}
function numberValue(value: number): number | SpecialNumber {
  return Number.isNaN(value) ? 'NaN' : value === Infinity ? 'Infinity' : value === -Infinity ? '-Infinity' : Object.is(value, -0) ? '-0' : value;
}
function decodeNumber(value: number | SpecialNumber): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === 'NaN') return NaN;
  if (value === 'Infinity') return Infinity;
  if (value === '-Infinity') return -Infinity;
  if (value === '-0') return -0;
  throw unavailable();
}
function databaseScope(db: Firestore) {
  // Only public SDK serialization is inspected; settings/app credentials are not
  // copied into cursors. A reference must never silently change database scope.
  const { databaseId } = db.toJSON() as { databaseId?: { projectId?: unknown; database?: unknown } };
  if (typeof databaseId?.projectId !== 'string' || typeof databaseId.database !== 'string') throw unavailable();
  return { projectId: databaseId.projectId, database: databaseId.database };
}
function encodeSort(value: unknown, usage: CursorBudget, depth = 0, ancestors = new Set<object>()): SortValue {
  budget(value, usage, depth);
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') { const encoded = numberValue(value); return typeof encoded === 'number' ? encoded : Object.freeze({ kind: 'number', value: encoded }); }
  if (value instanceof Timestamp) return Object.freeze({ kind: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds });
  if (value instanceof Date) return encodeSort(Timestamp.fromDate(value), usage, depth, ancestors);
  if (value instanceof Bytes) return Object.freeze({ kind: 'bytes', base64: value.toBase64() });
  if (value instanceof DocumentReference) return Object.freeze({ kind: 'reference', ...databaseScope(value.firestore), path: value.path });
  if (value instanceof GeoPoint) return Object.freeze({ kind: 'geo', latitude: value.latitude, longitude: value.longitude });
  if (value instanceof VectorValue) return Object.freeze({ kind: 'vector', values: Object.freeze(value.toArray().map(numberValue)) });
  if (!value || typeof value !== 'object' || ancestors.has(value)) throw unavailable();
  ancestors.add(value);
  let encoded: SortValue;
  if (Array.isArray(value)) encoded = Object.freeze({ kind: 'array', items: Object.freeze(value.map(item => encodeSort(item, usage, depth + 1, ancestors))) });
  else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype.constructor?.name !== 'Object') throw unavailable();
    encoded = Object.freeze({ kind: 'map', entries: Object.freeze(Object.entries(value).map(([key, item]) => { budget(key, usage, depth); return Object.freeze([key, encodeSort(item, usage, depth + 1, ancestors)] as const); })) });
  }
  ancestors.delete(value);
  return encoded;
}
function validateSort(value: unknown, usage: CursorBudget, depth = 0): SortValue {
  budget(value, usage, depth);
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object') throw unavailable();
  const v = value as Record<string, unknown>;
  switch (v.kind) {
    case 'number': if (typeof v.value !== 'string') throw unavailable(); decodeNumber(v.value as SpecialNumber); return Object.freeze({ kind: 'number', value: v.value as SpecialNumber });
    case 'timestamp': {
      if (!Number.isSafeInteger(v.seconds) || !Number.isInteger(v.nanoseconds)) throw unavailable();
      const stamp = new Timestamp(v.seconds as number, v.nanoseconds as number);
      return Object.freeze({ kind: 'timestamp', seconds: stamp.seconds, nanoseconds: stamp.nanoseconds });
    }
    case 'bytes': {
      if (typeof v.base64 !== 'string' || v.base64.length > cursorByteLimit || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v.base64)) throw unavailable();
      budget(v.base64, usage, depth); return Object.freeze({ kind: 'bytes', base64: v.base64 });
    }
    case 'reference': {
      if (typeof v.projectId !== 'string' || typeof v.database !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(v.projectId) || !/^[a-zA-Z0-9_()-]{1,128}$/.test(v.database) || typeof v.path !== 'string' || v.path.length > 6144) throw unavailable();
      const parts = v.path.split('/'); if (parts.length % 2 || parts.some(part => !part || part === '.' || part === '..')) throw unavailable();
      budget(v.path, usage, depth); return Object.freeze({ kind: 'reference', projectId: v.projectId, database: v.database, path: v.path });
    }
    case 'geo': {
      if (typeof v.latitude !== 'number' || typeof v.longitude !== 'number') throw unavailable();
      const point = new GeoPoint(v.latitude, v.longitude); return Object.freeze({ kind: 'geo', latitude: point.latitude, longitude: point.longitude });
    }
    case 'vector': {
      if (!Array.isArray(v.values) || v.values.length > 2048) throw unavailable();
      const values = v.values.map(item => { budget(item, usage, depth + 1); return numberValue(decodeNumber(item)); });
      return Object.freeze({ kind: 'vector', values: Object.freeze(values) });
    }
    case 'array': {
      if (!Array.isArray(v.items) || v.items.length > 1048576) throw unavailable();
      return Object.freeze({ kind: 'array', items: Object.freeze(v.items.map(item => validateSort(item, usage, depth + 1))) });
    }
    case 'map': {
      if (!Array.isArray(v.entries) || v.entries.length > 1048576) throw unavailable();
      const seen = new Set<string>();
      const entries = v.entries.map(entry => {
        if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || seen.has(entry[0])) throw unavailable();
        seen.add(entry[0]); budget(entry[0], usage, depth);
        return Object.freeze([entry[0], validateSort(entry[1], usage, depth + 1)] as const);
      });
      return Object.freeze({ kind: 'map', entries: Object.freeze(entries) });
    }
    default: throw unavailable();
  }
}
function decodeSort(value: SortValue, db: Firestore): unknown {
  if (value === null || typeof value !== 'object') return value;
  switch (value.kind) {
    case 'number': return decodeNumber(value.value);
    case 'timestamp': return new Timestamp(value.seconds, value.nanoseconds);
    case 'bytes': return Bytes.fromBase64String(value.base64);
    case 'reference': {
      const scope = databaseScope(db);
      if (scope.projectId !== value.projectId || scope.database !== value.database) throw unavailable();
      return doc(db, value.path);
    }
    case 'geo': return new GeoPoint(value.latitude, value.longitude);
    case 'vector': return vector(value.values.map(decodeNumber));
    case 'array': return value.items.map(item => decodeSort(item, db));
    case 'map': return Object.fromEntries(value.entries.map(([key, item]) => [key, decodeSort(item, db)]));
  }
}
function checkedCursor(cursor: ContentCursor | null, resource: ContentCursor['resource'], stationId: string, programId: string | null): readonly SortValue[] {
  if (cursor == null) return [];
  if (cursor.version !== 1 || cursor.root !== firestoreRoot || cursor.resource !== resource || cursor.stationId !== stationId || cursor.programId !== programId || cursor.order !== orders[resource] || !Array.isArray(cursor.after) || cursor.after.length !== (resource === 'programs' ? 4 : 3) || !validId(cursor.after.at(-1))) throw unavailable();
  const usage = { nodes: 0, text: 0 };
  const values = cursor.after.map(value => validateSort(value, usage));
  if (JSON.stringify(values).length > cursorByteLimit) throw unavailable();
  return values;
}
async function readPage<T>(resource: ContentCursor['resource'], stationId: string, program: Program | null, cursor: ContentCursor | null, source: 'server' | 'cache', map: (entry: QueryDocumentSnapshot<DocumentData>) => T | null): Promise<ContentPage<T>> {
  if ((source !== 'cache' && source !== 'server') || !validId(stationId) || resource === 'episodes' && (!program || !validId(program.id) || program.stationId !== stationId) || source === 'cache' && cursor) throw unavailable();
  const programId = program?.id ?? null;
  const after = checkedCursor(cursor, resource, stationId, programId);
  const db = await getPublicFirestore();
  const decoded = after.map(value => decodeSort(value, db));
  const constraints = [where('stationId', '==', stationId), where(resource === 'programs' ? 'isActive' : 'isPublished', '==', true)];
  if (programId) constraints.push(where('programId', '==', programId));
  const ordering = resource === 'programs' ? [orderBy('isFeatured', 'desc'), orderBy('priority', 'desc'), orderBy('title', 'asc'), orderBy(documentId(), 'asc')] : [orderBy('broadcastAt', 'desc'), orderBy('priority', 'desc'), orderBy(documentId(), 'asc')];
  const request = query(collection(db, `${firestoreRoot}/${resource}/${resource}`), ...constraints, ...ordering, ...(decoded.length ? [startAfter(...decoded)] : []), limit(pageSize + 1));
  const snapshot = await (source === 'cache' ? getDocsFromCache(request) : getDocsFromServer(request));
  const consumed = snapshot.docs.slice(0, pageSize);
  const items = consumed.map(map).filter((item): item is T => item !== null);
  const last = consumed.at(-1);
  const raw = last?.data();
  const tuple = last && raw ? resource === 'programs' ? [raw.isFeatured, raw.priority, raw.title, last.id] : [raw.broadcastAt, raw.priority, last.id] : [];
  const usage = { nodes: 0, text: 0 };
  const encoded = source === 'server' && snapshot.docs.length > pageSize ? tuple.map(value => encodeSort(value, usage)) : [];
  if (JSON.stringify(encoded).length > cursorByteLimit) throw unavailable();
  const nextCursor: ContentCursor | null = source === 'server' && snapshot.docs.length > pageSize ? Object.freeze({ version: 1, root: firestoreRoot, resource, stationId, programId, order: orders[resource], after: Object.freeze(encoded) }) : null;
  return { items, nextCursor, offline: source === 'cache', rawReadCount: snapshot.docs.length, invalidCount: consumed.length - items.length };
}
export function loadProgramsPage(stationId: string, cursor: ContentCursor | null = null, source: 'server' | 'cache' = 'server') {
  return readPage('programs', stationId, null, cursor, source, entry => programFromSnapshot(entry, stationId));
}
export function loadEpisodesPage(stationId: string, program: Program, cursor: ContentCursor | null = null, source: 'server' | 'cache' = 'server') {
  return readPage('episodes', stationId, program, cursor, source, entry => episodeFromSnapshot(entry, stationId, [program]));
}
/** A distant link is validated directly, never by traversing or downloading pages. */
export async function resolveContentLink(stationId: string, selection: ContentSelection): Promise<{ program: Program | null; episode: Episode | null }> {
  if (!validId(stationId) || selection.programId != null && !validId(selection.programId) || selection.episodeId != null && !validId(selection.episodeId)) throw unavailable();
  const db = await getPublicFirestore();
  const station = await getDocFromServer(doc(db, `${firestoreRoot}/stations/stations/${stationId}`));
  if (!station.exists() || station.data().isActive !== true || station.data().adminDeletionToken) throw unavailable();
  const episode = selection.episodeId ? await getDocFromServer(doc(db, `${firestoreRoot}/episodes/episodes/${selection.episodeId}`)) : null;
  const programId = selection.programId ?? episode?.data()?.programId;
  if (!validId(programId) || episode && (!episode.exists() || episode.data().stationId !== stationId || episode.data().programId !== programId)) return { program: null, episode: null };
  const programDoc = await getDocFromServer(doc(db, `${firestoreRoot}/programs/programs/${programId}`));
  const program = programDoc.exists() ? programFromSnapshot(programDoc, stationId) : null;
  return { program, episode: program && episode?.exists() ? episodeFromSnapshot(episode, stationId, [program]) : null };
}
export async function loadStationContent(stationId: string, cached?: (content: StationContent) => void, selection: ContentSelection = {}): Promise<StationContent> {
  if (!validId(stationId) || selection.programId != null && !validId(selection.programId) || selection.episodeId != null && !validId(selection.episodeId)) throw unavailable();
  const linked = selection.programId || selection.episodeId ? await resolveContentLink(stationId, selection) : null;
  async function load(source: 'cache' | 'server'): Promise<StationContent> {
    const programsPage = await loadProgramsPage(stationId, null, source);
    const selectedProgram = linked?.program ?? programsPage.items[0] ?? null;
    const episodesPage = selectedProgram ? await loadEpisodesPage(stationId, selectedProgram, null, source) : emptyPage<Episode>(source === 'cache');
    return { programs: programsPage.items, episodes: episodesPage.items, offline: source === 'cache', programsPage, episodesPage, selectedProgram, selectedEpisode: linked?.episode ?? null };
  }
  let fallback: StationContent | null = null;
  // A deep-link server validation error is deliberately not replaced with stale cache.
  try { const content = await load('cache'); if (content.programs.length || content.episodes.length) { fallback = content; cached?.(content); } } catch { /* A cold cache is expected. */ }
  try { return await load('server'); } catch { if (fallback) return fallback; throw unavailable(); }
}
