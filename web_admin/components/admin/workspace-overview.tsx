import { useEffect, useState } from 'react';
import { EditorialSummary } from './editorial-summary';
import {
  getCountFromServer,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import {
  Radio,
  Mic2,
  PlayCircle,
  Flag,
  ArrowUpLeft,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resourceQuery } from '@/lib/admin-query';
import { type ResourceKey } from '@/lib/admin-resources';

const metrics = [
  {
    key: 'stations',
    label: 'محطات الإذاعة',
    hint: 'إدارة الهوية والبث والمدن',
    icon: Radio,
  },
  {
    key: 'programs',
    label: 'البرامج',
    hint: 'المحتوى والجدول الأسبوعي',
    icon: Mic2,
  },
  {
    key: 'episodes',
    label: 'الحلقات',
    hint: 'التسجيلات وحالة النشر',
    icon: PlayCircle,
  },
  {
    key: 'reports',
    label: 'البلاغات المفتوحة',
    hint: 'تحتاج إلى مراجعة وقرار',
    icon: Flag,
  },
] as const;
export function WorkspaceOverview({
  firestore,
  onNavigate,
}: {
  firestore: Firestore;
  onNavigate: (key: ResourceKey | 'coverage') => void;
}) {
  const [counts, setCounts] = useState<
    Partial<Record<ResourceKey, number | null>>
  >({});
  const [checkedAt, setCheckedAt] = useState<
    Partial<Record<ResourceKey, string>>
  >({});
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    for (const metric of metrics)
      getCountFromServer(
        metric.key === 'reports'
          ? query(
              resourceQuery(firestore, metric.key),
              where('status', '==', 'open'),
            )
          : resourceQuery(firestore, metric.key),
      )
        .then((result) => {
          if (!cancelled) {
            setCounts((c) => ({ ...c, [metric.key]: result.data().count }));
            setCheckedAt((current) => ({
              ...current,
              [metric.key]: new Date().toISOString(),
            }));
          }
        })
        .catch(() => {
          if (!cancelled) setCounts((c) => ({ ...c, [metric.key]: null }));
        });
    return () => {
      cancelled = true;
    };
  }, [firestore, revision]);
  return (
    <div className="space-y-8">
      <section className="admin-hero relative overflow-hidden rounded-3xl p-6 text-white md:p-9">
        <span className="text-sm text-white/80">هدهد FM · مساحة العمل</span>
        <h2 className="mt-3 max-w-xl text-3xl font-bold leading-relaxed">
          كل صوت يستحق أن يصل.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-white/80">
          نظّم محتوى الإذاعات، جهّز الحلقات، وراجع تفاعل المجتمع من مكان واحد.
        </p>
        <Button
          className="mt-6 bg-white text-[#451222] hover:bg-white/90"
          onClick={() => onNavigate('stations')}
        >
          إدارة المحطات <ArrowUpLeft />
        </Button>
        <Radio className="pointer-events-none absolute -left-8 bottom-0 size-52 opacity-10" />
      </section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">نظرة على المحتوى</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            إجمالي المحتوى في البيئة المحددة، بما فيه غير النشط؛ البلاغات
            المفتوحة فقط. الأرقام لقطة عند الطلب وليست متابعة مباشرة.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setCounts({});
            setCheckedAt({});
            setRevision((v) => v + 1);
          }}
        >
          <RefreshCw /> تحديث
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ key, label, hint, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className="rounded-2xl border bg-card p-5 text-start transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <ArrowUpLeft className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-5 text-3xl font-bold tabular-nums">
              {counts[key] === undefined
                ? '…'
                : counts[key] === null
                  ? 'غير متاح'
                  : counts[key]?.toLocaleString('ar-YE')}
            </p>
            <p className="mt-2 font-semibold">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            {checkedAt[key] && (
              <p className="mt-3 text-xs text-muted-foreground">
                آخر تحقق:{' '}
                <time dateTime={checkedAt[key]}>
                  {new Date(checkedAt[key]!).toLocaleString('ar-YE')}
                </time>
              </p>
            )}
          </button>
        ))}
      </div>
      <EditorialSummary firestore={firestore} revision={revision} />
      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="font-bold">من الإعداد إلى الاستماع</h3>
          <ol className="mt-5 space-y-4 text-sm text-muted-foreground">
            <li>١. أضف مدينة مرجعية واربط المحطة بها.</li>
            <li>٢. جهّز البرنامج وجدوله الاختياري.</li>
            <li>٣. أضف حلقة وراجع بياناتها قبل النشر.</li>
          </ol>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => onNavigate('locations')}
          >
            المدن والمناطق
          </Button>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="font-bold">تجربة التطبيق</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            اعرف أين يظهر كل محتوى، وما تديره اللوحة وما يتطلب إصدارًا من
            التطبيق.
          </p>
          <Button
            variant="outline"
            className="mt-5"
            onClick={() => onNavigate('coverage')}
          >
            استعراض تغطية الشاشات
          </Button>
        </div>
      </section>
    </div>
  );
}
const coverage = [
  [
    'الرئيسية والبحث',
    'أسماء المحطات والتردد والوصف والصور والترتيب وحالة التفعيل',
    'stations',
  ],
  [
    'فلاتر المدن',
    'مدن اليمن المرجعية وترتيبها وتفعيلها والمحطات المرتبطة بها',
    'locations',
  ],
  [
    'إعلانات الرئيسية',
    'الصورة والعنوان والأولوية ونافذة الظهور؛ التنقل عند النقر غير منفّذ في التطبيق',
    'banners',
  ],
  [
    'تفاصيل المحطة والبث',
    'هوية المحطة وروابط البث؛ حالة البث تحريرية وليست قياسًا لتوفر الصوت',
    'stations',
  ],
  [
    'البرامج والجدول',
    'العناوين والمقدمون وأيام وأوقات البث؛ الجدول اختياري',
    'programs',
  ],
  ['الحلقات والمشغل', 'الصوت والمدة والصور والمواعيد وحالة النشر', 'episodes'],
  [
    'التعليقات',
    'قراءة التعليقات وسياق الحلقة؛ الموافقة على إرشادات المجتمع تتم داخل التطبيق',
    'comments',
  ],
  [
    'البلاغات',
    'بلاغات التعليقات والمستخدمين وقرارات الإشراف؛ الحظر الشخصي يبقى بيد المستمع',
    'reports',
  ],
  [
    'المفضلة',
    'مراجعة سجلات المفضلة وارتباطاتها؛ ليست شاشة مستقلة في التطبيق',
    'favorites',
  ],
  [
    'اشتراكات المحتوى',
    'مراجعة اشتراكات المحطات والبرامج؛ ليست اشتراكات مالية',
    'subscriptions',
  ],
  [
    'إدارة الحساب والملف',
    'ملف المستمع وحالة الإشراف للقراءة فقط؛ لا تعديل لكلمة المرور أو التوثيق',
    'users',
  ],
] as const;
const appOwnedScreens = [
  [
    'البدء وإعداد Firebase',
    'بوابة جاهزية التطبيق ورسائل الإعداد تُدار من الإصدار؛ لا تعرض اللوحة أسرار الاتصال.',
  ],
  [
    'الجولة التعريفية',
    'الشاشات والصور وإعادة عرض الجولة مرتبطة بإصدار التطبيق وليست محتوى بعيدًا.',
  ],
  [
    'الدخول والتسجيل والتوثيق',
    'تسجيل الدخول ومزودو الهوية وإعادة التوثيق واستعادة كلمة المرور مسارات تخص صاحب الحساب.',
  ],
  [
    'الإشعارات',
    'تفضيل الاستقبال ورسائل الجلسة الحديثة داخل التطبيق؛ لا يوجد صندوق دائم أو إرسال من هذه اللوحة.',
  ],
  [
    'إعدادات الحساب',
    'المشاركة والتقييم والتعريف بالتطبيق وروابط المجتمع تُدار من التطبيق والإصدار.',
  ],
  [
    'المشغل وحالات الاتصال',
    'المشغل المصغر والتحكم الخلفي وحالات التحميل والفراغ والخطأ تُختبر داخل التطبيق؛ المعاينة هنا لا تتحكم بجهاز المستمع.',
  ],
] as const;
export function ScreenCoverage({
  onNavigate,
}: {
  onNavigate: (key: ResourceKey) => void;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">تغطية شاشات التطبيق</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          كل شاشة لها مصدر واضح للمحتوى وحدود تشغيل معلنة.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {coverage.map(([title, description, key]) => (
          <button
            key={title}
            onClick={() => onNavigate(key)}
            className="rounded-2xl border bg-card p-5 text-start hover:border-primary"
          >
            <h3 className="font-bold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </button>
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-bold">ميزات تُدار من إصدار التطبيق</h3>
        <p className="mt-3 text-sm leading-8 text-muted-foreground">
          تُراجع هذه التجارب مع إصدار التطبيق. تغيير محتواها يتطلب تنسيقًا مع فريق
          التطبيق والتحقق من النسخة الجديدة.
        </p>
        <dl className="mt-5 grid gap-4 md:grid-cols-2">
          {appOwnedScreens.map(([title, description]) => (
            <div key={title} className="rounded-xl bg-muted p-4">
              <dt className="font-semibold">{title}</dt>
              <dd className="mt-2 text-sm leading-7 text-muted-foreground">
                {description}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary">
          {[
            ['/privacy', 'الخصوصية'],
            ['/terms', 'الشروط'],
            ['/community-guidelines', 'إرشادات المجتمع'],
            ['/account-deletion', 'حذف الحساب'],
          ].map(([url, label]) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
