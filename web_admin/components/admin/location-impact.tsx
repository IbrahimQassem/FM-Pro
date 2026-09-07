import { useEffect, useState } from 'react';
import {
  collection,
  documentId,
  getCountFromServer,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { firestoreRoot } from '@/lib/firestore-root';

export function LocationImpact({
  firestore,
  countryCode,
  cityCode,
  disabled,
}: {
  firestore: Firestore;
  countryCode: string;
  cityCode: string;
  disabled: boolean;
}) {
  const [records, setRecords] = useState<QueryDocumentSnapshot[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot>();
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const base = query(
      collection(firestore, `${firestoreRoot}/stations/stations`),
      where('countryCode', '==', countryCode),
      where('cityCode', '==', cityCode),
    );
    Promise.all([
      getCountFromServer(base),
      getDocsFromServer(
        query(
          base,
          orderBy(documentId()),
          ...(cursor ? [startAfter(cursor)] : []),
          limit(10),
        ),
      ),
    ])
      .then(([count, page]) => {
        if (!active) return;
        setTotal(count.data().count);
        setRecords((previous) =>
          cursor ? [...previous, ...page.docs] : page.docs,
        );
        setMore(page.size === 10);
        setBusy(false);
      })
      .catch(() => {
        if (active) {
          setError(true);
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [firestore, countryCode, cityCode, cursor, revision]);
  return (
    <section
      className="space-y-3 rounded-2xl border bg-muted/40 p-4"
      aria-label="تأثير تعديل المدينة"
    >
      <h3 className="font-semibold">المحطات المرتبطة بالمدينة الحالية</h3>
      <p className="text-sm leading-7">
        تعطيل المدينة يخفي خيارها من مرشّح المدن. لا يعطّل المحطات المرتبطة بها.
        تغيير الاسم أو الرمز يحدّث بيانات الموقع في المحطات المرتبطة عند الحفظ.
      </p>
      {busy && <output>جارٍ تحميل المحطات المرتبطة…</output>}
      {error && (
        <p role="alert">
          تعذر تأكيد عدد المحطات المرتبطة. أعد التحميل قبل اتخاذ القرار.
        </p>
      )}
      {total !== null && (
        <p className="text-sm">
          إجمالي المحطات المرتبطة: {total.toLocaleString('ar-YE')} · الأسماء
          المحمّلة: {records.length.toLocaleString('ar-YE')}
        </p>
      )}
      {!busy && !error && total === 0 && (
        <p className="text-sm">لا توجد محطات مرتبطة بالرمز الحالي.</p>
      )}
      {records.length > 0 && (
        <ul className="space-y-2 text-sm">
          {records.map((record) => (
            <li key={record.id}>
              {String(record.data().name || record.id)} ·{' '}
              {record.data().isActive === true ? 'نشطة' : 'غير نشطة'}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-12"
          variant="outline"
          disabled={disabled || busy}
          onClick={() => {
            setCursor(undefined);
            setRecords([]);
            setTotal(null);
            setBusy(true);
            setError(false);
            setRevision((v) => v + 1);
          }}
        >
          تحديث التأثير
        </Button>
        {more && (
          <Button
            type="button"
            className="min-h-12"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => {
              setCursor(records.at(-1));
              setBusy(true);
              setError(false);
              setRevision((v) => v + 1);
            }}
          >
            تحميل محطات أخرى
          </Button>
        )}
      </div>
    </section>
  );
}
