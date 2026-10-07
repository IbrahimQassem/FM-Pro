import { collection, getDocs } from 'firebase/firestore';
import { getPublicFirestore } from './firebase-client';
import { firestoreRoot } from './firestore-environment';
import { publicCities } from './seo';
import type { Station } from './stations';
export async function loadPublicCities(stations: Station[]) {
  const db = await getPublicFirestore();
  const snapshot = await getDocs(collection(db, `${firestoreRoot}/locations/locations`));
  return publicCities(snapshot.docs, stations);
}
