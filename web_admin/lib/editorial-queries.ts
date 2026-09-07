import {
  collection,
  query,
  where,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';
import type { FirestoreRoot } from './firestore-environment';

export function editorialQueries(
  firestore: Firestore,
  root: FirestoreRoot,
  now: Date,
) {
  const base = (kind: string) =>
    collection(firestore, `${root}/${kind}/${kind}`);
  return [
    query(base('episodes'), where('isPublished', '==', false)),
    query(
      base('banners'),
      where('isActive', '==', true),
      where('expiresAt', '>', Timestamp.fromDate(now)),
      where(
        'expiresAt',
        '<=',
        Timestamp.fromMillis(now.getTime() + 7 * 86400000),
      ),
    ),
    query(
      base('programs'),
      where('isActive', '==', true),
      where('schedule', '==', null),
    ),
  ];
}
