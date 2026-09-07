import {
  collection,
  doc,
  getDocsFromServer,
  increment,
  limit,
  query,
  where,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
} from 'firebase/firestore';

const fields = [
  'countryCode',
  'countryNameAr',
  'cityCode',
  'cityNameAr',
] as const;
function failure(message: string): Error {
  const error = new Error(message);
  error.name = 'ContentError';
  return error;
}
export function locationFields(data: Record<string, unknown>) {
  return Object.fromEntries(fields.map((key) => [key, data[key]]));
}

/** Serialize identity changes per root, including legacy locations with random IDs. */
export async function prepareLocationIdentity(
  tx: Transaction,
  reference: DocumentReference,
  next: Record<string, unknown>,
) {
  const [root, group, kind, id, extra] = reference.path.split('/');
  if (
    !['HudHudDev', 'HudHudOfficial'].includes(root) ||
    group !== 'locations' ||
    kind !== 'locations' ||
    !id ||
    extra
  )
    throw failure('مسار المدينة غير صالح.');
  const catalog = doc(reference.firestore, `${root}/locations`);
  await tx.get(catalog);
  const matches = await getDocsFromServer(
    query(
      reference.parent,
      where('countryCode', '==', next.countryCode),
      where('cityCode', '==', next.cityCode),
      limit(2),
    ),
  );
  if (matches.docs.some((item) => item.id !== reference.id))
    throw failure('رمز المدينة مستخدم بالفعل في هذه الدولة. اختر رمزًا آخر.');
  return () =>
    tx.set(catalog, { adminIdentityRevision: increment(1) }, { merge: true });
}

/** Read the location in the transaction before querying its station projections. */
export async function readLocationStations(
  tx: Transaction,
  location: DocumentSnapshot,
  next: Record<string, unknown>,
) {
  const current = location.data();
  if (!current || fields.every((key) => current[key] === next[key])) return [];
  const root = location.ref.path.split('/')[0];
  const result = await getDocsFromServer(
    query(
      collection(location.ref.firestore, `${root}/stations/stations`),
      where('cityCode', '==', current.cityCode),
      where('countryCode', '==', current.countryCode),
      limit(451),
    ),
  );
  if (result.size > 450)
    throw failure(
      'ترتبط المدينة بأكثر من 450 محطة. انقل بعض المحطات إلى مدينة أخرى قبل تعديل بيانات الموقع.',
    );
  const snapshots = await Promise.all(
    result.docs.map((item) => tx.get(item.ref)),
  );
  if (
    snapshots.some(
      (item) =>
        !item.exists() ||
        item.data()?.cityCode !== current.cityCode ||
        item.data()?.countryCode !== current.countryCode,
    )
  )
    throw failure('تغيّرت محطات المدينة أثناء الحفظ. أعد المحاولة.');
  return snapshots.map((item) => item.ref);
}

/** Return a write to run after all transaction reads. Touching the reference
 * makes concurrent station creation retry a location edit's child query.
 */
export async function prepareStationLocation(
  tx: Transaction,
  reference: DocumentReference,
  data: Record<string, unknown>,
) {
  const location = await tx.get(reference);
  if (
    !location.exists() ||
    fields.some((key) => location.data()[key] !== data[key])
  )
    throw failure('تغيّرت بيانات المدينة. أعد اختيار المدينة قبل الحفظ.');
  return () => tx.update(reference, { adminRelationRevision: increment(1) });
}
