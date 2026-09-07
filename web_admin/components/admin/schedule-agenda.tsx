import { useAdminHash } from '@/lib/use-admin-hash';
import { useEffect, useState } from 'react';
import {
  agendaFilterHash,
  readAgendaFilters,
  type AgendaFilters,
} from '@/lib/agenda-location';
import {
  collection,
  documentId,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { RelationPicker } from './content-editor';
import { Button } from '@/components/ui/button';
import { firestoreRoot } from '@/lib/firestore-root';
import { scheduleClock } from '@/lib/content-form';
import {
  agendaDays,
  agendaSchedule,
  overlappingPrograms,
} from '@/lib/schedule-agenda';

export function ScheduleAgenda({
  firestore,
  onEdit,
}: {
  firestore: Firestore;
  onEdit: () => void;
}) {
  const hash = useAdminHash();
  const filters = readAgendaFilters(hash);
  return (
    <AgendaView
      key={filters.station}
      firestore={firestore}
      onEdit={onEdit}
      filters={filters}
      onFilters={(next) => {
        window.location.hash = agendaFilterHash(next);
      }}
    />
  );
}
function AgendaView({
  firestore,
  onEdit,
  filters,
  onFilters,
}: {
  firestore: Firestore;
  onEdit: () => void;
  filters: AgendaFilters;
  onFilters: (next: AgendaFilters) => void;
}) {
  const { station, day, inactive } = filters;
  const [records, setRecords] = useState<QueryDocumentSnapshot[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot>();
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(Boolean(station));
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!station) return;
    let active = true;
    getDocsFromServer(
      query(
        collection(firestore, `${firestoreRoot}/programs/programs`),
        where('stationId', '==', station),
        orderBy(documentId()),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(100),
      ),
    )
      .then((result) => {
        if (active) {
          setRecords((previous) =>
            cursor ? [...previous, ...result.docs] : result.docs,
          );
          setMore(result.size === 100);
          setBusy(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('تعذر تحميل الجدول. أعد المحاولة.');
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [firestore, station, cursor, revision]);
  const scheduled = records.flatMap((record) => {
    const data = record.data(),
      schedule = agendaSchedule(data.schedule);
    return schedule && (inactive || data.isActive === true)
      ? [
          {
            id: record.id,
            title: String(data.title || record.id),
            active: data.isActive === true,
            schedule,
          },
        ]
      : [];
  });
  const overlaps = overlappingPrograms(scheduled.filter((item) => item.active));
  const invalid = records.filter(
    (record) =>
      record.data().schedule != null && !agendaSchedule(record.data().schedule),
  ).length;
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold">جدول برامج المحطة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الأيام والأوقات حسب فرق التوقيت المحدد لكل برنامج. التداخل تنبيه تحريري
          ولا يمنع الحفظ.
        </p>
      </header>
      <RelationPicker
        firestore={firestore}
        kind="stations"
        selected={station}
        onSelect={(option) => onFilters({ ...filters, station: option.id })}
      />
      <div className="flex flex-wrap items-center gap-3">
        <label>
          اليوم{' '}
          <select
            className="min-h-12 rounded-xl border bg-card px-3"
            value={day}
            onChange={(e) =>
              onFilters({ ...filters, day: Number(e.target.value) })
            }
          >
            <option value={0}>الأسبوع كاملًا</option>
            {agendaDays.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={inactive}
            onChange={(e) =>
              onFilters({ ...filters, inactive: e.target.checked })
            }
          />
          عرض البرامج غير النشطة
        </label>
        <Button className="min-h-12" variant="outline" onClick={onEdit}>
          إدارة البرامج والجداول
        </Button>
        <Button
          className="min-h-12"
          variant="outline"
          disabled={!station || busy}
          onClick={() => {
            setCursor(undefined);
            setRecords([]);
            setError('');
            setBusy(true);
            setRevision((v) => v + 1);
          }}
        >
          تحديث
        </Button>
      </div>
      {!station && <p>اختر محطة لعرض جدولها الأسبوعي.</p>}
      {busy && <output>جارٍ تحميل البرامج…</output>}
      {error && <p role="alert">{error}</p>}
      {station && (
        <p className="text-sm text-muted-foreground">
          تم تحميل {records.length} برنامجًا.{' '}
          {more || busy || error
            ? 'الجدول وفحص التداخل جزئيان حتى تحميل البقية.'
            : 'يشمل الفحص جميع البرامج المحمّلة للمحطة.'}{' '}
          البرامج بلا جدول لا تظهر في الأجندة.
        </p>
      )}
      {invalid > 0 && (
        <p role="alert">
          توجد {invalid} برامج بجدول غير صالح. راجعها في إدارة البرامج.
        </p>
      )}
      {station &&
        !(records.length === 0 && (busy || error)) &&
        agendaDays.map((name, i) => {
          if (day && day !== i + 1) return null;
          const rows = scheduled
            .filter((item) => item.schedule.weekdays.includes(i + 1))
            .sort(
              (a, b) =>
                a.schedule.startMinute - b.schedule.startMinute ||
                a.title.localeCompare(b.title, 'ar'),
            );
          return (
            <section key={name} className="rounded-2xl border bg-card p-5">
              <h3 className="font-bold">{name}</h3>
              {rows.length ? (
                <ul className="mt-3 divide-y">
                  {rows.map((item) => (
                    <li key={item.id} className="space-y-2 py-4">
                      <p className="font-medium">
                        {item.title} {!item.active && '· غير نشط'}
                      </p>
                      <p className="text-sm">
                        <bdi dir="ltr">
                          {scheduleClock(item.schedule.startMinute)} —{' '}
                          {scheduleClock(item.schedule.endMinute)}
                        </bdi>{' '}
                        · فرق UTC: {item.schedule.utcOffsetMinutes} دقيقة
                      </p>
                      {overlaps.has(item.id) && (
                        <p className="text-sm text-destructive">
                          يتداخل مع برنامج نشط في الجدول الأسبوعي؛ راجع الأيام
                          والأوقات.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  لا توجد برامج مجدولة ضمن النتائج الحالية.
                </p>
              )}
            </section>
          );
        })}
      {more && (
        <Button
          className="min-h-12"
          disabled={busy}
          onClick={() => {
            setError('');
            setBusy(true);
            setCursor(records.at(-1));
            setRevision((value) => value + 1);
          }}
        >
          تحميل بقية البرامج
        </Button>
      )}
    </div>
  );
}
