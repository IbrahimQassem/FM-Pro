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
import { resourceDefinitions, type ResourceKey } from './admin-resources.ts';
import type { FirestoreRoot } from './firestore-environment.ts';
import { firestoreRoot } from './firestore-root.ts';

export function resourceQuery(firestore: Firestore, key: ResourceKey, root: FirestoreRoot = firestoreRoot) {
  if (!['HudHudDev', 'HudHudOfficial'].includes(root)) throw new Error('Invalid resource root.');
  const definition = resourceDefinitions[key];
  if (!definition) throw new Error('Invalid resource.');
  if (definition.path)
    return query(collection(firestore, definition.path.replace(/^[^/]+/, root)), orderBy(documentId()));
  return query(
    collectionGroup(firestore, definition.group!),
    where(documentId(), '>=', doc(firestore, root, 'episodes')),
    where(documentId(), '<', doc(firestore, root, 'users\uf8ff')),
    orderBy(documentId()),
  );
}
