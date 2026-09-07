import {
  doc,
  increment,
  runTransaction,
  type Firestore,
  type DocumentReference,
} from 'firebase/firestore';
import type { ResourceKey } from './admin-resources';
import type { FirestoreRoot } from './firestore-environment';
import {
  isContentKind,
  contentPayload,
  editableFingerprint,
} from './content-form.ts';
import { readProgramTransferEpisodes } from './program-transfer.ts';
import {
  locationFields,
  prepareLocationIdentity,
  prepareStationLocation,
  readLocationStations,
} from './location-relations.ts';
import { assertCounterAdjustment } from './relationship-counter.ts';
function contentError(message: string): Error {
  const error = new Error(message);
  error.name = 'ContentError';
  return error;
}

export async function saveWithRelations(
  firestore: Firestore,
  firestoreRoot: FirestoreRoot,
  key: ResourceKey,
  path: string,
  id: string,
  data: Record<string, unknown>,
  previous: {
    reference: DocumentReference;
    data: Record<string, unknown>;
  } | null,
  location?: DocumentReference,
  defaults?: unknown,
) {
  if (
    !['HudHudDev', 'HudHudOfficial'].includes(firestoreRoot) ||
    !isContentKind(key) ||
    path !== `${firestoreRoot}/${key}/${key}` ||
    !id ||
    id.includes('/')
  )
    throw contentError('مسار المحتوى أو بيئة الإدارة غير صالح.');
  if (previous && previous.reference.path !== `${path}/${id}`)
    throw contentError('السجل السابق لا يطابق مسار الحفظ.');
  if (
    location &&
    !location.path.startsWith(`${firestoreRoot}/locations/locations/`)
  )
    throw contentError('مرجع المدينة خارج بيئة الإدارة المحددة.');
  const reference = doc(firestore, path, id);
  await runTransaction(firestore, async (transaction) => {
    const current = await transaction.get(reference);
    if (current.exists() && current.data().adminDeletionToken)
      throw contentError(
        'الحلقة قيد الحذف. أعد تحميل الصفحة أو أعد محاولة الحذف.',
      );
    if (previous && !current.exists())
      throw contentError('حُذف هذا السجل. أعد تحميل الصفحة.');
    const editable = (value: Record<string, unknown>) =>
      editableFingerprint(
        isContentKind(key) ? contentPayload(key, value) : value,
      );
    if (!previous && current.exists()) {
      if (editable(current.data()) === editable(data)) return;
      throw contentError('المعرّف مستخدم بالفعل. أعد فتح النموذج.');
    }
    if (previous && editable(current.data()!) !== editable(previous.data))
      throw contentError('عدّل مستخدم آخر هذا السجل. أعد تحميله قبل الحفظ.');
    const touchLocation =
      key === 'stations' && location
        ? await prepareStationLocation(transaction, location, data)
        : null;
    const locationStations =
      key === 'locations' && previous
        ? await readLocationStations(transaction, current, data)
        : [];
    const reserveLocation =
      key === 'locations'
        ? await prepareLocationIdentity(transaction, reference, data)
        : null;
    const parentKind =
      key === 'programs' ? 'stations' : key === 'episodes' ? 'programs' : null;
    const relation = key === 'programs' ? 'stationId' : 'programId';
    const counter = key === 'programs' ? 'programsCount' : 'episodesCount';
    if (parentKind) {
      const nextId = String(data[relation]);
      const oldId = previous ? String(current.data()![relation]) : null;
      const transferredEpisodes =
        key === 'programs' && oldId && oldId !== nextId
          ? await readProgramTransferEpisodes(transaction, current)
          : [];
      const parent = doc(
        firestore,
        `${firestoreRoot}/${parentKind}/${parentKind}`,
        nextId,
      );
      const parentSnapshot = await transaction.get(parent);
      if (!parentSnapshot.exists())
        throw contentError('السجل المرتبط لم يعد موجودًا.');
      if (
        key === 'episodes' &&
        parentSnapshot.data().stationId !== data.stationId
      )
        throw contentError('تغيّرت محطة البرنامج. أعد اختياره.');
      if (!previous || oldId !== nextId) {
        const oldParent = oldId
          ? doc(
              firestore,
              `${firestoreRoot}/${parentKind}/${parentKind}`,
              oldId,
            )
          : null;
        const oldSnapshot = oldParent ? await transaction.get(oldParent) : null;
        if (oldSnapshot && !oldSnapshot.exists())
          throw contentError(
            'الارتباط السابق غير موجود. راجع البيانات قبل النقل.',
          );
        assertCounterAdjustment(parentSnapshot.get(`stats.${counter}`), 1);
        if (oldSnapshot)
          assertCounterAdjustment(oldSnapshot.get(`stats.${counter}`), -1);
        if (oldParent)
          transaction.update(oldParent, {
            [`stats.${counter}`]: increment(-1),
          });
        transaction.update(parent, { [`stats.${counter}`]: increment(1) });
      }
      for (const episode of transferredEpisodes)
        transaction.update(episode, { stationId: nextId });
    }
    touchLocation?.();
    reserveLocation?.();
    for (const station of locationStations)
      transaction.update(station, locationFields(data));
    transaction.set(
      reference,
      previous || !defaults ? data : { ...data, stats: defaults },
      { merge: previous !== null },
    );
  });
}
