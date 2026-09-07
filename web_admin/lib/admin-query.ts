import {
  collection,
  collectionGroup,
  doc,
  documentId,
  orderBy,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { resourceDefinitions, type ResourceKey } from './admin-resources';
import { firestoreRoot } from './firestore-root';

export function resourceQuery(firestore: Firestore, key: ResourceKey) {
  const definition = resourceDefinitions[key];
  if (definition.path)
    return query(collection(firestore, definition.path), orderBy(documentId()));
  return query(
    collectionGroup(firestore, definition.group!),
    where(documentId(), '>=', doc(firestore, firestoreRoot, 'episodes')),
    where(documentId(), '<', doc(firestore, firestoreRoot, 'users\uf8ff')),
    orderBy(documentId()),
  );
}
