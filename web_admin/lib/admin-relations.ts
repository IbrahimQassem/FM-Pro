import {
  collection,
  documentId,
  getDocsFromServer,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import type { ResourceKey } from './admin-resources';
import type { FirestoreRoot } from './firestore-environment';

type RelatedRecord = { path: string; data: Record<string, unknown> };
type Target = { kind: 'stations' | 'programs' | 'episodes'; id: string };
export function relationTarget(
  key: ResourceKey,
  data: Record<string, unknown>,
): Target | null {
  const type =
    key === 'programs'
      ? 'station'
      : key === 'episodes'
        ? 'program'
        : key === 'comments' || key === 'reports'
          ? 'episode'
          : key === 'favorites' || key === 'subscriptions'
            ? data.targetType
            : null;
  const id =
    key === 'programs'
      ? data.stationId
      : key === 'episodes'
        ? data.programId
        : key === 'comments' || key === 'reports'
          ? data.episodeId
          : data.targetId;
  if (typeof id !== 'string' || !id || id.includes('/')) return null;
  if (type === 'station') return { kind: 'stations', id };
  if (type === 'program') return { kind: 'programs', id };
  if (type === 'episode') return { kind: 'episodes', id };
  return null;
}

/** Hydrate only the current page, in bounded queries rather than one request per row. */
export async function loadRelationLabels(
  firestore: Firestore,
  root: FirestoreRoot,
  key: ResourceKey,
  records: RelatedRecord[],
): Promise<Map<string, string>> {
  const targets = records.map((record) => ({
    path: record.path,
    target: relationTarget(key, record.data),
  }));
  const names = new Map<string, string>();
  const episodePrograms = new Map<string, string>();
  const requests: Promise<void>[] = [];
  for (const kind of ['stations', 'programs', 'episodes'] as const) {
    const ids = [
      ...new Set(
        targets.flatMap((item) =>
          item.target?.kind === kind ? [item.target.id] : [],
        ),
      ),
    ];
    for (let i = 0; i < ids.length; i += 30)
      requests.push(
        (async () => {
          const snapshot = await getDocsFromServer(
            query(
              collection(firestore, `${root}/${kind}/${kind}`),
              where(documentId(), 'in', ids.slice(i, i + 30)),
            ),
          );
          for (const document of snapshot.docs) {
            if (key === 'reports' && kind === 'episodes') {
              const target = relationTarget('episodes', document.data());
              if (target) episodePrograms.set(document.id, target.id);
            }
            const label =
              document.data()[kind === 'stations' ? 'name' : 'title'];
            if (typeof label === 'string' && label.trim())
              names.set(`${kind}/${document.id}`, label.trim());
          }
        })(),
      );
  }
  await Promise.all(requests);
  if (key === 'reports') {
    const ids = [...new Set(episodePrograms.values())];
    const batches: Promise<void>[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      batches.push(
        (async () => {
          const snapshot = await getDocsFromServer(
            query(
              collection(firestore, `${root}/programs/programs`),
              where(documentId(), 'in', ids.slice(i, i + 30)),
            ),
          );
          for (const document of snapshot.docs) {
            const title = document.data().title;
            if (typeof title === 'string' && title.trim())
              names.set(`programs/${document.id}`, title.trim());
          }
        })(),
      );
    }
    await Promise.all(batches);
  }
  return new Map(
    targets.flatMap(({ path, target }) => {
      if (!target) return [];
      const name =
        names.get(`${target.kind}/${target.id}`) ??
        `ارتباط غير متاح (${target.id})`;
      const programId =
        key === 'reports' ? episodePrograms.get(target.id) : undefined;
      const context = programId
        ? `${name} · البرنامج: ${names.get(`programs/${programId}`) ?? `ارتباط غير متاح (${programId})`}`
        : name;
      const author = records.find((record) => record.path === path)?.data
        .authorName;
      return [
        [
          path,
          key === 'comments' && typeof author === 'string'
            ? `${author} — ${name}`
            : context,
        ],
      ];
    }),
  );
}

export function reportCommentPath(
  root: FirestoreRoot,
  data: Record<string, unknown>,
): string | null {
  const validId = (value: unknown): value is string =>
    typeof value === 'string' &&
    value.length > 0 &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/');
  if (!validId(data.episodeId) || !validId(data.commentId)) return null;
  return `${root}/episodes/episodes/${data.episodeId}/comments/${data.commentId}`;
}
