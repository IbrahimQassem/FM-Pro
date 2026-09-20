import { useCallback, useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseServices } from '@/lib/firebase-client';
import { firestoreRoot } from '@/lib/firestore-root';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Advertiser = {
  id: string;
  name: string;
  isActive: boolean;
  revision: number;
};
type Campaign = {
  id?: string;
  revision?: number;
  name: string;
  advertiserId: string;
  status: 'draft' | 'active' | 'paused';
  startAt: number;
  endAt: number;
  priority: number;
  platforms: string[];
  placements: string[];
  agreementReference: string;
  agreementNotes: string;
  creative: {
    kind: 'image' | 'sponsorship';
    title: string;
    body: string;
    imageUrl: string;
    targetUrl: string;
  };
};
type Row = {
  date: string;
  platform: string;
  placement: string;
  impressions?: number;
  clicks?: number;
};
const fresh = (): Campaign => ({
  name: '',
  advertiserId: '',
  status: 'draft',
  startAt: Date.now(),
  endAt: Date.now() + 7 * 86400000,
  priority: 0,
  platforms: ['app', 'web'],
  placements: ['home.sponsor'],
  agreementReference: '',
  agreementNotes: '',
  creative: { kind: 'image', title: '', body: '', imageUrl: '', targetUrl: '' },
});
const dateInput = (value: number) =>
  new Date(value - new Date(value).getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
async function call<T>(data: Record<string, unknown>): Promise<T> {
  const { app } = await getFirebaseServices();
  return (
    await httpsCallable<Record<string, unknown>, T>(
      getFunctions(app),
      'advertisingAdmin',
    )({ version: 1, root: firestoreRoot, ...data })
  ).data;
}

export function AdvertisingWorkspace({ request = call }: { request?: typeof call }) {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [next, setNext] = useState<{
    advertisers: string | null;
    adCampaigns: string | null;
  }>({ advertisers: null, adCampaigns: null });
  const [advertiser, setAdvertiser] = useState<Partial<Advertiser>>({
    name: '',
    isActive: true,
  });
  const [campaign, setCampaign] = useState<Campaign>(fresh);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('');
  const [reportId, setReportId] = useState('');
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[] | null>(null);
  const epoch = useRef(0);
  const alive = useRef(true);
  const load = useCallback(
    async (kind: 'advertisers' | 'adCampaigns', after?: string) => {
      const result = await request<{
        items: (Advertiser | Campaign)[];
        next: string | null;
      }>({ action: 'list', kind, ...(after ? { after } : {}) });
      if (!alive.current) return;
      if (kind === 'advertisers')
        setAdvertisers((old) =>
          after
            ? [...old, ...(result.items as Advertiser[])]
            : (result.items as Advertiser[]),
        );
      else
        setCampaigns((old) =>
          after
            ? [...old, ...(result.items as Campaign[])]
            : (result.items as Campaign[]),
        );
      setNext((old) => ({ ...old, [kind]: result.next }));
    },
    [request],
  );
  async function run(action: () => Promise<void>) {
    const current = ++epoch.current;
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch {
      if (alive.current && current === epoch.current)
        setMessage(
          'تعذّرت العملية. تحقّق من الحقول والصلاحية، وحدّث القائمة قبل إعادة الحفظ عند تعارض التعديلات.',
        );
    } finally {
      if (alive.current && current === epoch.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    void Promise.resolve().then(() => cancelled ? undefined : Promise.all([load('advertisers'), load('adCampaigns')]))
      .catch(() => {
        if (!cancelled)
          setMessage(
            'تعذّر تحميل الحملات. أعد المحاولة بعد التحقق من الاتصال والصلاحيات.',
          );
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
      alive.current = false;
    };
  }, [load]);
  const field = (
    key: 'name' | 'agreementReference' | 'agreementNotes',
    label: string,
    max: number,
    required = false,
  ) => (
    <label htmlFor={`campaign-${key}`} className="grid gap-2">
      {label}
      <Input
        id={`campaign-${key}`}
        value={campaign[key]}
        maxLength={max}
        required={required}
        onChange={(e) => setCampaign({ ...campaign, [key]: e.target.value })}
      />
    </label>
  );
  const selectClass =
    'min-h-11 rounded-lg border bg-background px-3 text-foreground';
  const total = (key: 'impressions' | 'clicks') =>
    rows?.reduce((sum, row) => sum + (row[key] || 0), 0) ?? 0;
  function exportCsv() {
    if (!rows) return;
    const quote = (value: string | number) =>
      `"${String(value).replaceAll('"', '""')}"`;
    const csv = [
      'date_utc,platform,placement,impressions,clicks',
      ...rows.map((r) =>
        [r.date, r.platform, r.placement, r.impressions || 0, r.clicks || 0]
          .map(quote)
          .join(','),
      ),
    ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${reportId}-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="grid gap-6" dir="rtl">
      <header>
        <h2 className="text-2xl font-bold">الشراكات والحملات</h2>
        <p className="mt-2 text-muted-foreground">
          رعاية هادئة في الرئيسية للتطبيق والويب. بيانات الاتفاق خاصة بالإدارة.
        </p>
      </header>
      {message && (
        <p role="alert" className="rounded-xl border p-4">
          {message}
        </p>
      )}
      <Button
        disabled={busy}
        variant="outline"
        onClick={() =>
          void run(async () => {
            await Promise.all([load('advertisers'), load('adCampaigns')]);
          })
        }
      >
        تحديث القوائم
      </Button>
      <section className="rounded-2xl border p-5">
        <h3 className="mb-4 text-xl font-bold">المعلنون</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await request({
                action: 'saveAdvertiser',
                ...(advertiser.id
                  ? { id: advertiser.id, revision: advertiser.revision }
                  : {}),
                value: { name: advertiser.name, isActive: advertiser.isActive },
              });
              if (!alive.current) return;
              setAdvertiser({ name: '', isActive: true });
              await load('advertisers');
              setMessage('تم حفظ المعلن.');
            });
          }}
        >
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="advertiser-name" className="grid gap-2">
              اسم المؤسسة
              <Input
                id="advertiser-name"
                required
                maxLength={120}
                value={advertiser.name}
                onChange={(e) =>
                  setAdvertiser({ ...advertiser, name: e.target.value })
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={advertiser.isActive}
                onChange={(e) =>
                  setAdvertiser({ ...advertiser, isActive: e.target.checked })
                }
              />
              المعلن مفعّل
            </label>
            <Button type="submit">حفظ المعلن</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAdvertiser({ name: '', isActive: true })}
            >
              معلن جديد
            </Button>
          </fieldset>
        </form>
        <ul className="mt-4 grid gap-2">
          {advertisers.map((item) => (
            <li key={item.id}>
              <Button
                disabled={busy}
                variant="ghost"
                onClick={() => setAdvertiser(item)}
              >
                {item.name} — {item.isActive ? 'مفعّل' : 'متوقف'}
              </Button>
            </li>
          ))}
        </ul>
        {next.advertisers && (
          <Button
            disabled={busy}
            onClick={() =>
              void run(() => load('advertisers', next.advertisers!))
            }
          >
            المزيد من المعلنين
          </Button>
        )}
      </section>
      <section className="rounded-2xl border p-5">
        <h3 className="mb-4 text-xl font-bold">
          {campaign.id ? 'تعديل الحملة' : 'حملة جديدة'}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await request({
                action: 'saveCampaign',
                ...(campaign.id
                  ? { id: campaign.id, revision: campaign.revision }
                  : {}),
                value: campaign,
              });
              if (!alive.current) return;
              setCampaign(fresh());
              await load('adCampaigns');
              setRows(null);
              setMessage(
                'تم حفظ الحملة. قد يستغرق اختفاء إعلان معروض قبل الإيقاف دقيقة واحدة.',
              );
            });
          }}
        >
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            {field('name', 'اسم الحملة الداخلي', 120, true)}
            <label className="grid gap-2">
              المعلن
              <select
                className={selectClass}
                required
                value={campaign.advertiserId}
                onChange={(e) =>
                  setCampaign({ ...campaign, advertiserId: e.target.value })
                }
              >
                <option value="">اختر المعلن</option>
                {advertisers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.isActive ? '' : ' (متوقف)'}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              الحالة
              <select
                className={selectClass}
                value={campaign.status}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    status: e.target.value as Campaign['status'],
                  })
                }
              >
                <option value="draft">مسودة</option>
                <option value="active">مفعّلة حسب الجدول</option>
                <option value="paused">متوقفة</option>
              </select>
            </label>
            <label htmlFor="campaign-priority" className="grid gap-2">
              الأولوية (الأعلى أولاً)
              <Input
                id="campaign-priority"
                type="number"
                min={0}
                max={1000}
                required
                value={campaign.priority}
                onChange={(e) =>
                  setCampaign({ ...campaign, priority: Number(e.target.value) })
                }
              />
            </label>
            <label htmlFor="campaign-start" className="grid gap-2">
              البداية (توقيت جهازك)
              <Input
                id="campaign-start"
                type="datetime-local"
                required
                value={dateInput(campaign.startAt)}
                onChange={(e) => {
                  if (e.target.value)
                    setCampaign({
                      ...campaign,
                      startAt: new Date(e.target.value).getTime(),
                    });
                }}
              />
            </label>
            <label htmlFor="campaign-end" className="grid gap-2">
              النهاية (توقيت جهازك)
              <Input
                id="campaign-end"
                type="datetime-local"
                required
                value={dateInput(campaign.endAt)}
                onChange={(e) => {
                  if (e.target.value)
                    setCampaign({
                      ...campaign,
                      endAt: new Date(e.target.value).getTime(),
                    });
                }}
              />
            </label>
            <div className="flex gap-4">
              {[
                ['app', 'التطبيق'],
                ['web', 'الويب'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={campaign.platforms.includes(key)}
                    onChange={(e) =>
                      setCampaign({
                        ...campaign,
                        platforms: e.target.checked
                          ? [...campaign.platforms, key]
                          : campaign.platforms.filter((p) => p !== key),
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <p>الموضع: رعاية الصفحة الرئيسية</p>
            <label className="grid gap-2">
              الشكل
              <select
                className={selectClass}
                value={campaign.creative.kind}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    creative: {
                      ...campaign.creative,
                      kind: e.target.value as 'image' | 'sponsorship',
                    },
                  })
                }
              >
                <option value="image">صورة</option>
                <option value="sponsorship">رعاية نصية</option>
              </select>
            </label>
            {(['title', 'body', 'imageUrl', 'targetUrl'] as const)
              .filter(
                (key) =>
                  key !== 'imageUrl' || campaign.creative.kind === 'image',
              )
              .map((key) => (
                <label key={key} className="grid gap-2">
                  {
                    {
                      title: 'العنوان الظاهر',
                      body: 'الوصف',
                      imageUrl: 'رابط الصورة HTTPS',
                      targetUrl: 'رابط الوجهة HTTPS (اختياري)',
                    }[key]
                  }
                  <Input
                    type={key.endsWith('Url') ? 'url' : 'text'}
                    required={key === 'title' || key === 'imageUrl'}
                    maxLength={
                      key === 'title' ? 100 : key === 'body' ? 240 : 2048
                    }
                    value={campaign.creative[key]}
                    onChange={(e) =>
                      setCampaign({
                        ...campaign,
                        creative: {
                          ...campaign.creative,
                          [key]: e.target.value,
                        },
                      })
                    }
                  />
                </label>
              ))}
            {field('agreementReference', 'مرجع الاتفاق التجاري (خاص)', 120)}
            {field(
              'agreementNotes',
              'ملاحظات الاتفاق دون بيانات شخصية (خاص)',
              1000,
            )}
            <Button type="submit">حفظ الحملة</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCampaign(fresh())}
            >
              حملة جديدة
            </Button>
          </fieldset>
        </form>
        <ul className="mt-5 grid gap-2">
          {campaigns.map((item) => (
            <li key={item.id}>
              <Button
                disabled={busy}
                variant="ghost"
                onClick={() => setCampaign(item)}
              >
                {item.name} —{' '}
                {
                  {
                    active: 'مفعّلة حسب الجدول',
                    draft: 'مسودة',
                    paused: 'متوقفة',
                  }[item.status]
                }
              </Button>
            </li>
          ))}
        </ul>
        {next.adCampaigns && (
          <Button
            disabled={busy}
            onClick={() =>
              void run(() => load('adCampaigns', next.adCampaigns!))
            }
          >
            المزيد من الحملات
          </Button>
        )}
      </section>
      <section className="rounded-2xl border p-5">
        <h3 className="text-xl font-bold">تقرير الحملة</h3>
        <p className="my-3 text-muted-foreground">
          قياسات مرسلة من العملاء وليست مدققة للفوترة. الأيام بتوقيت UTC، حتى 93
          يوماً. النقرات تمثل التفاعل، ولا تمثل مستخدمين فريدين.
        </p>
        <form
          className="grid gap-4 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              setRows(null);
              const result = await request<{ rows: Row[] }>({
                action: 'report',
                campaignId: reportId,
                from,
                to,
              });
              if (alive.current) setRows(result.rows);
            });
          }}
        >
          <label className="grid gap-2">
            الحملة
            <select
              className={selectClass}
              disabled={busy}
              required
              value={reportId}
              onChange={(e) => {
                setReportId(e.target.value);
                setRows(null);
              }}
            >
              <option value="">اختر حملة</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="report-from" className="grid gap-2">
            من
            <Input
              id="report-from"
              disabled={busy}
              required
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setRows(null);
              }}
            />
          </label>
          <label htmlFor="report-to" className="grid gap-2">
            إلى
            <Input
              id="report-to"
              disabled={busy}
              required
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setRows(null);
              }}
            />
          </label>
          <Button disabled={busy} type="submit">
            عرض التقرير
          </Button>
        </form>
        {rows && (
          <div className="mt-4 grid gap-4">
            <p>
              الظهور: {total('impressions')} · النقرات: {total('clicks')}
            </p>
            <Button variant="outline" onClick={exportCsv}>
              تصدير CSV للمعلن
            </Button>
            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <caption className="sr-only">أداء الحملة اليومي</caption>
                <thead>
                  <tr>
                    {['اليوم UTC', 'المنصة', 'الموضع', 'الظهور', 'النقرات'].map(
                      (h) => (
                        <th className="p-2 text-start" key={h}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.date}-${r.platform}-${r.placement}`}>
                      {[
                        r.date,
                        r.platform,
                        r.placement,
                        r.impressions || 0,
                        r.clicks || 0,
                      ].map((v, i) => (
                        <td className="p-2" key={i}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <p>لا توجد أحداث في الفترة المحددة.</p>}
            </div>
          </div>
        )}
      </section>
      {busy && <output>جارٍ تنفيذ العملية…</output>}
    </div>
  );
}
