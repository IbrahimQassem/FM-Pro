import { collection, getDocsFromCache, getDocsFromServer, query, where, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { getPublicFirestore } from './firebase-client';
import { firestoreRoot } from './firestore-environment';
import { episodeFromSnapshot, programFromSnapshot, validId, type Program, type Episode } from './discovery';
export type StationContent = { programs: Program[]; episodes: Episode[]; offline: boolean };
export async function loadStationContent(stationId: string, cached?: (content: StationContent) => void): Promise<StationContent> {
  if (!validId(stationId)) throw new Error('Unavailable content');
  const db = await getPublicFirestore();
  const queries = ['programs', 'episodes'].map(kind => query(collection(db, `${firestoreRoot}/${kind}/${kind}`), where('stationId', '==', stationId)));
  const map = (snapshots: QuerySnapshot<DocumentData>[], offline: boolean): StationContent => {
    const programs = snapshots[0].docs.map(d => programFromSnapshot(d, stationId)).filter((p): p is Program => p !== null).sort((a,b) => b.priority - a.priority || a.title.localeCompare(b.title, 'ar'));
    const episodes = snapshots[1].docs.map(d => episodeFromSnapshot(d, stationId, programs)).filter((e): e is Episode => e !== null).sort((a,b) => b.broadcastAt - a.broadcastAt || a.title.localeCompare(b.title, 'ar'));
    return { programs, episodes, offline };
  };
  let fallback: StationContent | null = null;
  try { const snapshots = await Promise.all(queries.map(q => getDocsFromCache(q))); if (snapshots.some(s => !s.empty)) { fallback = map(snapshots, true); cached?.(fallback); } } catch { /* A cold cache is expected. */ }
  try { return map(await Promise.all(queries.map(q => getDocsFromServer(q))), false); }
  catch { if (fallback) return fallback; throw new Error('Unavailable content'); }
}
