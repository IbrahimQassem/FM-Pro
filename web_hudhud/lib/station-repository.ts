import { collection, getDocs } from 'firebase/firestore';
import { getPublicFirestore } from './firebase-client';
import { firestoreRoot } from './firestore-environment';
import { stationFromSnapshot, sortStations, type Station } from './stations';

export async function loadPublicStations(): Promise<Station[]> {
  const firestore = await getPublicFirestore();
  const snapshot = await getDocs(collection(firestore, `${firestoreRoot}/stations/stations`));
  return snapshot.docs.map(stationFromSnapshot)
    .filter((station) => station.isActive && station.name && station.id)
    .sort(sortStations);
}
