import { useEffect, useState } from 'react';
import { getCountFromServer, type Firestore } from 'firebase/firestore';
import { editorialQueries } from '@/lib/editorial-queries';
import { firestoreRoot } from '@/lib/firestore-root';

export function EditorialSummary({
  firestore,
  revision,
}: {
  firestore: Firestore;
  revision: number;
}) {
  const [result, setResult] = useState<{
    revision: number;
    counts: (number | null)[];
    checkedAt: string;
  }>();
  useEffect(() => {
    let active = true;
    const now = new Date();
    const requests = editorialQueries(firestore, firestoreRoot, now);
    void Promise.allSettled(
      requests.map((request) => getCountFromServer(request)),
    ).then((results) => {
      if (active)
        setResult({
          revision,
          counts: results.map((item) =>
            item.status === 'fulfilled' ? item.value.data().count : null,
          ),
          checkedAt: now.toISOString(),
        });
    });
    return () => {
      active = false;
    };
  }, [firestore, revision]);
  const current = result?.revision === revision ? result : undefined;
  return (
    <section aria-labelledby="editorial-summary-title" className="space-y-4">
      <div>
        <h2 id="editorial-summary-title" className="text-lg font-bold">
          المتابعة التحريرية
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          لقطة عند التحديث؛ لا تنشر الحلقات أو تجدول البرامج تلقائيًا.
        </p>
        {current && (
          <p className="mt-1 text-xs text-muted-foreground">
            بداية فترة التحقق:{' '}
            <time dateTime={current.checkedAt}>
              {new Date(current.checkedAt).toLocaleString('ar-YE')}
            </time>
          </p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: 'حلقات مسودة',
            description: 'راجع بيانات الحلقات قبل نشرها.',
            href: '#episodes?status=false',
          },
          {
            title: 'إعلانات تنتهي خلال ٧ أيام',
            description:
              'إعلانات مفعّلة لها انتهاء خلال الأسبوع القادم، بما فيها التي لم تبدأ بعد.',
            href: '#banners?status=true',
          },
          {
            title: 'برامج دون جدول',
            description:
              'برامج مفعّلة محفوظة بجدول فارغ؛ الجدول اختياري ولا يمنع ظهور البرنامج.',
            href: '#programs?status=true',
          },
        ].map((item, index) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-2xl border bg-card p-5 hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <p className="text-2xl font-bold">
              {!current
                ? '…'
                : current.counts[index] === null
                  ? 'غير متاح'
                  : current.counts[index]?.toLocaleString('ar-YE')}
            </p>
            <h3 className="mt-2 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.description}
            </p>
            <p className="mt-3 text-sm text-primary">مراجعة المحتوى ←</p>
          </a>
        ))}
      </div>
    </section>
  );
}
